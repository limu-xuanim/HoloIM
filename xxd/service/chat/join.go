package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type JoinRequest struct {
	Gid string `json:"gid"`
}

func (r *JoinRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatjoin invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

func (c *ChatService) Join(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params JoinRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notMember"))
	}
	chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}
	if !chatInfo.IsGroup() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}
	if !chatInfo.IsPublic() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notPublic"))
	}
	_, err = imChat.Join(c.db, params.Gid, userId)
	if err != nil {
		xxbAction.AddUserAction(c.db, userInfo.Account, "update", userId, string(xxbResponse.Method), "fail", params.Gid, xxbResponse.Ip)
		return api.FailResponse(xxbResponse, err)
	}
	xxbAction.AddUserAction(c.db, userInfo.Account, "update", userId, string(xxbResponse.Method), "success", params.Gid, xxbResponse.Ip)

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)
	onlineUserIds = append(onlineUserIds, userId)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, params.Gid)
	chatMap, _ := chatInfo.ToMap()
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   chatMap,
	}
	successResponse, err := api.Format(xxbResponse, response, "chatjoinResponse")
	responseList = append(responseList, successResponse)

	// 发送广播消息
	broadcast, _ := imMessage.MessageCreateBroadcast(c.db, xxbResponse, "joinChat", chatInfo, onlineUserIds, int64(userId), nil, false)
	responseList = append(responseList, broadcast...)

	return responseList, err
}
