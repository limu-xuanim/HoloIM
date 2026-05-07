package message

import (
	"xxd/api"
	"xxd/model"
)

func (m *MessageService) GetNotification(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) ([]api.XxbResponse, error) {
	notifications, err := model.GetNotifyByUserID(m.db, userId)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	notificationMaps := []map[string]any{}
	for _, msg := range notifications {
		notificationMaps = append(notificationMaps, msg.ToMap())
	}

	response := map[string]any{
		"result": "success",
		"data":   notificationMaps,
		"method": "syncnotifications",
		"users":  []int64{userId},
	}
	successResponse, err := api.Format(xxbResponse, response, "syncnotificationsResponse")
	return []api.XxbResponse{successResponse}, err
}
