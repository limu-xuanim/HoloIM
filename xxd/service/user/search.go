package user

import (
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type SearchOptions struct {
	Chat    string     `json:"chat"`
	Dept    int64      `json:"dept"`
	Limit   int64      `json:"limit"`
	Exclude []int64    `json:"exclude"`
	Pager   util.Pager `json:"pager"`
}

type SearchRequest struct {
	Search   string        `json:"search"`
	Options  SearchOptions `json:"options"`
	ReturnId bool          `json:"returnId"`
}

func (r *SearchRequest) toStruct(data []any) error {
	if len(data) < 3 {
		return fmt.Errorf("usersearch invalid params")
	}

	var err error
	if r.Search, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	if r.ReturnId, err = util.AnyToBool(data[2]); err != nil {
		return err
	}

	options, err := util.AnyToMapStringAny(data[1])
	if err != nil {
		return fmt.Errorf("usersearch invalid params")
	}

	r.Options.Chat = util.GetStringFromMap(options, "chat", "")
	r.Options.Dept = util.GetInt64FromMap(options, "dept", 0)
	r.Options.Limit = util.GetInt64FromMap(options, "limit", 50)
	r.Options.Exclude = util.GetInt64SliceFromMap(options, "exclude", []int64{})

	r.Options.Pager.FromMap(options, true)
	return nil
}

func (u *UserService) Search(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SearchRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	chatMembers := []int64{}
	if params.Options.Chat != "" {
		chatInfo, err := imChat.GetChatByGid(u.db, params.Options.Chat)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		chatMembers, err = imChatUser.GetMembers(u.db, chatInfo)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
	}

	// 获取用户列表
	searchList, err := user.Search(u.db, params.Search, params.Options.Dept, chatMembers, params.Options.Pager.PageID, params.Options.Pager.RecPerPage, params.Options.Exclude, nil)
	if err != nil {
		return nil, err
	}
	params.Options.Pager.RecTotal = int64(len(searchList))

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"pager":  params.Options.Pager.ToMap(),
	}

	if params.ReturnId {
		userIds := []int64{}
		for _, user := range searchList {
			userIds = append(userIds, int64(user.ID))
		}
		response["data"] = userIds
	} else {
		response["data"] = model.ConvertUsersSlice(searchList)
	}

	methodKey := "usersearchResponse"
	if params.ReturnId {
		methodKey = "usersearchidResponse"
	}
	successResponse, err := api.Format(xxbResponse, response, methodKey)
	responseList = append(responseList, successResponse)
	return responseList, err
}
