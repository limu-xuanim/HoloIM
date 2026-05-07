package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"xxd/lang"
	"xxd/util"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (u *XxbImMessage) ToMap() (map[string]any, error) {
	if u == nil {
		return nil, fmt.Errorf("message is nil")
	}

	jsonBytes, err := json.Marshal(u)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		return nil, err
	}

	// 将所有的time字段转为时间戳
	result["date"] = ConvertDateToInt(&u.Date)

	// 判断user字段是否为字符串类型的数字，如果是，那么转为数字
	if userNum, err := strconv.ParseInt(u.User, 10, 64); err == nil {
		result["user"] = userNum
	}

	return result, err
}

// SafeCreateMessage 使用显式行锁创建消息
// 通过 SELECT FOR UPDATE 显式加锁，确保整个流程的原子性
func SafeCreateMessage(db *gorm.DB, message *XxbImMessage) (int64, int64, error) {
	var nextIndex, messageID int64

	// 使用事务确保所有操作在同一连接中，锁在事务提交时自动释放
	err := db.Transaction(func(tx *gorm.DB) error {
		// 对 cgid = chat1 的数据进行行级锁（SELECT FOR UPDATE）
		var chatInfo XxbImChat
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("gid = ?", message.CgId).
			First(&chatInfo).Error

		if errors.Is(err, gorm.ErrRecordNotFound) && strings.Contains(message.CgId, "&xuanbot") {
			var botChat *XxbImChat
			userIdStr := strings.Split(message.CgId, "&")[0]
			userId, _ := strconv.ParseInt(userIdStr, 10, 64)
			botChat, _, err = botChat.Create(tx, fmt.Sprintf("%d&xuanbot", userId), lang.Get("service.common.xuanbot"), "bot", []int64{userId}, 0, false, userId)
			if err != nil {
				return fmt.Errorf("create bot chat error: %s", err.Error())
			}

			var imMessage XxbImMessage
			imMessage.CreateXuanbotWelcomeNotify(tx, userId)
			if err != nil {
				return fmt.Errorf("xuanbot chat create failed: gid=%s", message.CgId)
			}

			err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("gid = ?", message.CgId).
				First(&chatInfo).Error
		}

		// 检查 chat 是否存在
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("chat not found: gid=%s", message.CgId)
		}
		if err != nil {
			return fmt.Errorf("failed to lock chat row: %w", err)
		}

		// Chat 存在且已锁定，继续执行后续操作
		// 计算本次消息的 index（在锁保护下，chatInfo.LastMessageIndex 是当前一致视图）
		nextIndex = chatInfo.LastMessageIndex + 1

		// 读取 cgid = chat1 的 lastMessageIndex，进行 im_message 表的插入
		message.Index = nextIndex

		// 插入消息
		err = tx.Model(&XxbImMessage{}).Create(&message).Error
		if err != nil {
			return fmt.Errorf("failed to insert message: %w", err)
		}

		messageID = message.ID

		// 获取 im_message 新插入的数据 id，更新 im_chat 的 lastMessage
		now := time.Now()
		err = tx.Model(&XxbImChat{}).
			Where("gid = ?", message.CgId).
			Updates(map[string]interface{}{
				"lastActiveTime":   now,
				"lastMessage":      messageID,
				"lastMessageIndex": nextIndex,
			}).Error

		if err != nil {
			return fmt.Errorf("failed to update chat lastMessage: %w", err)
		}

		return nil
	})

	if err != nil {
		return 0, 0, err
	}

	util.InvalidateChatCache(message.CgId)

	return nextIndex, messageID, nil
}

// formatNotifyMessages 格式化通知消息
func (i *XxbImMessage) formatNotifyMessages(messages []XxbImMessage) []NotifyMessage {
	var notifications []NotifyMessage

	for _, msg := range messages {
		var messageData map[string]any
		if msg.Data != "" {
			json.Unmarshal([]byte(msg.Data), &messageData)
		}

		notification := NotifyMessage{
			ID:      msg.ID,
			GID:     msg.Gid,
			CGID:    msg.CgId,
			Type:    msg.Type,
			Content: msg.Content,
			Date:    int64(ConvertDateToInt(&msg.Date)),
		}

		// 处理 ContentType 类型断言
		notification.ContentType = msg.ContentType

		if messageData != nil {
			if title, ok := messageData["title"].(string); ok {
				notification.Title = title
			}
			if subtitle, ok := messageData["subtitle"].(string); ok {
				notification.Subtitle = subtitle
			}
			if url, ok := messageData["url"].(string); ok {
				notification.URL = url
			}
			if actions, ok := messageData["actions"]; ok {
				notification.Actions = actions
			}
			if sender, ok := messageData["sender"]; ok {
				notification.Sender = sender
			}
			if target, ok := messageData["target"].([]any); ok {
				var users []int64
				for _, t := range target {
					if userID, ok := t.(float64); ok {
						users = append(users, int64(userID))
					}
				}
				notification.Users = users
			}
		}

		// 如果不是notification聊天并且有索引，设置索引
		if notification.CGID != "notification" && msg.Index > 0 {
			index := int64(msg.Index)
			notification.Index = &index
		}

		notifications = append(notifications, notification)
	}

	return notifications
}

// 该方法所传入消息的 content contentType data 字段需要自行设置
func (m *XxbImMessage) CreateXuanBotMessage(db *gorm.DB, message *XxbImMessage, userId int64) error {
	if message == nil {
		return fmt.Errorf("message is nil")
	}

	message.Gid = util.CreateGID()
	message.CgId = fmt.Sprintf("%d&xuanbot", userId)
	message.User = "xuanbot"
	message.Deleted = "0"
	message.Date = time.Now()
	message.Type = "notify"

	chatMessages, err := m.Create(db, []XxbImMessage{*message})
	if err != nil {
		return err
	}

	if len(chatMessages) == 0 {
		return fmt.Errorf("failed to create message")
	}

	return SaveStatus(db, []int64{userId}, chatMessages[0].ID, "waiting")
}

func (i *XxbImMessage) CreateChatNotify(db *gorm.DB, cgid string, title string, subtitle string, content string, contentType string, url string, actions []any, sender Sender) error {
	var imChat XxbImChat
	var imChatUser XxbImChatUser
	userIDs := []int64{}
	chatInfo, err := imChat.GetChatByGid(db, cgid)
	if err != nil {
		return fmt.Errorf("get chat info error: %s", err.Error())
	}
	userIDs, _ = imChatUser.GetMembers(db, chatInfo)

	info := map[string]any{
		"title":    title,
		"subtitle": subtitle,
		"url":      url,
		"actions":  actions,
		"sender":   sender,
		"target":   userIDs,
	}

	infoBytes, err := json.Marshal(info)
	if err != nil {
		return fmt.Errorf("marshal info error: %s", err.Error())
	}

	notify := XxbImMessage{
		Gid:         util.CreateGID(),
		CgId:        cgid,
		User:        "xuanbot",
		Date:        time.Now(),
		Type:        "notify",
		Content:     content,
		ContentType: contentType,
		Data:        string(infoBytes),
		Deleted:     "0",
	}

	chatMessages, err := i.Create(db, []XxbImMessage{notify})
	if err != nil {
		return err
	}

	if len(chatMessages) == 0 {
		return fmt.Errorf("failed to create message")
	}

	return SaveStatus(db, userIDs, chatMessages[0].ID, "waiting")
}
