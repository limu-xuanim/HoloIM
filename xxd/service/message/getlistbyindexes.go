package message

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type GetListByIndexesRequest struct {
	Gid     string  `json:"gid"`
	Indexes []int64 `json:"indexes"`
}

func (r *GetListByIndexesRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("messagegetlistbyindexes invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.Indexes, err = util.AnyToInt64Slice(data[1])
	return err
}

func (c *MessageService) GetListByIndexes(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetListByIndexesRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	chatMembers, _ := imChatUser.GetMembers(c.db, chatInfo)
	if len(chatMembers) > 0 && !util.IntSliceContains(chatMembers, userId) {
		return api.FailResponse(xxbResponse, lang.Errorf("service.message.noReadPermission"))
	}
	formatMessage, err := imMessage.GetMessagesByIndexes(c.db, params.Gid, params.Indexes)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMessageSlice(formatMessage),
	}

	successResponse, err := api.Format(xxbResponse, response, "messagegetlistbyindexesResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
