package chat

import (
	"xxd/api"
	"xxd/model"
)

func (c *ChatService) GetList(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	withSys := model.IsSystemGroupEnable(c.db)
	chatList, err := imChat.GetChats(c.db, &userInfo, 90, withSys)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertChatsSlice(chatList),
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetlistResponse")

	responseList = append(responseList, successResponse)
	return responseList, err
}
