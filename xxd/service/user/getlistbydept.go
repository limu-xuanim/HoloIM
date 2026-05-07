package user

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type GetListByDeptRequest struct {
	DeptID   int64      `json:"deptID"`
	Pager    util.Pager `json:"pager"`
	OrderBy  string     `json:"orderBy"`
	Exclude  []int64    `json:"exclude"`
	OnlySelf bool       `json:"onlySelf"`
}

func (r *GetListByDeptRequest) toStruct(data []any) error {
	if len(data) < 5 {
		return fmt.Errorf("usergetlistbydept invalid params")
	}

	var err error
	if r.DeptID, err = util.AnyToInt64(data[0]); err != nil {
		return err
	}

	pagerMap, ok := data[1].(map[string]any)
	if !ok {
		return fmt.Errorf("usergetlistbydept invalid pager data")
	}
	r.Pager.FromMap(pagerMap, true)

	if r.OrderBy, err = util.AnyToString(data[2]); err != nil {
		return err
	}

	if r.Exclude, err = util.AnyToInt64Slice(data[3]); err != nil {
		return err
	}

	if r.OnlySelf, err = util.AnyToBool(data[4]); err != nil {
		return err
	}

	return nil
}

// 用户按部门服务获取列表
func (u *UserService) GetListByDept(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params GetListByDeptRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userIds, err := user.GetIDListByDept(u.db, params.DeptID, params.Exclude, &params.Pager, params.OrderBy, params.OnlySelf)
	orderBy := "id_asc"
	if params.OrderBy != "" {
		orderBy = params.OrderBy
	}
	params.Pager.Data = map[string]any{
		"dept":    params.DeptID,
		"orderBy": orderBy,
	}
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   userIds,
		"pager":  params.Pager.ToMap(),
	}
	successResponse, err := api.Format(xxbResponse, response, "usergetlistbydeptResponse")
	xxbResponse.JSON = successResponse.JSON
	responseList = append(responseList, xxbResponse)
	return responseList, err
}
