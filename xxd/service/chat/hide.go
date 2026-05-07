package chat

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type HideRequest struct {
	Hide bool   `json:"hide"`
	Gid  string `json:"gid"`
}

func (r *HideRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chathide invalid params")
	}

	var err error
	if r.Hide, err = util.AnyToBool(data[0]); err != nil {
		return err
	}

	r.Gid, err = util.AnyToString(data[1])
	return err
}

func (c *ChatService) HideService(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params HideRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	err = imChatUser.SetMute(c.db, params.Gid, params.Hide, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	err = imChatUser.SetFreeze(c.db, params.Gid, params.Hide, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"method": "chathide",
		"data": map[string]any{
			"gid":  params.Gid,
			"hide": params.Hide,
		},
	}
	successResponse, err := api.Format(xxbResponse, response, "chathideResponse")
	responseList = append(responseList, successResponse)

	response["method"] = "chatmute"
	response["data"] = map[string]any{
		"gid":  params.Gid,
		"mute": params.Hide,
	}
	successResponse, err = api.Format(xxbResponse, response, "chatmuteResponse")
	responseList = append(responseList, successResponse)

	response["method"] = "chatfreeze"
	response["data"] = map[string]any{
		"gid":    params.Gid,
		"freeze": params.Hide,
	}
	successResponse, err = api.Format(xxbResponse, response, "chatfreezeResponse")
	responseList = append(responseList, successResponse)

	return responseList, err
}
