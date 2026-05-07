package chat

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type StarRequest struct {
	Star bool   `json:"star"`
	Gid  string `json:"gid"`
}

func (r *StarRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatstar invalid params")
	}

	var err error
	if r.Star, err = util.AnyToBool(data[0]); err != nil {
		return err
	}

	r.Gid, err = util.AnyToString(data[1])
	return err
}

func (c *ChatService) Star(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params StarRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	err = imChatUser.SetStar(c.db, params.Gid, params.Star, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   map[string]any{"gid": params.Gid, "star": params.Star},
	}
	successResponse, err := api.Format(xxbResponse, response, "chatstarResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
