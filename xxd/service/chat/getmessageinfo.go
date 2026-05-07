package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type GetMessageInfoRequest struct {
	Gid string `json:"gid"`
}

func (r *GetMessageInfoRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatgetmessageinfo invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

func (c *ChatService) GetMessageInfo(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetMessageInfoRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	gId := params.Gid
	chatInfo, _ := imChat.GetChatByGid(c.db, gId)
	members, _ := imChatUser.GetMembers(c.db, chatInfo)

	// 检查用户是否在群成员中，且群未被合并
	if !util.IntSliceContains(members, userId) && !chatInfo.IsMerged() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notInChat"))
	}

	messageCount, err := imMessage.GetMessageCount(c.db, gId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.getMessageInfoFailed"))
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   map[string]any{"lastMessage": chatInfo.LastMessage, "messageCount": messageCount},
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetmessageinfoResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
