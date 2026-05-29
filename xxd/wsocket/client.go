/**
 * The client file of wsocket current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     wsocket
 * @link        https://www.xuanim.com
 */
package wsocket

import (
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"xxd/api"
	"xxd/service"
	"xxd/service/user"
	"xxd/util"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 20 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 204800
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:    204800,
	WriteBufferSize:   204800,
	EnableCompression: util.Config.EnableCompression == 1,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub          *Hub
	conn         *websocket.Conn // The websocket connection.
	send         chan []byte     // Buffered channel of outbound messages.
	serverName   string          // User server
	userID       int64           // Send to user id
	repeatLogin  bool
	cVer         string // client version
	lang         string
	device       string
	SessionID    string
	subscription map[string][]int64 // Various user subscriptions
	id           int64              // Unique ID (actually timestamp) of client in clients map (mainly for zentaoweb).

	readable   bool      // Whether the read pump is working on this client.
	writable   bool      // Whether the write pump is working on this client.
	logoutOnce sync.Once // Ensure logout logic is executed only once
}

type ClientRegister struct {
	client    *Client
	retClient chan *Client
	device    string
}

// send message struct
type SendMsg struct {
	serverName string // send ranzhi server name
	subType    string // subscribe type, multicast to all subscribers instead of users if set.
	fromUser   int64  // needed if subType is set.
	usersID    []int64
	message    []byte
}

// DataProcessResult is the result of data processing.
type DataProcessResult struct {
	err         error
	isLoggedOut bool
}

// 解析数据.
func dataProcessing(message []byte, client *Client, chanel chan DataProcessResult) {
	parseData, err := api.ParseClientRequest(message, util.Token)
	if err != nil {
		chanel <- DataProcessResult{err: err, isLoggedOut: false}
		return
	}

	err, isLogout := switchMethod(parseData, client)
	chanel <- DataProcessResult{err: err, isLoggedOut: isLogout}
}

// 根据不同的消息体选择对应的处理方法
func switchMethod(parseData api.XxbResponse, client *Client) (error, bool) {
	util.LogDetail(util.GetLang("[switchMethod]", " ", "API Method", ": ")+string(parseData.Method), util.ColorBgGreen)
	switch string(parseData.Method) {
	case "userlogin":
		if err := chatLogin(parseData, client); err != nil {
			return err, false
		}

	case "chattyping":
		if err := chatTyping(parseData, client); err != nil {
			return err, false
		}

	case "datatransfer":
		if err := handleDataTransfer(parseData, client); err != nil {
			return err, false
		}

	case "userlogout": // user normally logout, not disconnect
		client.hub.unregister <- client
		client.conn.Close()
		chatLogout(client.userID, client, true)
		return nil, true

	case "ping":
		if err := handlePing(parseData, client); err != nil {
			return err, false
		}

	case "usersubscribe": // subscribe userupdate responses
		if err := userSubscribe(parseData, client); err != nil {
			return err, false
		}

	default:
		err := transitData(parseData, client)
		if err != nil {
			util.Log("error", util.GetLang("Transit data error", ": %s"), err)
		}
	}

	return nil, false
}

func handlePing(parseData api.XxbResponse, client *Client) error {
	request, err := decodePingRequest(parseData.JSON)
	if err != nil {
		return err
	}

	message, err := buildClientProtocolMessage(parseData, pingResponse{
		Method: "ping",
		Result: api.ResultSuccess,
		RID:    request.RID,
	})
	if err != nil {
		return err
	}

	return X2cSend(client.serverName, []int64{client.userID}, message, client, "", true)
}

func chatTyping(parseData api.XxbResponse, client *Client) error {
	request, err := decodeChatTypingRequest(parseData.JSON)
	if err != nil {
		return err
	}

	message, err := buildClientProtocolMessage(parseData, chatTypingResponse{
		Module: "im",
		Method: "chattyping",
		Result: api.ResultSuccess,
		Data: chatTypingResponseData{
			CGID:   request.CGID,
			Typing: request.Typing,
			UserID: request.UserID,
		},
	})
	if err != nil {
		return err
	}

	return X2cSend(client.serverName, []int64{request.TargetUserID}, message, client, "", true)
}

