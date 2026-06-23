package wsocket

import (
	"fmt"
	"xxd/util"
)

// Send the message from XXD to XXC.
// If the user is empty, broadcast messages.
func X2cSend(serverName string, sendUsers []int64, message []byte, client *Client, subType string, nodeSend bool) error {
	if len(sendUsers) == 0 && subType == "" {
		client.hub.broadcast <- SendMsg{serverName: serverName, message: message}
		return nil
	}

	util.LogDetail(fmt.Sprintf("X2cSend: %v, %v, %v, %v", serverName, sendUsers, subType, client.userID))

	client.hub.multicast <- SendMsg{serverName: serverName, usersID: sendUsers, message: message, subType: subType, fromUser: client.userID}
	return nil
}

func X2cSendToOtherSessions(serverName string, userID int64, message []byte, client *Client, nodeSend bool) error {
	client.hub.multicast <- SendMsg{serverName: serverName, usersID: []int64{userID}, message: message, excludeSessionID: client.SessionID}
	return nil
}
