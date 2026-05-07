package chat

import (
	"xxd/api"
	"xxd/lang"
)

func (c *ChatService) UnpinMessages(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params PinMessagesRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.user.notExist"))
	}
	chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}
	if !chatInfo.IsAdmin(userInfo) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermissionExceptAdmin"))
	}

	var allPinned []int64
	if !chatInfo.IsArchived() {
		allPinned, err = imChat.UnpinMessages(c.db, chatInfo, params.MessageIds)
		if err != nil {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.unpinMessagesFailed", err.Error()))
		}
	}

	chatMembers, err := imChatUser.GetMembers(c.db, chatInfo)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   map[string]any{"cgid": params.Gid, "unpinned": params.MessageIds, "allPinned": allPinned},
	}
	successResponse, err := api.Format(xxbResponse, response, "chatunpinmessagesResponse")
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	responseList = append(responseList, successResponse)
	return responseList, nil
}
