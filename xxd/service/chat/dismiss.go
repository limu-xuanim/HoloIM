package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type DismissRequest struct {
	Gid string `json:"gid"`
}

func (r *DismissRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatdismiss invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

func (c *ChatService) Dismiss(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params DismissRequest
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
	if chatInfo.Type != "group" {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notGroup"))
	}
	if chatInfo.OwnedBy == "" && chatInfo.CreatedBy != userInfo.Account {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermission"))
	}
	if chatInfo.OwnedBy != "" && chatInfo.OwnedBy != userInfo.Account {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermission"))
	}

	// 解散群
	err = imChat.Dismiss(c.db, gId, userInfo.Account)
	if err != nil {
		xxbAction.AddUserAction(c.db, userInfo.Account, "dismiss", userId, string(xxbResponse.Method), "fail", gId, xxbResponse.Ip)
		return api.FailResponse(xxbResponse, err)
	}

	xxbAction.AddUserAction(c.db, userInfo.Account, "dismiss", userId, string(xxbResponse.Method), "success", gId, xxbResponse.Ip)

	members, _ := imChatUser.GetMembers(c.db, chatInfo)
	userOnlineIds := user.GetOnlineUsers(c.db, members)
	messageCreateBroadcast, _ := imMessage.MessageCreateBroadcast(c.db, xxbResponse, "dismissChat", chatInfo, userOnlineIds, userId, nil, false)

	chatInfo, _ = imChat.GetChatByGidWithExtra(c.db, gId)
	chatMap, _ := chatInfo.ToMap()

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  userOnlineIds,
		"data":   chatMap,
	}

	successResponse, err := api.Format(xxbResponse, response, "chatdismissResponse")
	responseList = append(responseList, successResponse)
	responseList = append(responseList, messageCreateBroadcast...)

	return responseList, err
}
