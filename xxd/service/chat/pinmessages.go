package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type PinMessagesRequest struct {
	Gid        string  `json:"gid"`
	MessageIds []int64 `json:"msgIds"`
}

func (r *PinMessagesRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatpinmessages invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.MessageIds, err = util.AnyToInt64Slice(data[1])
	return err
}

func (c *ChatService) PinMessages(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
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
		allPinned, err = imChat.PinMessages(c.db, chatInfo, params.MessageIds)
		if err != nil {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.pinMessagesFailed", err.Error()))
		}
	}

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   map[string]any{"cgid": params.Gid, "pinned": params.MessageIds, "allPinned": allPinned},
	}
	successResponse, err := api.Format(xxbResponse, response, "chatpinmessagesResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
