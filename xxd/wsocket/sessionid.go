package wsocket

import "xxd/util"

// GetSessionIDs fetches sessionIDs from client with userID.
func GetSessionIDs(serverName string, userID int64) []string {
	var sessionIDs []string
	for _, plat := range util.Plats {
		clients, ok := WSHub.clients[serverName][plat][userID]
		if ok {
			for _, client := range clients {
				sessionIDs = append(sessionIDs, client.SessionID)
			}
		}
	}
	return sessionIDs
}