func handleDataTransfer(parseData api.XxbResponse, client *Client) error {
	request, err := decodeDataTransferRequest(parseData.JSON)
	if err != nil {
		return err
	}

	message, err := buildClientProtocolMessage(parseData, dataTransferResponse{
		Module: "im",
		Method: "datatransfer",
		Result: api.ResultSuccess,
		Data: dataTransferResponseData{
			CGID:   request.CGID,
			Data:   request.Data,
			UserID: request.UserID,
		},
	})
	if err != nil {
		return err
	}

	return X2cSend(client.serverName, []int64{request.TargetUserID}, message, client, "", true)
}

func userSubscribe(parseData api.XxbResponse, client *Client) error {
	request, err := decodeUserSubscribeRequest(parseData.JSON)
	if err != nil {
		return err
	}

	switch request.SubscribeType {
	case "userupdate":
		subs := client.subscription
		if subs == nil {
			subs = map[string][]int64{}
		}
		subs["userlogin"] = util.Int64SliceUnique(append(subs["userlogin"], request.Objects...))
		subs["userlogout"] = util.Int64SliceUnique(append(subs["userlogout"], request.Objects...))
		subs["userupdate"] = util.Int64SliceUnique(append(subs["userupdate"], request.Objects...))
		client.hub.subscribesMutex.Lock()
		client.hub.subscribes[client.serverName]["userlogin"] = true
		client.hub.subscribes[client.serverName]["userlogout"] = true
		client.hub.subscribes[client.serverName]["userupdate"] = true
		client.hub.subscribesMutex.Unlock()
		client.subscription = subs

		message, err := buildClientProtocolMessage(parseData, userSubscribeResponse{
			RID:           request.RID,
			Method:        "usersubscribe",
			Module:        "im",
			SubscribeType: request.SubscribeType,
			Result:        api.ResultSuccess,
			Message:       "",
		})
		if err != nil {
			return err
		}

		return X2cSend(client.serverName, []int64{client.userID}, message, client, "", true)
	default:
		break
	}
	return nil
}

// 用户登录
func chatLogin(parseData api.XxbResponse, client *Client) error {
	client.serverName = string(parseData.Server)
	if client.serverName == "" {
		client.serverName = util.Config.DefaultServer
	}

	//判断最大在线用户数
	if util.Config.MaxOnlineUser > 0 {
		client.hub.clientsMutex.Lock()
		for _, plat := range util.Plats {
			onlineUser := len(client.hub.clients[client.serverName][plat])
			if int64(onlineUser) >= util.Config.MaxOnlineUser {
				client.send <- api.BlockLogin()
				client.hub.clientsMutex.Unlock()
				return util.Errorf(util.GetLang("Exceeded the maximum limit"), ".")
			}
		}
		client.hub.clientsMutex.Unlock()
	}

	// 获取客户端IP
	clientIP := client.conn.RemoteAddr().String()
	// 切掉clientIP的端口号
	clientIP = strings.Split(clientIP, ":")[0]

	json, xxbResponse, err := api.ParseParams(parseData)
	if err != nil {
		return util.Errorf("%s", util.GetLang("chat login error")+" "+err.Error())
	}

	var retMessages []api.XxbResponse
	loginService := user.NewLoginService()
	params, err := util.AnyToAnySlice(json["params"])
	if err != nil {
		return err
	}
	retMessages, err = loginService.LoginService(params, xxbResponse, clientIP)

	if err != nil {
		// 登录失败返回错误信息
		client.send <- parseData.JSON
		return util.Errorf("%s", util.GetLang("chat login error")+" "+err.Error())
	}

	client.userID = retMessages[0].UserID
	client.device = string(retMessages[0].Device)

	//当前用户语言
	client.lang = string(retMessages[0].Lang)
	if _, ok := util.Languages[client.lang]; !ok {
		util.Languages[client.lang] = client.lang
	}

	if len(retMessages) > 2 {
		util.LogDetail(util.GetLang("[transitData]", " ", "plural json data"))
	}

	for _, response := range retMessages {
		if util.Config.EnableClientAES == 1 {
			cipher, _ := api.AesEncrypt(response.JSON, util.Token)
			client.send <- cipher
		} else {
			client.send <- response.JSON
		}

		method := string(response.Method)
		result := string(response.Result)
		// 向其他用户广播登陆成功的状态
		if method == "userlogin" && result == "success" {
			if util.Config.EnableClientAES == 1 {
				cipher, _ := api.AesEncrypt(response.JSON, util.Token)
				client.hub.multicast <- SendMsg{serverName: client.serverName, subType: "userlogin", fromUser: response.UserID, message: cipher}
			} else {
				client.hub.multicast <- SendMsg{serverName: client.serverName, subType: "userlogin", fromUser: response.UserID, message: response.JSON}
			}
		}
	}

	// 生成并存储文件会员
	client.SessionID = ""
	sessionData, sessionID, err := api.UserFileSessionID(client.serverName, client.userID, client.lang)
	if err != nil {
		util.Log("error", util.GetLang("Chat user create file session error", ": %s"), err)
		// 返回给客户端登录失败的错误信息
		return err
	}
	client.SessionID = sessionID

	client.send <- sessionData

	cRegister := &ClientRegister{client: client, retClient: make(chan *Client), device: client.device}

	// 以上成功后把socket加入到管理
	client.hub.register <- cRegister
	if retClient := <-cRegister.retClient; retClient.repeatLogin {
		//客户端收到信息后需要关闭socket连接，否则连接不会断开
		retClient.send <- api.RepeatLogin()
		return nil
	}

	return nil
}

