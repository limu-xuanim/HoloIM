package user

import (
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type GetListRequest struct {
	UserIds []int64 `json:"userIds"`
}

func (r *GetListRequest) toStruct(data []any) error {
	if len(data) < 1 {
		return fmt.Errorf("usergetlist invalid params")
	}

	var err error
	r.UserIds, err = util.AnyToInt64Slice(data[0])
	return err
}

// 用户获取列表服务
func (u *UserService) GetList(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetListRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	// 获取用户列表
	var user model.User
	userList, err := user.GetUserInfoByUserIds(u.db, params.UserIds, true)
	if err != nil {
		response := map[string]any{
			"result":  api.ResultFail,
			"message": "Get userlist failed",
		}
		failResponse, err := api.Format(xxbResponse, response, "messageResponsePack")
		responseList = append(responseList, failResponse)
		return responseList, err
	}

	userValueList := make([]any, 0)
	for _, userInfo := range userList {
		userMap, err := userInfo.ToMap()
		if err != nil {
			continue
		}
		userValueList = append(userValueList, userMap)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"data":   userValueList,
		"users":  userId,
	}

	if len(params.UserIds) == 0 {
		roles, err := model.GetAllRoles()
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		response["roles"] = roles
		allDepts, err := model.GetListByType("dept")
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		depts := make(map[string]any)
		for id, dept := range allDepts {
			depts[id] = map[string]any{
				"name":   dept.Name,
				"order":  dept.Order,
				"parent": dept.Parent,
			}
		}
		response["depts"] = depts
	}

	successResponse, err := api.Format(xxbResponse, response, "usergetlistResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
