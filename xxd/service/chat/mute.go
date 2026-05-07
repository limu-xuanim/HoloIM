package chat

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type MuteRequest struct {
	Mute bool   `json:"mute"`
	Gid  string `json:"gid"`
}

func (r *MuteRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatmute invalid params")
	}

	var err error
	if r.Mute, err = util.AnyToBool(data[0]); err != nil {
		return err
	}

	r.Gid, err = util.AnyToString(data[1])
	return err
}

// true: mute a chat | false: cacel mute a chat.
func (c *ChatService) Mute(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params MuteRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	err = imChatUser.SetMute(c.db, params.Gid, params.Mute, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   map[string]any{"gid": params.Gid, "mute": params.Mute},
	}

	successResponse, err := api.Format(xxbResponse, response, "chatmuteResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
