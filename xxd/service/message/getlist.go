package message

import (
	"encoding/json"
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type GetListRequest struct {
	Gid        string  `json:"gid"`
	IdList     []int64 `json:"idList"`
	FromMerged int64   `json:"fromMerged"`
}

func (r *GetListRequest) toStruct(data []any) error {
	if len(data) < 3 {
		return fmt.Errorf("messagegetlist invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.IdList, err = util.AnyToInt64Slice(data[1])
	if err != nil {
		return err
	}

	r.FromMerged, err = util.AnyToInt64(data[2])
	return err
}

func (c *MessageService) GetList(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetListRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInChat := imChatUser.IsInChat(c.db, params.Gid, userId)
	chatInfo, _ := imChat.GetChatByGid(c.db, params.Gid)
	// 不在群内并且未合并的群
	if !userInChat && !chatInfo.IsMerged() {
		if params.FromMerged == 0 {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
		}
		mergedMessage, err := imMessage.GetList(c.db, "", []int64{params.FromMerged}, nil, "", "", false, false, nil)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		if len(mergedMessage) == 0 {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
		}
		mergedMessageInfo := mergedMessage[0]
		if mergedMessageInfo.ID == 0 || mergedMessageInfo.Data == "" {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
		}

		var mergedMessageData map[string]any
		err = json.Unmarshal([]byte(mergedMessageInfo.Data), &mergedMessageData)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}

		mergeStr := mergedMessageData["merge"].(string)
		var merge []int64
		err = json.Unmarshal([]byte(mergeStr), &merge)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}

		mergedChat, exist := mergedMessageData["chat"].(string)
		if !exist {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
		}
		if len(merge) == 0 || mergedChat != params.Gid || len(util.ArrayDiff(params.IdList, merge)) > 0 {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notExist"))
		}
	}

	messages, err := imMessage.GetList(c.db, params.Gid, params.IdList, nil, "", "", false, false, nil)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMessageSlice(messages),
	}

	successResponse, err := api.Format(xxbResponse, response, "messagegetlistResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
