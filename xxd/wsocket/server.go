/**
 * The server file of wsocket current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     wsocket
 * @link        https://www.xuanim.com
 */
package wsocket

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
	"xxd/api"
	"xxd/service/im"
	"xxd/service/user"
	"xxd/util"
)

const webSocket = "/ws"

var WSHub *Hub

func InitWs() {
	WSHub = newHub()
	go WSHub.run()

	addr := util.Config.Ip + ":" + util.Config.ChatPort
	util.Log("info", util.GetLang("[InitWs]", " ", "WebSocket start", ", ", "listen addr", ": %s %s"), addr, webSocket)

	// If ports are the same, reuse common serve mux.
	if util.Config.ChatPort == util.Config.CommonPort {
		go listenOnMux()
	} else {
		go listenStandalone(addr)
	}

	go startSync()
}

func listenOnMux() {
	util.WaitGroupWait(util.CommonServeMuxWaitGroupID)
	util.Log("info", util.GetLang("[InitWs]", "Registering WebSocket handler on", ": %s"), webSocket)
	serveMux, err := util.ServeMuxGet(util.CommonServeMuxID)
	if err != nil {
		util.Log("error", util.GetLang("[InitWs]", "Failed to get ServeMux", ": %s"), err)
		return
	}
	serveMux.HandleFunc(webSocket, handleWs)
	util.Log("info", util.GetLang("[InitWs]", "Registered WebSocket handler on", ": %s"), webSocket)
}

func listenStandalone(addr string) {
	http.HandleFunc(webSocket, handleWs)

	if util.Config.IsHttps != "1" {
		err := http.ListenAndServe(addr, nil)
		if err != nil {
			util.Log("error", util.GetLang("[InitWs]", " ", "WebSocket ", "server listen error", ": %s"), err)
			util.Exit(util.GetLang("[InitWs]", " E_PORT_UNAVAILABLE: WS ", "server is unable to listen on port", " "), util.Config.ChatPort, util.GetLang("\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_PORT_UNAVAILABLE ", "for troubleshooting hints", "."))
		}
	} else {
		crt, key, certErr := util.CreateSignedCertKey()
		if certErr != nil {
			util.Log("error", util.GetLang("[InitWs]", " WSS SSL ", "config err", ": %s"), certErr)
			util.Exit(util.GetLang("WSS SSL ", "create file err"))
		}
		cert, err := tls.LoadX509KeyPair(crt, key)
		if err != nil {
			util.Log("error", util.GetLang("[InitWs]", " WSS SSL ", "config err", ": %s"), err)
			util.Exit(util.GetLang("WSS SSL ", "create file err"))
		}
		cfg := util.SecureServerTLSConfig()
		cfg.Certificates = []tls.Certificate{cert}
		listener, err := net.Listen("tcp", addr)
		if err != nil {
			util.Log("error", util.GetLang("[InitWs]", " WSS ", "server listen error", ": %s"), err)
			util.Exit(util.GetLang("[InitWs]", " E_PORT_UNAVAILABLE: ", "WSS ", "server is unable to listen on port", " "), util.Config.ChatPort, util.GetLang("\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_PORT_UNAVAILABLE ", "for troubleshooting hints", "."))
		}
		defer listener.Close()
		err = http.Serve(tls.NewListener(listener, cfg), nil)
		if err != nil {
			util.Log("error", util.GetLang("[InitWs]", " WSS webSocket ", "server listen error", ": %s"), err)
			util.Exit(util.GetLang("[InitWs]", " E_PORT_UNAVAILABLE: ", "WSS ", "server is unable to listen on port", " "), util.Config.ChatPort, util.GetLang("\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_PORT_UNAVAILABLE ", "for troubleshooting hints", "."))
		}
	}
}

func handleWs(w http.ResponseWriter, r *http.Request) {
	serveWs(WSHub, w, r)
}

func startSync() {
	go func() {
		pollingInterval := time.Duration(util.Config.PollingInterval) * time.Second
		syncTicker := time.NewTicker(pollingInterval)

		defer func() {
			syncTicker.Stop()
		}()

		for util.Run {
			select {
			case <-syncTicker.C:
				apiSync()
			}
		}
	}()
}

func apiSync() {
	imService := im.NewImService()
	for language := range util.Languages {
		for serverName := range util.Config.RanzhiServer {
			messages, err := imService.ReportAndGetNotify(serverName, language)
			if err == nil && messages != nil {
				WSHub.clientsMutex.Lock()
				for userID, message := range messages {
					for _, plat := range util.Plats {
						if clients, ok := WSHub.clients[serverName][plat][userID]; ok {
							for _, client := range clients {
								client.send <- message
							}
						}
					}
				}
				WSHub.clientsMutex.Unlock()
			}
			// 直接调用用户服务的GetKickList方法，避免HTTP调用
			userService := user.NewUserService()
			kickedUsers, err := userService.GetKickList(serverName)
			if err == nil && kickedUsers != nil {
				if kickedUsers.KickedChangePwd != nil && len(kickedUsers.KickedChangePwd) > 0 {
					WSHub.multicast <- SendMsg{serverName: serverName, usersID: kickedUsers.KickedChangePwd, message: api.PasswordChanged()}
				}
				if kickedUsers.KickedDeleted != nil && len(kickedUsers.KickedDeleted) > 0 {
					WSHub.multicast <- SendMsg{serverName: serverName, usersID: kickedUsers.KickedDeleted, message: api.UserDeleted()}
				}
				if kickedUsers.KickedForbided != nil && len(kickedUsers.KickedForbided) > 0 {
					WSHub.multicast <- SendMsg{serverName: serverName, usersID: kickedUsers.KickedForbided, message: api.UserForbided()}
				}
			}
			memberUpdates, err := imService.SyncUsers(serverName, language)
			if err == nil && memberUpdates != nil {
				for memberID, memberData := range memberUpdates {
					if util.Config.EnableClientAES == 1 {
						message, _ := api.AesEncrypt(memberData, util.Token)
						X2cSend(serverName, []int64{}, message, &Client{userID: memberID, hub: WSHub}, "userupdate", true)
					} else {
						X2cSend(serverName, []int64{}, memberData, &Client{userID: memberID, hub: WSHub}, "userupdate", true)
					}
				}
			}
			// 使用新的用户服务进行部门同步
			deptUpdate, err := userService.SyncDepts(serverName, language)
			if err == nil && deptUpdate != "" {
				message := []byte(deptUpdate)
				if util.Config.EnableClientAES == 1 {
					message, _ := api.AesEncrypt([]byte(message), util.Token)
					X2cSend(serverName, []int64{}, message, &Client{hub: WSHub}, "", true)
				} else {
					X2cSend(serverName, []int64{}, message, &Client{hub: WSHub}, "", true)
				}
			}
		}
	}
}
