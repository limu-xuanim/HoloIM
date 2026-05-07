package message

import (
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type SyncMissedRequest struct {
	LastKnownMessage int64 `json:"lastKnownMessage"`
}

func (r *SyncMissedRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("sync missed invalid params")
	}
	var err error
	r.LastKnownMessage, err = util.AnyToInt64(data[0])
	return err
}

func (c *MessageService) SyncMissed(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SyncMissedRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	messages, err := imMessageStatus.GetMissedByLastKnown(c.db, userId, params.LastKnownMessage)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMessageSlice(messages),
	}
	successResponse, err := api.Format(xxbResponse, response, "messagesyncmissedResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
