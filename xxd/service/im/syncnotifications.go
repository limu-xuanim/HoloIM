package im

import (
	"encoding/json"
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

// SyncNotificationsRequest 同步通知请求结构
type SyncNotificationsRequest struct {
	Offline  []int64            `json:"offline"`
	Sendfail map[int64][]string `json:"sendfail"`
}

// SyncNotificationsResponse 同步通知响应结构
type SyncNotificationsResponse struct {
	Result  string                          `json:"result"`
	Message string                          `json:"message,omitempty"`
	Data    map[int64][]model.NotifyMessage `json:"data,omitempty"`
}

func (i *ImService) ReportAndGetNotify(serverName string, language string) (map[int64][]byte, error) {
	// 从SQLite获取发送失败的数据
	sendFail, err := util.DBSelectSendfail(serverName)
	if err != nil {
		return nil, err
	}

	// 转换sendFail类型从map[int][]string到map[int32][]string
	sendFailConverted := make(map[int64][]string)
	for userID, gids := range sendFail {
		sendFailConverted[int64(userID)] = gids
	}

	notifyData, err := i.syncNotifications(nil, sendFailConverted)
	if err != nil {
		util.Log("error", util.GetLang("[Notifications]", " ", "notification service error: %v"), err)
		return nil, err
	}

	messageList := make(map[int64][]byte)
	for userID, messages := range notifyData {
		if len(messages) > 0 {
			response := map[string]any{
				"module": "im",
				"method": "syncnotifications",
				"data":   model.ConvertNotifyMessagesSlice(messages),
				"result": api.ResultSuccess,
			}

			parseData := api.NewParseData()
			jsonData, err := json.Marshal(response)
			if err != nil {
				util.Log("error", util.GetLang("[ReportAndGetNotify]", " ", "marshal error", ": %v"), err)
				continue
			}
			parseData.JSON = jsonData
			messageList[int64(userID)] = api.UnparseData(parseData, util.Token)
		}
	}

	// 清理SQLite中的发送失败数据
	go util.DBDeleteSendfail(serverName, sendFail)

	return messageList, nil
}

func (i *ImService) syncNotifications(offline []int64, sendfail map[int64][]string) (map[int64][]model.NotifyMessage, error) {
	// 处理离线用户
	if len(offline) > 0 {
		var userModel model.User
		err := userModel.SetOffline(i.db, offline)
		if err != nil {
			return nil, fmt.Errorf("set user offline failed: %v", err)
		}
	}

	// 处理发送失败的消息
	if len(sendfail) > 0 {
		var messageModel model.XxbImMessage
		err := messageModel.SendFailures(i.db, sendfail)
		if err != nil {
			return nil, fmt.Errorf("handle send fail failed: %v", err)
		}
	}

	// 获取通知列表
	var messageModel model.XxbImMessage
	notifyData, err := messageModel.GetNotifyList(i.db)
	if err != nil {
		return nil, fmt.Errorf("get notification list failed: %v", err)
	}

	return notifyData, nil
}