// 会话退出
func chatLogout(userID int64, client *Client, normal bool) error {
	if client.userID != userID {
		return util.Errorf("%s", util.GetLang("user id error", "."))
	}
	if client.repeatLogin {
		return nil
	}

	var err error
	client.logoutOnce.Do(func() {
		client.hub.unregister <- client
		//判断是否全部退出，否则不需要通知其它用户当前用户退出了.
		allOut := true
		client.hub.clientsMutex.Lock()
		for _, plat := range util.Plats {
			if _, ok := client.hub.clients[client.serverName][plat][userID]; ok {
				allOut = false
			}
		}
		client.hub.clientsMutex.Unlock()

		if allOut {
			var retMessages []api.XxbResponse
			loginOutService := user.NewLogOutService()
			// 获取客户端IP
			clientIP := client.conn.RemoteAddr().String()
			// 切掉clientIP的端口号
			clientIP = strings.Split(clientIP, ":")[0]
			retMessages, err = loginOutService.UserLoginOutService(client.userID, normal, clientIP, client.device, client.cVer)
			if err != nil {
				return
			}

			if len(retMessages) > 1 {
				util.LogDetail(util.GetLang("[chatLogout]", " ", "plural json data"))
			}

			// 循环发送所有消息，参考 transitData 的处理方式
			for _, response := range retMessages {
				var subType string

				// check if there are any subscriptions of this method.
				client.hub.subscribesMutex.Lock()
				if client.hub.subscribes[client.serverName][string(response.Method)] {
					subType = string(response.Method)
				}
				client.hub.subscribesMutex.Unlock()

				if util.Config.EnableClientAES == 1 {
					message, _ := api.AesEncrypt(response.JSON, util.Token)
					X2cSend(client.serverName, response.Users, message, client, subType, true)
				} else {
					X2cSend(client.serverName, response.Users, response.JSON, client, subType, true)
				}
			}
		}
	})

	return err
}

