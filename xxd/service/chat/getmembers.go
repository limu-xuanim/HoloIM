package chat

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type GetMembersRequset struct {
	Gid string `json:"gid"`
}

func (r *GetMembersRequset) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("chatgetmembers invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	return err
}

// 获取群成员
func (c *ChatService) GetMembers(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {

	var params GetMembersRequset
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatList, err := imChatUser.GetMembers(c.db, chatInfo)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data": map[string]any{
			"members": chatList,
			"gid":     params.Gid,
		},
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetmembersResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
