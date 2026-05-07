package im

import (
	"encoding/json"
	"xxd/api"
	"xxd/model"
	"xxd/service/sys"
	"xxd/util"
)

// SyncUsers 检查用户变更并更新拼音索引
func (u *ImService) SyncUsers(serverName, language string) (map[int64][]byte, error) {
	// 更新最后轮询时间
	sysService := sys.NewSysService()
	sysService.UpdateLastPoll()

	var user model.User

	// 获取有变更的用户
	changedUsers, err := user.HasChanges(u.db, 60) // 默认60秒轮询间隔
	if err != nil {
		util.Log("error", "Failed to get user changes: %s", err.Error())
		return nil, err
	}

	var userUpdates map[int64][]byte = make(map[int64][]byte)

	if len(changedUsers) > 0 {
		// 重新生成拼音索引
		err = user.ReindexPinyin(u.db, changedUsers)
		if err != nil {
			util.Log("error", "Failed to reindex pinyin: %s", err.Error())
			return nil, err
		}

		// 获取变更用户的详细信息
		var userIDs []int64
		for _, id := range changedUsers {
			userIDs = append(userIDs, id)
		}

		userList, err := user.GetUserInfoByUserIds(u.db, userIDs, false)
		if err != nil {
			util.Log("error", "Failed to get user list: %s", err.Error())
			return nil, err
		}

		for _, userInfo := range userList {

			userMap, _ := userInfo.ToMap()
			userSlice := api.ConvertArrayBySchema("member", userMap)

			// 构建响应JSON
			responseData := map[string]any{
				"result": "success",
				"data":   []any{userSlice},
			}

			jsonData, err := json.Marshal(responseData)
			if err != nil {
				util.Log("error", "Failed to marshal user data: %s", err.Error())
				continue
			}

			userUpdates[int64(userInfo.ID)] = jsonData
		}
	}

	return userUpdates, nil
}
