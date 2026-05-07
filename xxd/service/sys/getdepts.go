package sys

import (
	"xxd/api"
	"xxd/model"
)

func (s *SysService) GetDepts(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	depts, err := model.GetListByType("dept")
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	deptsList := make(map[string]map[string]any, 0)
	for id, dept := range depts {
		deptsList[id] = map[string]any{
			"name":    dept.Name,
			"order":   dept.Order,
			"parent":  dept.Parent,
			"path":    dept.Path,
			"manager": dept.Manager,
		}
	}

	roles, err := model.GetAllRoles()
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	rolesData := map[string]string{}
	for _, role := range roles {
		rolesData[role.Key] = role.Value
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data": map[string]any{
			"depts": deptsList,
			"roles": rolesData,
		},
	}
	successResponse, err := api.Format(xxbResponse, response, "sysgetdeptsResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
