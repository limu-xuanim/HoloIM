package message

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type RetractRequest struct {
	Messages []model.XxbImMessage `json:"messages"`
}

func (r *RetractRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("retract invalid params")
	}
	messagesInterface, err := util.AnyToAnySlice(data[0])
	if err != nil {
		return err
	}
	messages := []model.XxbImMessage{}

	for _, message := range messagesInterface {
		messageStruct := model.ParseMessage(message)
		if messageStruct.Type == "broadcast" {
			continue
		}
		messages = append(messages, messageStruct)
	}

	r.Messages = messages
	return nil
}

func (c *MessageService) Retract(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params RetractRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	if len(params.Messages) == 0 {
		return api.FailResponse(xxbResponse, lang.Errorf("service.message.listEmpty"))
	}

	firstMessage := params.Messages[0]

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.user.notExist"))
	}
	chatInfo, _ := imChat.GetChatByGid(c.db, firstMessage.CgId)
	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)

	messageRetract, err := imMessage.MessageRetract(c.db, firstMessage.Gid, chatInfo.IsAdmin(userInfo), userId, *chatInfo)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	onlineUsers := user.GetOnlineUsers(c.db, chatMembers)
	messageRetractMap, _ := messageRetract.ToMap()

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUsers,
		"data":   []any{messageRetractMap},
	}
	successResponse, err := api.Format(xxbResponse, response, "messageretractResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
