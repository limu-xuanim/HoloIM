package chat

import (
	"xxd/api"
	"xxd/model"
)

// 获取可加入的公开群
func (c *ChatService) GetPublicList(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	cgIds, err := imChatUser.GetCgIdListByUser(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	publicChats, _ := imChat.GetPublicChat(c.db, cgIds)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertChatsSlice(publicChats),
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetpubliclistResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
