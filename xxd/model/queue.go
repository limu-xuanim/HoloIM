package model

import (
	"encoding/json"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

// ImQueue 消息队列模型
type ImQueue struct {
	ID          int64      `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Type        string     `gorm:"column:type;size:30;not null" json:"type"`
	Content     string     `gorm:"column:content;type:text;not null" json:"content"`
	AddDate     time.Time  `gorm:"column:addDate;not null" json:"addDate"`
	ProcessDate *time.Time `gorm:"column:processDate" json:"processDate"`
	Result      string     `gorm:"column:result;type:text" json:"result"`
	Status      string     `gorm:"column:status;size:30;not null" json:"status"`
}

// TableName 指定表名
func (ImQueue) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_queue"
}

// PushMessageContent 推送消息内容结构
type PushMessageContent struct {
	Sender    string `json:"sender"`
	Receivers string `json:"receivers"`
	Cgid      string `json:"cgid"`
}

// SavePushMessageToQueue 保存推送消息到队列
func SavePushMessageToQueue(db *gorm.DB, message XxbImMessage, offlineUsers []int64, chat *XxbImChat) error {
	if len(offlineUsers) == 0 {
		return nil
	}

	// 获取离线用户的设备信息
	userDeviceInfoList, err := GetDeviceInfo(db, offlineUsers)
	if err != nil {
		return err
	}

	// 过滤掉没有设备信息的用户
	var validReceivers []int64
	for _, userID := range offlineUsers {
		if deviceInfo, ok := userDeviceInfoList[userID]; ok {
			if deviceInfo.DeviceType != "" && deviceInfo.DeviceToken != "" {
				validReceivers = append(validReceivers, userID)
			}
		}
	}

	if len(validReceivers) == 0 {
		return nil
	}

	// 构造消息内容
	content := PushMessageContent{
		Sender:    message.User,
		Receivers: util.Int64SliceToString(validReceivers),
		Cgid:      message.CgId,
	}

	contentJSON, err := json.Marshal(content)
	if err != nil {
		return err
	}

	// 创建队列数据
	queueData := ImQueue{
		Type:    "push",
		Content: string(contentJSON),
		AddDate: time.Now(),
		Result:  "",
		Status:  "wait",
	}

	return db.Create(&queueData).Error
}

// GetDeviceInfo 获取用户的设备信息
func GetDeviceInfo(db *gorm.DB, userIDs []int64) (map[int64]*User, error) {
	var users []User
	err := db.Select("id, clientStatus, deviceToken, deviceType").
		Where("id IN ?", userIDs).
		Find(&users).Error

	if err != nil {
		return nil, err
	}

	userMap := make(map[int64]*User)
	for i := range users {
		userMap[users[i].ID] = &users[i]
	}

	return userMap, nil
}

// GetPushList 获取待推送的消息列表
func GetPushList(db *gorm.DB) ([]ImQueue, error) {
	var pushList []ImQueue
	err := db.Where("type = ? AND status = ?", "push", "wait").
		Find(&pushList).Error

	if err != nil {
		return nil, err
	}

	if len(pushList) == 0 {
		return pushList, nil
	}

	// 将获取到的队列状态更新为 doing
	ids := make([]int64, len(pushList))
	for i, item := range pushList {
		ids[i] = item.ID
	}

	err = ChangeQueueStatus(db, ids, "doing")
	if err != nil {
		return nil, err
	}

	return pushList, nil
}

// ChangeQueueStatus 更新队列状态
func ChangeQueueStatus(db *gorm.DB, queueIDs []int64, status string) error {
	updateData := map[string]interface{}{
		"status": status,
	}

	// 如果状态是 done，更新处理时间
	if status == "done" {
		now := time.Now()
		updateData["processDate"] = &now
	}

	return db.Model(&ImQueue{}).
		Where("id IN ?", queueIDs).
		Updates(updateData).Error
}
