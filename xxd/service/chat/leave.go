package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type LeaveRequest struct {
	Gid string `json:"gid"`
}

func (r *LeaveRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatleave invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

func (c *ChatService) Leave(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params LeaveRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	gId := params.Gid

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notMember"))
	}
	chatInfo, err := imChat.GetChatByGid(c.db, gId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}
	if !chatInfo.IsGroup() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}
	err = imChat.Leave(c.db, gId, userId)
	if err != nil {
		xxbAction.AddUserAction(c.db, userInfo.Account, "leave", userId, string(xxbResponse.Method), "fail", gId, xxbResponse.Ip)
		return api.FailResponse(xxbResponse, err)
	}
	xxbAction.AddUserAction(c.db, userInfo.Account, "leave", userId, string(xxbResponse.Method), "success", gId, xxbResponse.Ip)

	members, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, members)
	onlineUserIds = append(onlineUserIds, userId)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, params.Gid)
	chatMap, _ := chatInfo.ToMap()

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   chatMap,
	}
	successResponse, err := api.Format(xxbResponse, response, "leaveChatResponse")
	responseList = append(responseList, successResponse)

	if !chatInfo.IsDismissed() {
		messageCreateBroadcast, _ := imMessage.MessageCreateBroadcast(c.db, xxbResponse, "leaveChat", chatInfo, onlineUserIds, userId, nil, false)
		responseList = append(responseList, messageCreateBroadcast...)
	}

	return responseList, err
}