// 交换数据
func transitData(parseData api.XxbResponse, client *Client) error {
	// 获取客户端IP
	clientIP := client.conn.RemoteAddr().String()
	// 切掉clientIP的端口号
	clientIP = strings.Split(clientIP, ":")[0]

	var err error
	var retMessages []api.XxbResponse
	parseData.Lang = []byte(client.lang)
	parseData.Device = []byte(client.device)
	parseData.Ip = clientIP
	retMessages, err = service.RoleService(parseData, client.userID)
	// if err != nil && err.Error() == "noefactoring" {
	// 	retMessages, err = api.TransitData(parseData.JSON, client.serverName, clientIP)
	// }

	if err != nil {
		// 与然之服务器交互失败后，生成error并返回到客户端
		errMsg, retErr := api.RetErrorMsg("0", err.Error(), string(parseData.RID))
		if retErr != nil {
			return retErr
		}

		client.send <- errMsg
		return err
	}

	if len(retMessages) > 2 {
		util.LogDetail(util.GetLang("[transitData]", " ", "plural json data"))
	}

	for _, response := range retMessages {
		var subType string

		// check if there are any subscriptions of this method.
		client.hub.subscribesMutex.Lock()
		if client.hub.subscribes[client.serverName][string(response.Method)] {
			subType = string(response.Method)
		}
		client.hub.subscribesMutex.Unlock()

		if util.Config.EnableClientAES == 1 {
			message, _ := api.AesEncrypt(response.JSON, util.Token)
			X2cSend(client.serverName, response.Users, message, client, subType, true)
		} else {
			X2cSend(client.serverName, response.Users, response.JSON, client, subType, true)
		}
	}

	return nil
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	var isLoggedOut bool
	var processResultChannel = make(chan DataProcessResult)

	defer func() {
		if !isLoggedOut {
			c.hub.unregister <- c
			c.conn.Close()
			chatLogout(c.userID, c, false) // user disconnect, not logout
		}

		c.readable = false
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	util.LogDetail("[readPump] readPump pumps messages from the websocket connection to the hub.")

	go func() {
		for util.Run && c.writable {
			processResult := <-processResultChannel

			//返回user id 、登录响应的数据、ok
			var dataProcessErr error
			dataProcessErr, isLoggedOut = processResult.err, processResult.isLoggedOut
			if dataProcessErr == nil {
				continue
			}

			util.Log("info", "Client ip: %s", c.conn.RemoteAddr())
			util.Log("error", "Is unexpected close error: %v", dataProcessErr)
			c.writable = false
			break
		}
	}()

	for util.Run && c.writable {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway) {
				util.Log("error", "Is unexpected close error: %v", err)
			}

			util.Log("info", "read pump info: %v", err)
			processResultChannel <- DataProcessResult{err: err, isLoggedOut: false}
			break
		}
		if message == nil {
			continue
		}

		go dataProcessing(message, c, processResultChannel)
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()

		c.writable = false
	}()
	util.LogDetail("[writePump] writePump pumps messages from the hub to the websocket connection.")
	for util.Run && c.readable {
		select {
		case message := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))

			if err := c.conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
				go sendFail(message, c)
				util.Log("error", "write message error %s", err)
				return
			}

			n := len(c.send)
			for i := 0; i < n; i++ {
				if err := c.conn.WriteMessage(websocket.BinaryMessage, <-c.send); err != nil {
					util.Log("error", "write message error %s", err)
					return
				}
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
				util.Log("error", "write ping message error: %s", err)
				return
			}
		}
	}
}

func sendFail(message []byte, c *Client) {
	decryptData, err := api.AesDecrypt(message, util.Token)
	if err != nil {
		util.Log("error", util.GetLang("[sendFail]", " ", "Decrypt client message error"))
		return
	}

	// check if the message's method is messagesend
	if !strings.Contains(string(message), "messagesendResponse") {
		return
	}

	mgidRegex := regexp.MustCompile(`\w{8}-(?:\w{4}-){3}\w{12}`)
	mgid := mgidRegex.FindString(string(decryptData))

	util.DBInsertSendfail(c.serverName, c.userID, mgid)
}

// serveWs handles websocket requests from the peer.
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// Delete origin header @see https://www.iphpt.com/detail/86/
	r.Header.Del("Origin")

	//将xxd版本信息通过header返回给客户端
	header := http.Header{"User-Agent": {"easysoft/xuan.im"}, "xxd-version": {util.Version}}

	conn, err := upgrader.Upgrade(w, r, header)
	if err != nil {
		util.Log("error", util.GetLang("[serveWs] ", "upgrades the HTTP server connection to the WebSocket protocol", ": %s"), err)
		return
	}

	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), repeatLogin: false, cVer: r.Header.Get("version"), readable: true, writable: true}
	util.LogDetail(util.GetLang("[serveWs]", " ", "Create WebSocket conn"))

	util.Log("info", util.GetLang("[serveWs]", " ", "Client ip", ": %s"), conn.RemoteAddr())

	go client.writePump()
	go client.readPump()
}
