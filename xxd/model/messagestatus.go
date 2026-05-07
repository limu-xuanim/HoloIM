package model

import (
	"fmt"
	"strings"
	"xxd/util"

	"gorm.io/gorm"
)

var messageSelectColumns = []string{
	"`id`",
	"`gid`",
	"`cgid`",
	"`user`",
	"`date`",
	"`index`",
	"`type`",
	"`content`",
	"`contentType`",
	"`data`",
	"`read`",
	"`deleted`",
}

var messageSelectClause = strings.Join(messageSelectColumns, ", ")

type XxbImMessageStatus struct {
	User    int64  `gorm:"column:user;not null;default:0" json:"user"`                                                            // 用户ID
	Message int64  `gorm:"column:message;not null" json:"message"`                                                                // 消息ID
	Status  string `gorm:"column:status;type:enum('waiting','sent','readed','deleted');not null;default:'waiting'" json:"status"` // 消息状态
}

// TableName 返回表名
func (*XxbImMessageStatus) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_messagestatus"
}

// retrieves offline messages for a user
func (*XxbImMessageStatus) GetOfflineList(db *gorm.DB, full bool, userID int64) ([]XxbImMessage, error) {
	var messageIDs []int64

	// 获取待处理消息的 ID
	err := db.Model(&XxbImMessageStatus{}).
		Select("message").
		Where("user = ? AND status = ?", userID, "waiting").
		Pluck("message", &messageIDs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get message status: %v", err)
	}
	if len(messageIDs) == 0 {
		return []XxbImMessage{}, nil
	}

	if !full {
		var firstRecordID int64
		// 获取最小的记录 ID
		err = db.Table((&XxbImMessage{}).TableName()).
			Select("MIN(id)").
			Scan(&firstRecordID).Error
		if err != nil {
			return nil, fmt.Errorf("failed to get first record ID: %v", err)
		}

		// 过滤消息 ID
		filteredIDs := make([]int64, 0, len(messageIDs))
		for _, id := range messageIDs {
			if id >= firstRecordID {
				filteredIDs = append(filteredIDs, id)
			}
		}
		messageIDs = filteredIDs

		if len(messageIDs) == 0 {
			return []XxbImMessage{}, nil
		}
	}

	var imMessage XxbImMessage
	// 获取消息列表
	messages, err := imMessage.GetList(db, "", messageIDs, nil, "", "!notify", false, false, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get message list: %v", err)
	}

	idsToDelete := make([]int64, len(messages))
	for i, msg := range messages {
		idsToDelete[i] = msg.ID
	}

	if len(idsToDelete) > 0 {
		err = db.Table((&XxbImMessageStatus{}).TableName()).
			Where("user = ? AND message IN ?", userID, idsToDelete).
			Delete(&XxbImMessageStatus{}).Error
		if err != nil {
			return nil, fmt.Errorf("failed to delete message status: %v", err)
		}
	}
	return messages, nil
}

func (i *XxbImMessageStatus) GetMissedByLastKnown(db *gorm.DB, userID, lastKnownMessage int64) ([]XxbImMessage, error) {
	var missedMessageChats []XxbImChatUser
	err := db.Table((&XxbImChatUser{}).TableName()).Select("cgid, lastReadMessage").
		Where("user = ? AND lastReadMessage > ?", userID, lastKnownMessage).
		Find(&missedMessageChats).Error
	if err != nil {
		return nil, err
	}
	var messageIDs []int64
	for _, chatUserInfo := range missedMessageChats {
		chatMessageIDs := i.GetListAroundIDForUser(db, chatUserInfo.CGid, chatUserInfo.LastReadMessage, true, 5, userID)
		for _, chatMessageID := range chatMessageIDs {
			messageIDs = append(messageIDs, chatMessageID.ID)
		}
	}
	var unreadIDs []int64
	err = db.Table((&XxbImMessageStatus{}).TableName()).
		Where("user = ? AND status = ?", userID, "waiting").
		Pluck("message", &unreadIDs).Error
	if err != nil {
		fmt.Printf("Failed to get unread message IDs: %v\n", err)
		return nil, err
	}

	missedIDs := util.ArrayDiff(messageIDs, unreadIDs)

	if len(missedIDs) == 0 {
		return []XxbImMessage{}, nil
	}
	// int to int64
	missedIDs64 := make([]int64, len(missedIDs))
	for i, id := range missedIDs {
		missedIDs64[i] = int64(id)
	}
	var imMessage XxbImMessage
	return imMessage.GetList(db, "", missedIDs64, nil, "", "", false, false, nil)
}

