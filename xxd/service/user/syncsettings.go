package user

import (
	"encoding/json"
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type SyncSettingsRequest struct {
	Account  string `json:"account"`
	Settings any    `json:"settings"`
}

func (r *SyncSettingsRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("syncsettings invalid params")
	}
	var err error
	r.Account, err = util.AnyToString(data[0])
	if err != nil {
		return err
	}

	r.Settings = data[1]
	return nil
}

// 同步用户的设置信息
func (u *UserService) SyncSettings(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SyncSettingsRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	userInfo, err := user.GetAccountByID(u.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	// 若 account 为空，从数据库中获取当前用户的账户信息
	if params.Account == "" {
		params.Account = userInfo.Account
	}
	// 获取用户的设置信息
	settingValue := model.GetItem(u.db, fmt.Sprintf("owner=system&module=chat&section=settings&key=%s", params.Account), "config")
	userSettingMap := make(map[string]any)
	_ = json.Unmarshal([]byte(settingValue), &userSettingMap)

	settingObj := map[string]any{}

	switch s := params.Settings.(type) {
	case map[string]any:
		// 上传指定 settings（合并写回）
		updateMap := mergeMaps(userSettingMap, s)
		updateJsonData, err := json.Marshal(updateMap)
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		_, err = model.SetItem(u.db, fmt.Sprintf("system.chat.settings.%s", params.Account), string(updateJsonData), "config")
		if err != nil {
			return api.FailResponse(xxbResponse, err)
		}
		userSettingMap = updateMap
		settingObj = updateMap
	case []any:
		// 下载指定 keys 的子集
		for _, k := range s {
			if key, ok := k.(string); ok {
				if v, exists := userSettingMap[key]; exists {
					settingObj[key] = v
				} else {
					delete(settingObj, key)
				}
			}
		}
	default:
		// 处理 reset/hash/下载全部
		isReset := model.GetItem(u.db, fmt.Sprintf("owner=%s&module=user&section=clientSettings&key=reset", params.Account), "config")
		hash, hashOk := params.Settings.(string)

		if isReset != "" {
			// 用户设置被重置
			userSettingMap["hash"] = ""
			userSettingMap["reset"] = true
			userSettingMap["isReset"] = isReset
			// 删除系统侧 chat settings 以及用户侧 reset 标记
			model.DeleteItem(u.db, fmt.Sprintf("owner=system&module=chat&section=settings&key=%s", params.Account), "config")
			model.DeleteItem(u.db, fmt.Sprintf("owner=%s&module=user&section=clientSettings&key=reset", params.Account), "config")
		} else if v, ok := userSettingMap["hash"]; hashOk && ok && v == hash {
			settingObj["hash"] = userSettingMap["hash"]
		} else {
			settingObj = userSettingMap
		}
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []int64{userId},
		"data":   settingObj,
	}
	successResponse, err := api.Format(xxbResponse, response, "usersyncsettingsResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
