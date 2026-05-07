package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type InviteRequest struct {
	Gid     string  `json:"gid"`
	Members []int64 `json:"members"`
}

func (r *InviteRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatinvite invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.Members, err = util.AnyToInt64Slice(data[1])
	return err
}

func (c *ChatService) Invite(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params InviteRequest
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
	if !chatInfo.IsAdmin(userInfo) && chatInfo.IsAdminInvite() && !chatInfo.IsPublic() && !userInfo.IsSuper() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermissionExceptAdmin"))
	}
	if !userInfo.IsSuper() && !imChatUser.IsInChat(c.db, params.Gid, userId) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.userNotInChat"))
	}
	if !chatInfo.IsGroup() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}

	joinedMembers := []int64{}
	for _, id := range params.Members {
		joinedMember, err := imChat.Join(c.db, params.Gid, id)
		if err != nil {
			_, _ = xxbAction.AddUserAction(c.db, userInfo.Account, "chatInvite", userId, string(xxbResponse.Method), "fail", params.Gid, xxbResponse.Ip)
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.operationFailed"))
		}

		if joinedMember != 0 {
			joinedMembers = append(joinedMembers, joinedMember)
		}
	}
	_, _ = xxbAction.AddUserAction(c.db, userInfo.Account, "chatInvite", userId, string(xxbResponse.Method), "success", "", xxbResponse.Ip)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, params.Gid)
	chatMap, _ := chatInfo.ToMap()

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)

	if userInfo.IsSuper() {
		onlineUserIds = append(onlineUserIds, userId)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   chatMap,
	}

	successResponse, err := api.Format(xxbResponse, response, "chatinviteResponse")
	responseList = append(responseList, successResponse)

	// 发送广播消息给群内的其他成员
	members := util.ArrayDiff(params.Members, joinedMembers)

	if len(members) > 0 {
		broadcast, _ := imMessage.MessageCreateBroadcast(c.db, xxbResponse, "inviteUser", chatInfo, onlineUserIds, int64(userId), members, false)
		responseList = append(responseList, broadcast...)
	}

	return responseList, err

}
