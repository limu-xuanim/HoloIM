package message

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type SyncRequest struct {
	CGID     string `json:"cgid"`
	FromId   int64  `json:"fromId"`
	Reverse  bool   `json:"reverse"`
	Limit    int    `json:"limit"`
	ReturnId bool   `json:"returnId"`
}

func (r *SyncRequest) toStruct(data []any) error {
	if len(data) < 5 {
		return fmt.Errorf("sync invalid params")
	}
	var err error
	r.CGID, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}
	r.FromId, err = util.AnyToInt64(data[1])
	if err != nil {
		return err
	}
	r.Reverse, err = util.AnyToBool(data[2])
	if err != nil {
		return err
	}
	limit, err := util.AnyToInt64(data[3])
	if err != nil {
		return err
	}
	r.Limit = int(limit)
	r.ReturnId, err = util.AnyToBool(data[4])
	return err
}

func (c *MessageService) Sync(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SyncRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatInfo, err := imChat.GetChatByGid(c.db, params.CGID)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	chatMembers, err := imChatUser.GetMembers(c.db, chatInfo)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}	
	if len(chatMembers) > 0 && !util.IntSliceContains(chatMembers, userId) && !chatInfo.IsMerged() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.message.noReadPermission"))
	}
	messages := imMessageStatus.GetListAroundIDForUser(c.db, params.CGID, params.FromId, params.Reverse, params.Limit, userId)

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
	}

	method := "messagesyncResponse"
	if params.ReturnId {
		method = "messagesyncidResponse"
		idList := []int64{}
		for _, message := range messages {
			idList = append(idList, message.ID)
		}
		response["data"] = idList
	} else {
		response["data"] = model.ConvertMessageSlice(messages)
	}
	successResponse, err := api.Format(xxbResponse, response, method)
	responseList = append(responseList, successResponse)
	return responseList, err
}
