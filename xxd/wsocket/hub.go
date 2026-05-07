/**
 * The hub file of websocket current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     wsocket
 * @link        https://www.xuanim.com
 */
package wsocket

import (
	"sync"
	"xxd/util"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	clientsMutex sync.Mutex
	clients      map[string]map[string]map[int64]map[int64]*Client // Registered clients. map[backend][plat][clientID][timestamp]*Client

	// Inbound messages from the clients.
	multicast chan SendMsg
	broadcast chan SendMsg

	register   chan *ClientRegister // Register requests from the clients.
	unregister chan *Client         // Unregister requests from clients.

	subscribesMutex sync.Mutex
	subscribes      map[string]map[string]bool // subscribe types, map[backend][method]bool
}

func newHub() *Hub {
	hub := &Hub{
		multicast:  make(chan SendMsg),
		broadcast:  make(chan SendMsg),
		register:   make(chan *ClientRegister),
		unregister: make(chan *Client),
		clients:    make(map[string]map[string]map[int64]map[int64]*Client),
		subscribes: make(map[string]map[string]bool),
	}

	for ranzhiName := range util.Config.RanzhiServer {
		hub.clients[ranzhiName] = map[string]map[int64]map[int64]*Client{}
		for _, plat := range util.Plats {
			hub.clients[ranzhiName][plat] = map[int64]map[int64]*Client{}
		}
		hub.subscribes[ranzhiName] = map[string]bool{}
	}

	return hub
}

func (h *Hub) Broadcast(serverName string, message []byte) {
	h.broadcast <- SendMsg{serverName: serverName, message: message}
}

func (h *Hub) run() {
	for util.Run {
		select {
		case cRegister := <-h.register:

			// 根据传入的client对指定服务器的userid进行socket注册
			h.clientsMutex.Lock()
			if _, ok := h.clients[cRegister.client.serverName][cRegister.device]; !ok {
				cRegister.retClient <- cRegister.client
				h.clientsMutex.Unlock()
				continue
			}

			// 判断用户是否已经存在
			if clients, ok := h.clients[cRegister.client.serverName][cRegister.device][cRegister.client.userID]; ok {
				// 仅为非 zentaoweb 客户端判断重复登录,返回旧的 client
				if cRegister.device != "zentaoweb" {
					var key int64
					for key = range clients {
						break
					}
					client := clients[key]
					client.repeatLogin = true
					cRegister.retClient <- client

					//用新的客户端覆盖旧的客户端
					cRegister.client.id = key
					h.clients[cRegister.client.serverName][cRegister.device][cRegister.client.userID][key] = cRegister.client
					h.clientsMutex.Unlock()
					continue
				} else {
					// 如果用户已经存在，但是类型为 zentaoweb，则直接注册，不踢出上一个
					cRegister.client.id = util.GetUnixTime()
					cRegister.retClient <- cRegister.client
					h.clients[cRegister.client.serverName][cRegister.device][cRegister.client.userID][cRegister.client.id] = cRegister.client
					h.clientsMutex.Unlock()
					continue
				}
			}

			cRegister.client.id = util.GetUnixTime()
			h.clients[cRegister.client.serverName][cRegister.device][cRegister.client.userID] = make(map[int64]*Client)
			h.clients[cRegister.client.serverName][cRegister.device][cRegister.client.userID][cRegister.client.id] = cRegister.client
			h.clientsMutex.Unlock()
			cRegister.retClient <- cRegister.client

		case client := <-h.unregister:

			if client.repeatLogin {
				continue
			}

			// 收到失败的socket就进行注销
			h.clientsMutex.Lock()
			if clients, ok := h.clients[client.serverName][client.device][client.userID]; ok {
				if client.device != "zentaoweb" || len(clients) == 1 { // 非 zentaoweb 端、仅有一个 zentaoweb 端此时可以被清理
					delete(h.clients[client.serverName][client.device], client.userID)
				} else {
					// 是不止一个 zentaoweb 端时，仅移除断开的一个
					delete(h.clients[client.serverName][client.device][client.userID], client.id)
				}
			}
			h.clientsMutex.Unlock()

		case sendMsg := <-h.multicast:
			h.clientsMutex.Lock()
			// send message to subscribers only if subType is set.
			if sendMsg.subType != "" {
				for _, plat := range util.Plats {
					for userID := range h.clients[sendMsg.serverName][plat] {
						clients := h.clients[sendMsg.serverName][plat][userID]
						if userID == sendMsg.fromUser {
							for _, client := range clients {
								select {
								case client.send <- sendMsg.message:
								default:
									delete(h.clients[client.serverName][plat], client.userID)
								}
							}
						}
						for _, client := range clients {
							if client.subscription != nil {
								subscribed, ok := client.subscription[sendMsg.subType]
								if !ok {
									continue
								}
								mark := make(map[int64]bool)
								for _, v := range subscribed {
									mark[v] = true
								}
								if mark[sendMsg.fromUser] {
									select {
									case client.send <- sendMsg.message:
									default:
										delete(h.clients[client.serverName][plat], client.userID)
									}
								}
							}
						}
					}
				}
			} else {
				// 对指定的用户群发送消息
				for _, userID := range sendMsg.usersID {
					for _, plat := range util.Plats {
						clients, ok := h.clients[sendMsg.serverName][plat][userID]
						if !ok {
							continue
						}

						for _, client := range clients {
							select {
							case client.send <- sendMsg.message:
							default:
								delete(h.clients[client.serverName][plat], client.userID)
							}
						}
					}
				}
			}
			h.clientsMutex.Unlock()

		case sendMsg := <-h.broadcast:
			h.clientsMutex.Lock()
			// 对所有的在线用户发送消息
			for _, plat := range util.Plats {
				for userID := range h.clients[sendMsg.serverName][plat] {
					clients := h.clients[sendMsg.serverName][plat][userID]
					for _, client := range clients {
						select {
						case client.send <- sendMsg.message:
						default:
							delete(h.clients[client.serverName][plat], client.userID)
						}
					}
				}
			}
			h.clientsMutex.Unlock()
		} // run select
	} // run for
}
