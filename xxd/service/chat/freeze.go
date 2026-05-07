package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type FreezeRequest struct {
	Freeze bool   `json:"freeze"`
	Gid    string `json:"gid"`
}

func (r *FreezeRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("chatfreeze invalid params")
	}

	var err error
	if r.Freeze, err = util.AnyToBool(data[0]); err != nil {
		return err
	}

	r.Gid, err = util.AnyToString(data[1])
	return err
}

func (c *ChatService) Freeze(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params FreezeRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.notMember"))
	}

	err = imChatUser.SetFreeze(c.db, params.Gid, params.Freeze, userId)
	if err != nil {
		xxbAction.AddUserAction(c.db, userInfo.Account, "chatFreeze", userId, string(xxbResponse.Method), "fail", params.Gid, xxbResponse.Ip)
		return api.FailResponse(xxbResponse, err)
	}

	xxbAction.AddUserAction(c.db, userInfo.Account, "chatFreeze", userId, string(xxbResponse.Method), "success", params.Gid, xxbResponse.Ip)

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   map[string]any{"gid": params.Gid, "freeze": params.Freeze},
	}

	successResponse, err := api.Format(xxbResponse, response, "chatfreezeResponse")
	responseList = append(responseList, successResponse)

	return responseList, err
}
