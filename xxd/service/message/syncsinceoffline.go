package message

import (
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type SyncSinceOfflineRequest struct {
	Full bool `json:"full"`
}

func (r *SyncSinceOfflineRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("sync since offline invalid params")
	}
	var err error
	r.Full, err = util.AnyToBool(data[0])
	return err
}

func (c *MessageService) SyncSinceOffline(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SyncSinceOfflineRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	messages, _ := imMessageStatus.GetOfflineList(c.db, params.Full, userId)
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMessageSlice(messages),
	}
	successResponse, err := api.Format(xxbResponse, response, "messagesyncsinceofflineResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
