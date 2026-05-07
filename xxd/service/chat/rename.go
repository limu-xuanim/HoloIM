package chat

import (
	"fmt"
	"unicode/utf8"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type RenameRequest struct {
	Gid  string `json:"gid"`
	Name string `json:"name"`
}

func (r *RenameRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatrename invalid params")
	}

	var err error
	if r.Gid, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	r.Name, err = util.AnyToString(data[1])
	return err
}

// Change group name
func (c *ChatService) Rename(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params RenameRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
	if err != nil || chatInfo.Id == 0 || chatInfo.IsDismissed() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}
	if chatInfo.IsArchived() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.archivedNotOperation"))
	}
	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.user.notExist"))
	}

	if !userInfo.IsSuper() && !chatInfo.IsAdmin(userInfo) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermissionExceptAdmin"))
	}

	if !chatInfo.IsGroup() && !chatInfo.IsSystem() && !chatInfo.IsPrivate(userId) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}

	if utf8.RuneCountInString(params.Name) > 16 {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.nameTooLong"))
	}

	err = imChat.UpdateName(c.db, params.Gid, params.Name, userInfo.Account)
	if err != nil {
		xxbAction.AddUserAction(c.db, userInfo.Account, "rename", userId, string(xxbResponse.Method), "fail", params.Name, xxbResponse.Ip)
		return api.FailResponse(xxbResponse, err)
	}
	xxbAction.AddUserAction(c.db, userInfo.Account, "rename", userId, string(xxbResponse.Method), "success", params.Name, xxbResponse.Ip)

	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	onlineUserIds := user.GetOnlineUsers(c.db, chatMembers)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, params.Gid)
	chatMap, _ := chatInfo.ToMap()
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIds,
		"data":   chatMap,
	}
	successResponse, err := api.Format(xxbResponse, response, "chatrenameResponse")
	responseList = append(responseList, successResponse)

	var typeBroadcast = "renameChat"
	if chatInfo.IsPrivate(userId) {
		typeBroadcast = "renamePrivate"
	}

	messageCreateBroadcast, _ := imMessage.MessageCreateBroadcast(c.db, xxbResponse, typeBroadcast, chatInfo, onlineUserIds, userId, nil, false)
	responseList = append(responseList, messageCreateBroadcast...)

	return responseList, err
}
