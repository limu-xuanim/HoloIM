package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

type SearchRequest struct {
	SearchFields string     `json:"searchFields"`
	Pager        util.Pager `json:"pager"`
	OrderBy      string     `json:"orderBy"`
	OnlyGetChats bool       `json:"onlyGetChats"`
}

func (r *SearchRequest) toStruct(data []any) error {
	if len(data) < 4 {
		return fmt.Errorf("chatsearch invalid params")
	}

	var err error
	if r.SearchFields, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	pager, err := util.AnyToMapStringAny(data[1])
	if err != nil {
		return fmt.Errorf("chatsearch invalid params")
	}
	r.Pager.FromMap(pager, true)

	if r.OrderBy, err = util.AnyToString(data[2]); err != nil {
		return err
	}

	r.OnlyGetChats, err = util.AnyToBool(data[3])
	return err
}

func (c *ChatService) Search(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SearchRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, lang.Errorf("service.user.notExist"))
	}
	if !userInfo.IsSuper() {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.noPermission"))
	}
	if params.OnlyGetChats {
		chatGroups, err := imChat.AdminGetChatGroups(c.db)
		if err != nil {
			return api.FailResponse(xxbResponse, lang.Errorf("service.chat.getAllChatGroupsFailed"))
		}

		response := map[string]any{
			"result": api.ResultSuccess,
			"users":  int64(userId),
			"data":   model.ConvertChatsSlice(chatGroups),
		}
		successResponse, _ := api.Format(xxbResponse, response, "chatsearchResponse")
		responseList = append(responseList, successResponse)

	} else {
		chatList, err := imChat.Search(c.db, params.SearchFields, &params.Pager, params.OrderBy)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}

		response := map[string]any{
			"result": api.ResultSuccess,
			"users":  int64(userId),
			"data":   chatList,
			"pager":  params.Pager.ToMap(),
		}
		successResponse, _ := api.Format(xxbResponse, response, "chatsearchResponse")
		responseList = append(responseList, successResponse)
	}
	return responseList, nil
}
