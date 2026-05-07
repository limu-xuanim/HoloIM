package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type KickRequest struct {
	Gid   string  `json:"gid"`
	Users []int64 `json:"users"`
}

func (r *KickRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatkick invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.Users, err = util.AnyToInt64Slice(data[1])
	return err
}

func (c *ChatService) Kick(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params KickRequest
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
	if !chatInfo.IsAdmin(userInfo) && !userInfo.IsSuper() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermissionExceptAdmin"))
	}
	if !chatInfo.IsGroup() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}
	groupOwner, err := imChat.GetUserIdsByOwnedBy(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	// 如果群主在需要踢出的用户列表中，则需要将群主移除列表
	if groupOwner != 0 {
		params.Users = util.ArrayDiff(params.Users, []int64{groupOwner})
	}
	if len(params.Users) == 0 {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.canNotDelOwner"))
	}

	for _, id := range params.Users {
		err = imChat.Leave(c.db, params.Gid, id)
		if err != nil {
			xxbAction.AddUserAction(c.db, userInfo.Account, "chatKick", userId, string(xxbResponse.Method), "fail", params.Gid, xxbResponse.Ip)
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.operationFailed"))
		}
	}
	xxbAction.AddUserAction(c.db, userInfo.Account, "chatKick", userId, string(xxbResponse.Method), "success", "", xxbResponse.Ip)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, params.Gid)
	chatMap, _ := chatInfo.ToMap()

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)
	onlineUserIds = append(onlineUserIds, params.Users...)

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   chatMap,
	}
	successResponse, err := api.Format(xxbResponse, response, "chatkickResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
