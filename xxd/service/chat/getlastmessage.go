package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type GetLastMessageRequest struct {
	CGids []string `json:"cgids"`
}

func (r *GetLastMessageRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatgetlastmessage invalid params")
	}

	var err error
	r.CGids, err = util.AnyToStringSlice(data[0])
	return err
}

func (c *ChatService) GetLastMessage(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetLastMessageRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userChatList, err := imChatUser.GetCgIdListByUser(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}

	cgids := util.StringArrayIntersect(params.CGids, userChatList)

	// 批量查询会话信息
	chats, err := imChat.GetChatsByGids(c.db, cgids)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	// 提取 gid 和 lastMessage ID
	validCgids := make([]string, 0, len(chats))
	messageIDs := make([]int64, 0, len(chats))
	for _, chat := range chats {
		validCgids = append(validCgids, chat.Gid)
		messageIDs = append(messageIDs, chat.LastMessage)
	}

	// 批量查询最后一条消息
	lastMessageList, err := imMessage.GetLastMessageList(c.db, validCgids, messageIDs)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMessageSlice(lastMessageList),
	}
	successResponse, err := api.Format(xxbResponse, response, "chatgetlastmessageResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
