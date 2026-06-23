package message

import (
	"fmt"
	"strconv"
	"strings"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type SendRequest struct {
	Messages []model.XxbImMessage `json:"messages"`
}

func (t *SendRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("send invalid params")
	}
	messages, err := util.AnyToAnySlice(data[0])
	if err != nil {
		return err
	}
	for _, message := range messages {
		messageStruct := model.ParseMessage(message)
		t.Messages = append(t.Messages, messageStruct)
	}
	return nil
}

func (c *MessageService) Send(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var sendRequest SendRequest
	if err := sendRequest.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	firstMessage := sendRequest.Messages[0]
	if firstMessage.User != strconv.FormatInt(userId, 10) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.message.notSameUser"))
	}

	members := strings.Split(firstMessage.CgId, "&")
	memberIds := make([]int64, 0)
	for _, m := range members {
		memberId, err := strconv.ParseInt(m, 10, 64)
		if err != nil {
			continue
		}
		memberIds = append(memberIds, memberId)
	}

	isOne2OneChat := len(members) == 2

	// TODO 这块逻辑稍后实现,机器人对话相关
	// $responsesFromBot = array();
	// if($isOne2OneChat && in_array('xuanbot', $members)) // TODO: check for chat type later.
	// {
	// 	$members = array_filter($members, static function ($member) {
	// 		return is_numeric($member);
	// 	});

	// 	$repliesFromBot = $this->im->botProcessMessage($message, $userID);
	// 	$messagesFromBot  = $repliesFromBot->messages;
	// 	if(version_compare($version, '7.0', 'lt') && $device != 'mobile')
	// 	{
	// 		foreach($messagesFromBot as $message)
	// 		{
	// 			$message->user = -1;
	// 		}
	// 	}
	// 	$responsesFromBot = $repliesFromBot->responses;
	// 	$messages = array_merge($messages, $messagesFromBot);
	// }
	// if isOne2OneChat && model.IsXuanBot(firstMessage.CgId) {
	// repliesFromBot, err := firstMessage.botProcessMessage(c.db, int(userId))
	// }

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.user.notExist"))
	}

	chatInfo, err := imChat.GetChatByGid(c.db, firstMessage.CgId)
	isNewChat := false
	if err != nil && isOne2OneChat {
		isNewChat = true
		newChat, _, err := imChat.Create(c.db, firstMessage.CgId, "", "one2one", memberIds, 0, false, userId)
		if err != nil {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.createdFailed"))
		}
		chatInfo = newChat
	}

	if chatInfo.IsArchived() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.archivedNotOperation"))
	}

	isCommitter := chatInfo.IsCommitter(c.db, firstMessage, userInfo)
	if !isCommitter {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermission"))
	}

	if firstMessage.Type == "bulletin" {
		if !chatInfo.IsAdmin(userInfo) {
			return api.FailResponse(xxbResponse, lang.Errorf("service.message.noPermissionToBulletin"))
		}
	}

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)

	onlineUsers := []int64{userId}
	var offlineUsers []int64
	users, _ := user.GetListByStatus(c.db, "", chatMembers)
	for _, u := range users {
		if u.ID == userId {
			continue
		}
		if u.ClientStatus == "offline" {
			offlineUsers = append(offlineUsers, u.ID)
		} else {
			onlineUsers = append(onlineUsers, u.ID)
		}
	}

	xxbResponse.Users = onlineUsers

	/* Create messages. */
	formatMessage, err := imMessage.Create(c.db, sendRequest.Messages)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	err = imMessage.SaveOfflineList(c.db, formatMessage, offlineUsers)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	// 推送离线用户相关
	pushEnabled := model.GetItem(c.db, "owner=system&module=push&section=common&key=enable", "config")
	if pushEnabled == "open" && len(formatMessage) > 0 && len(offlineUsers) > 0 {
		// 保存推送消息到队列
		err = model.SavePushMessageToQueue(c.db, formatMessage[0], offlineUsers, chatInfo, len(formatMessage))
		if err != nil {
			// 推送失败不影响消息发送，只记录错误
			util.Log("error", "Save push message to queue failed: %v", err)
		}
	}

	if isNewChat {
		chatMap, _ := chatInfo.ToMap()
		response := map[string]any{
			"result": api.ResultSuccess,
			"method": "chatcreate",
			"users":  onlineUsers,
			"data":   chatMap,
		}

		chatCreateResponse, err := api.Format(xxbResponse, response, "chatcreateResponse")
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		responseList = append(responseList, chatCreateResponse)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUsers,
		"data":   model.ConvertMessageSlice(formatMessage),
	}

	successResponse, err := api.Format(xxbResponse, response, "messageSendResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
