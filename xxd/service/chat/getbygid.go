package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type GetByGidRequest struct {
	Gid string `json:"gid"`
}

func (r *GetByGidRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatgetbygid invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

func (c *ChatService) GetByGid(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetByGidRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatInfo, err := imChat.GetChatByGidWithExtra(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
	}
	chatMap, _ := chatInfo.ToMap()

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   chatMap,
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetbygidResponse")
	responseList = append(responseList, successResponse)

	return responseList, err
}
