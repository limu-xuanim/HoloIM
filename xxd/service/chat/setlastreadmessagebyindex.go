package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type SetLastReadMessageByIndexRequest struct {
	Gid                  string `json:"gid"`
	LastReadMessageIndex int64  `json:"lastReadMessageIndex"`
}

func (r *SetLastReadMessageByIndexRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatsetlastreadmessagebyindex invalid params")
	}

	var err error
	if r.Gid, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	r.LastReadMessageIndex, err = util.AnyToInt64(data[1])
	return err
}

func (c *ChatService) SetLastReadMessageByIndex(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SetLastReadMessageByIndexRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, _ := user.GetAccountByID(c.db, userId)
	err = imChat.SetLastReadMessageByIndex(c.db, params.Gid, params.LastReadMessageIndex, userInfo)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.operationFailed"))
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   map[string]any{"gid": params.Gid, "id": params.LastReadMessageIndex},
	}

	if err := c.applyReadStatusRecipients(response, params.Gid); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	successResponse, err := api.Format(xxbResponse, response, "chatsetlastreadmessagebyindexResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