func (*XxbImMessageStatus) GetListAroundIDForUser(db *gorm.DB, cgid string, fromID int64, reverse bool, limit int, userID int64) []XxbImMessage {
	if fromID == 0 && reverse {
		fromID = int64(^uint(0) >> 1)
	}
	var imChat XxbImChat
	var imMessageIndex MessageIndex
	chats := []string{cgid}
	if cgid == "" {
		chats, _ = imChat.GetGidListByUserID(db, userID, true)
	}

	tables, err := imMessageIndex.GetTablesByChats(db, chats)
	if err != nil {
		return nil
	}

	var filteredTables []MessageIndex
	if len(tables) > 0 {
		query := db.Table((&MessageIndex{}).TableName()).Select("tableName").
			Where("tableName IN ?", tables)
		if reverse {
			query = query.Where("start <= ?", fromID)
		} else {
			query = query.Where("end >= ?", fromID)
		}
		err = query.Find(&filteredTables).Error
		if err != nil {
			fmt.Printf("Failed to get filtered tables: %v\n", err)
			return nil
		}
	}
	// 添加默认表
	filteredTables = append(filteredTables, MessageIndex{Tablename: (&XxbImMessage{}).TableName()})

	var subQueries []string
	for _, table := range filteredTables {
		query := db.Table(table.Tablename).Select(messageSelectClause).
			Where("cgid IN ?", chats)
		if reverse {
			query = query.Where("id <= ?", fromID)
		} else {
			query = query.Where("id >= ?", fromID)
		}
		query = query.Session(&gorm.Session{DryRun: true}).Find(nil)
		sqlStr := db.Dialector.Explain(query.Statement.SQL.String(), query.Statement.Vars...)
		subQueries = append(subQueries, sqlStr)
	}

	var unionQuery string
	if len(subQueries) > 0 {
		unionQuery = strings.Join(subQueries, " UNION ALL ")
	} else {
		unionQuery = "SELECT * FROM " + (&XxbImMessage{}).TableName() + " WHERE 1 = 0" // 避免空查询
	}

	orderClause := "ORDER BY id"
	if reverse {
		orderClause += " DESC"
	}

	if limit <= 0 {
		limit = 50
	}

	finalQuery := "SELECT * FROM (" + unionQuery + ") AS t " + orderClause + " LIMIT ?"

	var messages []XxbImMessage
	err = db.Raw(finalQuery, limit).Find(&messages).Error
	if err != nil {
		fmt.Printf("Failed to get messages: %v\n", err)
		return nil
	}
	return messages
}

func GetNotifyByUserID(db *gorm.DB, userID int64) ([]NotifyMessage, error) {
	var messageIDs []int64
	err := db.Model(&XxbImMessageStatus{}).
		Where("user = ?", userID).
		Where("status = ?", "waiting").
		Pluck("message", &messageIDs).
		Error
	if err != nil {
		return nil, err
	}
	if len(messageIDs) == 0 {
		return []NotifyMessage{}, nil
	}
	imMessage := &XxbImMessage{}
	messages, err := imMessage.GetList(db, "", messageIDs, nil, "", "notify", false, false, nil)
	if err != nil {
		return nil, err
	}
	if len(messages) == 0 {
		return []NotifyMessage{}, nil
	}
	notifyMessages := imMessage.formatNotifyMessages(messages)

	messageIDs = []int64{}
	for _, msg := range notifyMessages {
		messageIDs = append(messageIDs, msg.ID)
	}

	err = db.Where("message IN ?", messages).
		Where("user = ?", userID).
		Delete(&XxbImMessageStatus{}).
		Error

	return notifyMessages, err
}
