package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type GetMemberDetailsRequest struct {
	Gid     string     `json:"gid"`
	Pager   util.Pager `json:"pager"`
	Search  string     `json:"search"`
	OrderBy string     `json:"orderBy"`
}

func (t *GetMemberDetailsRequest) toStruct(data []any) error {
	if len(data) < 4 {
		return fmt.Errorf("chatgetmemberdetails invalid params")
	}

	var err error
	if t.Gid, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	pagerMap, ok := data[1].(map[string]any)
	if !ok {
		return fmt.Errorf("chatgetmemberdetails invalid params")
	}
	t.Pager.FromMap(pagerMap, true)

	if t.OrderBy, err = util.AnyToString(data[2]); err != nil {
		return err
	}

	t.Search, err = util.AnyToString(data[3])
	return err
}

func (c *ChatService) GetMemberDetails(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetMemberDetailsRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, _ := user.GetAccountByID(c.db, userId)
	if !userInfo.IsSuper() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermission"))
	}

	var chatMembers []int64
	if params.Gid != "" {
		chatInfo, err := imChat.GetChatByGid(c.db, params.Gid)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		chatMembers, err = imChatUser.GetMembers(c.db, chatInfo)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
	}

	memberIds := []int64{}
	if params.Search != "" {
		memberIds, err = user.SearchUserId(c.db, params.Search, 0, chatMembers, params.Pager.PageID, params.Pager.RecPerPage, []int64{}, nil)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
	}

	var members []model.MemberDetail
	var pager util.Pager
	if params.Search == "" || len(memberIds) != 0 {
		members, pager, err = imChatUser.GetMembersDetail(c.db, params.Gid, memberIds, params.OrderBy, params.Pager)
	} else {
		pager = params.Pager
	}

	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   model.ConvertMemberDetailsSlice(members),
		"pager":  pager.ToMap(),
	}

	successResponse, err := api.Format(xxbResponse, response, "chatgetmemberdetailsResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
