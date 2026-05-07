package user

import (
	"fmt"
	"xxd/api"
)

type UpdateRequest struct {
	User map[string]any `json:"user"`
}

func (r *UpdateRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("userupdate invalid params")
	}

	userMap, ok := data[0].(map[string]any)
	if !ok {
		return fmt.Errorf("invalid user data")
	}
	r.User = userMap
	if status, ok := r.User["status"]; ok && status != "" {
		r.User["clientStatus"] = status
		delete(r.User, "status")
	}

	return nil
}

var userCanEditFields = []string{"account", "password", "avatar", "birthday", "gender", "email", "skype", "qq", "yahoo", "gtalk", "wangwang", "site", "mobile", "phone", "address", "zipcode", "clientStatus", "weixin", "realname"}

// 修改个人信息
func (u *UserService) Update(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params UpdateRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}
	user, err = user.GetAccountByID(u.db, userId)

	safeUpateUser := map[string]any{}
	if _, exists := params.User["clientStatus"]; exists && params.User["clientStatus"] != "" {
		safeUpateUser["clientStatus"] = params.User["clientStatus"]
	} else {
		for _, field := range userCanEditFields {
			if _, exists := params.User[field]; exists && params.User[field] != nil && params.User[field] != "" {
				safeUpateUser[field] = params.User[field]
			}
		}
	}
	// 将结构体转换为 map
	err = user.UpdateUserInfo(u.db, &user, safeUpateUser, string(xxbResponse.Method), false)
	if err != nil {
		action.AddUserAction(u.db, user.Account, "edit", userId, string(xxbResponse.Method), "fail", "", "clientIP")
		return api.FailResponse(xxbResponse, err)
	}
	action.AddUserAction(u.db, user.Account, "edit", userId, string(xxbResponse.Method), "success", "", "clientIP")

	onlineUsers := user.GetOnlineUsers(u.db, []int64{})
	userMap, _ := user.ToMap()
	// 将safeUpdateUser 合并到userMap
	for key, value := range safeUpateUser {
		userMap[key] = value
	}

	userMap["status"] = userMap["clientStatus"]

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUsers,
		"data":   userMap,
	}

	successResponse, err := api.Format(xxbResponse, response, "memberResponsePack")
	responseList = append(responseList, successResponse)
	return responseList, err
}
