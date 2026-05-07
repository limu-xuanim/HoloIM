package service

import (
	"fmt"
	"strings"
	"xxd/api"
	"xxd/util"
)

type methodHandler func(params []any, response api.XxbResponse, userId int64, version string, device string) ([]api.XxbResponse, error)

// 方法分发
func RoleService(parseData api.XxbResponse, userId int64) ([]api.XxbResponse, error) {
	methodHandlers := buildMethodHandlers()
	method := strings.ToLower(string(parseData.Method))
	if handler, exists := methodHandlers[method]; exists {
		json, xxbResponse, err := api.ParseParams(parseData)
		if err != nil {
			return nil, err
		}
		params, err := util.AnyToAnySlice(json["params"])
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}

		responses, err := handler(params, xxbResponse, parseData.UserID, parseData.Version, string(parseData.Device))
		if err != nil {
			util.Log("error", "%s %s", util.GetLang("[RoleService]", " ", "roleservice json data decrypt error", ":"), err)
			return nil, err
		}

		if util.Config.Debug == 2 {
			for _, data := range responses {
				util.LogDetail(util.GetLang("[RoleService]", " ", "roleservice response", ": "), util.ColorLightGreen)
				util.LogDetail(data.ToString())
			}
		}
		return responses, nil
	}
	return nil, fmt.Errorf("no handler found for method: %s", method)
}
