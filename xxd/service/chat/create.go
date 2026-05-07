package chat

import (
	"fmt"
	"xxd/api"
	"xxd/lang"
	"xxd/util"
)

type CreateRequest struct {
	Gid       string  `json:"gid"`
	Name      string  `json:"name"`
	Type      string  `json:"type"`
	Members   []int64 `json:"members"`
	SubjectID int64   `json:"subjectID"`
	Public    bool    `json:"public"`
}

func (r *CreateRequest) toStruct(data []any) error {
	if len(data) < 6 {
		return fmt.Errorf("chatcreate invalid params")
	}

	var err error
	r.Gid, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}
	r.Name, err = util.AnyToString(data[1])
	if err != nil {
		return err
	}
	r.Type, err = util.AnyToString(data[2])
	if err != nil {
		return err
	}
	r.Members, err = util.AnyToInt64Slice(data[3])
	if err != nil {
		return err
	}
	r.SubjectID, err = util.AnyToInt64(data[4])
	if err != nil {
		return err
	}
	r.Public, err = util.AnyToBool(data[5])
	return err
}

// 创建群聊
func (c *ChatService) Create(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params CreateRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	gid := params.Gid
	name := params.Name
	typeVal := params.Type
	membersInt := params.Members
	subjectID := params.SubjectID
	public := params.Public

	if gid == "notification" || gid == "littlexx" {
		response := map[string]any{
			"result": api.ResultSuccess,
			"users":  []int64{userId},
		}

		successResponse, _ := api.Format(xxbResponse, response, "chatcreate")
		responseList = append(responseList, successResponse)
		return responseList, err
	}

	if chatInfo, _ := imChat.GetChatByGid(c.db, gid); chatInfo.Id > 0 {
		return api.FailResponse(xxbResponse, lang.Errorf("service.chat.existed"))
	}

	userInfo, err := user.GetAccountByID(c.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	//创建
	chatInfo, userIds, err := imChat.Create(c.db, gid, name, typeVal, membersInt, subjectID, public, userId)
	if err != nil {
		if typeVal == "group" {
			xxbAction.AddUserAction(c.db, userInfo.Account, "create", userId, string(xxbResponse.Method), "fail", "", xxbResponse.Ip)
		}
		return api.FailResponse(xxbResponse, err)
	}

	chatMap, err := chatInfo.ToMap()
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userOnlineIds := user.GetOnlineUsers(c.db, userIds)
	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  userOnlineIds,
		"data":   chatMap,
	}

	successResponse, err := api.Format(xxbResponse, response, "chatcreateResponse")
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	responseList = append(responseList, successResponse)

	if typeVal == "group" {
		xxbAction.AddUserAction(c.db, userInfo.Account, "create", userId, string(xxbResponse.Method), "success", "", xxbResponse.Ip)
		messageCreateBroadcast, err := imMessage.MessageCreateBroadcast(c.db, xxbResponse, "createChat", chatInfo, userOnlineIds, userId, nil, false)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		responseList = append(responseList, messageCreateBroadcast...)
	}

	return responseList, err
}
