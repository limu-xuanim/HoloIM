package model

import (
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"xxd/api"
	"xxd/lang"
	"xxd/util"

	"encoding/json"

	"github.com/davecgh/go-spew/spew"
	"github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// 消息索引表缓存
var (
	messageIndexCache     []MessageIndex
	messageIndexCacheLock sync.RWMutex // 使用读写锁，读多写少的场景
	messageIndexCacheInit bool         // 标记是否已初始化
)

// InitMessageIndexCache 在程序启动时初始化消息索引缓存
func InitMessageIndexCache(db *gorm.DB) error {
	messageIndexCacheLock.Lock()
	defer messageIndexCacheLock.Unlock()

	var indices []MessageIndex
	if err := db.Table((&MessageIndex{}).TableName()).
		Select("tableName, start, end").
		Find(&indices).Error; err != nil {
		return err
	}

	messageIndexCache = indices
	messageIndexCacheInit = true
	util.Log("info", "Message index cache initialized with %d entries", len(indices))
	return nil
}

// getMessageIndices 获取消息索引（从缓存）
func getMessageIndices() []MessageIndex {
	messageIndexCacheLock.RLock()
	defer messageIndexCacheLock.RUnlock()

	// 如果未初始化，返回空切片（不应该发生，但作为保护）
	if !messageIndexCacheInit {
		util.Log("warning", "Message index cache not initialized, returning empty")
		return []MessageIndex{}
	}

	// 返回缓存副本
	cached := make([]MessageIndex, len(messageIndexCache))
	copy(cached, messageIndexCache)
	return cached
}

// InvalidateMessageIndexCache 手动失效并重新加载消息索引缓存（供分表操作后调用）
func InvalidateMessageIndexCache(db *gorm.DB) {
	messageIndexCacheLock.Lock()
	defer messageIndexCacheLock.Unlock()

	var indices []MessageIndex
	if err := db.Table((&MessageIndex{}).TableName()).
		Select("tableName, start, end").
		Find(&indices).Error; err != nil {
		util.Log("error", "Failed to reload message index cache: %v", err)
		return
	}

	messageIndexCache = indices
	util.Log("info", "Message index cache reloaded with %d entries after partition", len(indices))
}

// 结构体定义
type XxbImMessage struct {
	ID          int64     `json:"id" gorm:"column:id;primary_key;auto_increment;type:int(11) unsigned;not null"`
	Gid         string    `json:"gid" gorm:"column:gid;type:char(40);not null;default:'';index:idx_mgid"`
	CgId        string    `json:"cgid" gorm:"column:cgid;type:char(40);not null;default:'';index:idx_mcgid"`
	User        string    `json:"user" gorm:"column:user;type:varchar(30);not null;default:'';index:idx_muser"`
	Date        time.Time `json:"date" gorm:"column:date;type:datetime;not null"`
	Index       int64     `json:"index" gorm:"column:index;type:int(11) unsigned;not null;default:0"`
	Type        string    `json:"type" gorm:"column:type;type:enum('normal','broadcast','notify','bulletin','botcommand');not null;default:'normal';index:idx_mtype"`
	Content     string    `json:"content" gorm:"column:content;type:text"`
	ContentType string    `json:"contentType" gorm:"column:contentType;type:enum('text','plain','emotion','image','file','object','code','merge','voice');not null;default:'text'"`
	Data        string    `json:"data" gorm:"column:data;type:text"`
	Read        *string   `json:"read" gorm:"column:read;type:text"`
	Deleted     string    `json:"deleted" gorm:"column:deleted;type:enum('0','1');not null;default:'0'"`
}

func ParseMessage(message any) XxbImMessage {
	// 先处理 date 字段
	if m, ok := message.(map[string]any); ok {
		if v, ok := m["date"].(float64); ok {
			m["date"] = time.Unix(int64(v), 0)
		}
		if v, ok := m["deleted"].(bool); ok {
			// convert v from bool to string true => "1" false => "0"
			m["deleted"] = "0"
			if v {
				m["deleted"] = "1"
			}
		}
		// 将message中的user字段从float64转为string
		if userNum, ok := m["user"].(float64); ok {
			m["user"] = strconv.FormatInt(int64(userNum), 10)
		}
		message = m
	}

	jsonBytes, err := json.Marshal(message)
	if err != nil {
		util.Log("error", fmt.Sprintf("ParseMessage marshal error: %v", err))
		return XxbImMessage{}
	}
	var msg XxbImMessage
	err = json.Unmarshal(jsonBytes, &msg)
	if err != nil {
		util.LogDetail(fmt.Sprintf("message: %v", spew.Sdump(message)))
		util.Log("error", fmt.Sprintf("ParseMessage unmarshal error: %v", err))
		return XxbImMessage{}
	}
	return msg
}

// TableName 表名称
func (*XxbImMessage) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_message"
}

func ConvertMessageSlice(messages []XxbImMessage) []any {
	messageSlice := []any{}
	for _, messageInfo := range messages {
		messageMap, _ := messageInfo.ToMap()
		messageSlice = append(messageSlice, messageMap)
	}

	return messageSlice
}

// 获取最后一个消息
func (i *XxbImMessage) GetLastMessage(db *gorm.DB, cgId string, id int64) (*XxbImMessage, error) {
	messages, err := i.GetList(db, cgId, []int64{id}, nil, "", "", false, false, nil)
	if err != nil {
		return nil, err
	}
	if len(messages) == 0 {
		return nil, nil
	}
	return &messages[0], nil
}

func (i *XxbImMessage) GetLastMessageList(db *gorm.DB, cgIds []string, messageIDs []int64) (messages []XxbImMessage, err error) {
	if len(cgIds) == 0 || len(messageIDs) == 0 {
		return []XxbImMessage{}, nil
	}

	// 过滤掉 ID 为 0 的消息
	validIDs := make([]int64, 0, len(messageIDs))
	for _, id := range messageIDs {
		if id > 0 {
			validIDs = append(validIDs, id)
		}
	}

	if len(validIDs) == 0 {
		return []XxbImMessage{}, nil
	}

	// 使用 GetTableByMessages 确定每个ID在哪个表
	tables := GetTableByMessages(db, validIDs)
	if len(tables) == 0 {
		return []XxbImMessage{}, nil
	}

	// 构建 UNION ALL 查询
	var subQueries []string
	for _, table := range tables {
		if len(table.Messages) == 0 {
			continue
		}

		query := db.Table(table.TableName).Select("*").Where("id IN ?", table.Messages)
		query = query.Session(&gorm.Session{DryRun: true}).Find(nil)
		sqlStr := db.Dialector.Explain(query.Statement.SQL.String(), query.Statement.Vars...)
		subQueries = append(subQueries, sqlStr)
	}

	if len(subQueries) == 0 {
		return []XxbImMessage{}, nil
	}

	// 执行 UNION ALL 查询
	unionQuery := strings.Join(subQueries, " UNION ALL ")
	err = db.Table("(" + unionQuery + ") as t").Find(&messages).Error
	return messages, err
}

func (i *XxbImMessage) GetMembersLastMessage(db *gorm.DB, cgId string, members []int64) (map[int64]time.Time, error) {
	var lastMessageDates []struct {
		User int64     `json:"id"`
		Date time.Time `json:"date"`
	}

	err := db.Table(i.TableName()).
		Where("cgid = ? and deleted = '0' and user in ?", cgId, members).
		Select("user, max(date) as date").
		Group("user").Find(&lastMessageDates).Error
	if err != nil {
		return nil, err
	}

	mapLastMessageDates := map[int64]time.Time{}
	for _, lastMessageDate := range lastMessageDates {
		mapLastMessageDates[lastMessageDate.User] = lastMessageDate.Date
	}

	return mapLastMessageDates, nil
}

// 根据gid获取消息详情
func (i *XxbImMessage) GetMessageByGid(db *gorm.DB, gid string) (messages XxbImMessage, err error) {
	err = db.Table(i.TableName()).Where("gid = ?", gid).First(&messages).Error
	if err != nil {
		return messages, err
	}
	return messages, err
}

// 根据 id 获取消息详情
func (i *XxbImMessage) GetMessageById(db *gorm.DB, id int64) (message XxbImMessage, err error) {
	err = db.Table(i.TableName()).Where("id = ?", id).First(&message).Error
	if err != nil {
		return
	}
	return
}

// 根据ids获取消息详情
func (i *XxbImMessage) GetMessageByIds(db *gorm.DB, ids []int64) (messages []XxbImMessage, err error) {
	err = db.Table(i.TableName()).Where("id in (?)", ids).Find(&messages).Error
	if err != nil {
		return
	}
	return
}

func (i *XxbImMessage) GetMessageByIndex(db *gorm.DB, index int64, cgId string) (message XxbImMessage, err error) {
	err = db.Table(i.TableName()).Where("`index` = ? and cgid = ? and deleted = '0'", index, cgId).Find(&message).Error
	if err != nil {
		return
	}
	return
}

//	Create output of broadcast.
//
// setReminders  if true, send members and userID as property "reminders" in $message->data.
func (i *XxbImMessage) MessageCreateBroadcast(db *gorm.DB, parseData api.XxbResponse, typeBroadcast string, chat *XxbImChat, onlineUsers []int64, userId int64, members []int64, setReminders bool) (responseList []api.XxbResponse, err error) {
	xxbResponse := api.NewXxbResponse(parseData)
	var adminUsers []string
	var user User
	broadcastMessage := XxbImMessage{
		Gid:         uuid.New().String(),
		CgId:        chat.Gid,
		Type:        "broadcast",
		ContentType: "text",
		Content:     i.GetBroadcastContent(db, typeBroadcast, chat, userId, members),
		Date:        time.Now(),
		User:        strconv.FormatInt(userId, 10),
	}
	if setReminders {
		membersData := append(members, userId)
		broadcastMessageData := map[string]any{"reminders": membersData}
		broadcastMessage.Data = util.JsonEncode(broadcastMessageData)
	}

	/* If quit a chat, only send broadcast to the admins or the created user of chat. */
	if typeBroadcast == "leaveChat" {
		if chat.Admins != "" {
			adminUsers = strings.Split(strings.Trim(chat.Admins, ","), ",")

		}
		if len(adminUsers) == 0 {
			createdByUser, _ := user.GetUserByAccount(db, chat.CreatedBy)
			if createdByUser.ID != 0 {
				adminUsers = []string{strconv.FormatInt(createdByUser.ID, 10)}
			}
		}
		adminUsersInt := util.StringSliceToInt64Slice(adminUsers)
		adminOnlineUsersInt := user.GetOnlineUsers(db, adminUsersInt)
		onlineUsers = append(onlineUsers, adminOnlineUsersInt...)
	}

	/* Save broadcast to im_message. */
	createMessage, err := i.Create(db, []XxbImMessage{broadcastMessage})
	if err != nil {
		return nil, fmt.Errorf("Create broadcast message failed: %v", err)
	}
	var chatUser XxbImChatUser
	chatMembers, _ := chatUser.GetMembers(db, chat)
	offlineUsers, _ := user.GetListByStatus(db, "offline", chatMembers)
	var userIds []int64
	for _, userInfo := range offlineUsers {
		userIds = append(userIds, int64(userInfo.ID))
	}
	err = i.SaveOfflineList(db, createMessage, userIds)
	if err != nil {
		return nil, fmt.Errorf("save offline list failed: %v", err)
	}

	response := map[string]any{
		"result": api.ResultSuccess,
		"method": "messagesend",
		"module": "",
		"users":  onlineUsers,
		"data":   ConvertMessageSlice(createMessage),
	}
	successResponse, err := api.Format(xxbResponse, response, "messagesendResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}

func (i *XxbImMessage) Create(db *gorm.DB, messageList []XxbImMessage) ([]XxbImMessage, error) {
	var idList []int64
	now := time.Now()

	for _, messageInfo := range messageList {
		var msg XxbImMessage
		if err := db.Table(msg.TableName()).Where("gid = ?", messageInfo.Gid).First(&msg).Error; err == nil {
			if msg.ContentType == "image" || msg.ContentType == "file" {
				err := db.Model(&msg).Update("content", messageInfo.Content).Error
				if err != nil {
					return nil, err
				}
			}
			idList = append(idList, msg.ID)
		} else {
			messageInfo.Date = now
			if messageInfo.User == "" {
				return nil, fmt.Errorf("message user is empty")
			}
			if messageInfo.Deleted == "" {
				messageInfo.Deleted = "0"
			}
			// SafeCreateMessage 会原子地处理 index 分配和消息插入
			// 同时会自动更新 im_chat 的 lastMessageIndex, lastMessage, lastActiveTime
			var messageID int64
			messageInfo.Index, messageID, err = SafeCreateMessage(db, &messageInfo)
			if err != nil {
				return nil, err
			}
			if messageInfo.Index == 0 || messageID == 0 {
				continue
			}

			idList = append(idList, messageID)
		}
	}

	if len(idList) == 0 {
		return nil, nil
	}

	return i.GetList(db, "", idList, nil, "", "", false, false, nil)
}

func (i *XxbImMessage) UpdateBulletinMessage(db *gorm.DB, messageId int64, message map[string]any) error {
	return db.Model(&XxbImMessage{}).Where("id = ? AND type = ?", messageId, "bulletin").Updates(message).Error
}

// 检查错误是否是唯一约束冲突
func IsUniqueConstraintViolation(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	// 兼容 MySQL
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return true
	}
	return false
}

type MessageTableInfo struct {
	TableName string
	Messages  []int64
	StartDate time.Time
	EndDate   time.Time
}

func (i *XxbImMessage) GetList(db *gorm.DB, cgid string, idList []int64, pager *util.Pager, startDate string, msgType string, format bool, masterOnly bool, userID *int64) ([]XxbImMessage, error) {
	var tables []MessageTableInfo

	// 确定查询的表
	if masterOnly {
		tables = []MessageTableInfo{{TableName: (&XxbImMessage{}).TableName(), Messages: idList}}
	} else {
		if len(idList) > 0 {
			tables = GetTableByMessages(db, idList)
		} else if startDate != "" {
			tables = GetTablesByDateRange(db, startDate, "")
		} else {
			tables = GetAllTables(db)
		}
		if len(tables) == 0 {
			return nil, fmt.Errorf("no tables found")
		}
	}

	// 构建查询条件
	var subQueries []string
	for _, table := range tables {
		query := db.Table(table.TableName).Select("*").Where("1 = 1")
		if cgid != "" {
			query = query.Where("cgid = ?", cgid)
		}
		if len(table.Messages) > 0 {
			query = query.Where("id IN ?", table.Messages)
		}
		if startDate != "" {
			query = query.Where("date >= ?", startDate)
		}
		if msgType != "" && strings.HasPrefix(msgType, "!") {
			query = query.Where("type != ?", strings.TrimPrefix(msgType, "!"))
		} else if msgType != "" {
			query = query.Where("type = ?", msgType)
		}
		if userID != nil {
			query = query.Where("user = ?", *userID)
		}
		query = query.Session(&gorm.Session{DryRun: true}).Find(nil)
		sqlStr := db.Dialector.Explain(query.Statement.SQL.String(), query.Statement.Vars...)
		subQueries = append(subQueries, sqlStr)
	}

	unionQuery := strings.Join(subQueries, " UNION ALL ")
	finalQuery := db.Table("(" + unionQuery + ") as t").Select("*")

	if pager != nil {
		offset := (pager.PageID - 1) * pager.RecPerPage
		finalQuery = finalQuery.Offset(int(offset)).Limit(int(pager.RecPerPage))
	}

	var messages []XxbImMessage
	if err := finalQuery.Order("id DESC").Find(&messages).Error; err != nil {
		return nil, err
	}

	return messages, nil
}

// 获取表名和消息ID的映射
func GetTableByMessages(db *gorm.DB, messageIDs []int64) []MessageTableInfo {
	var tables []MessageTableInfo

	// 使用缓存获取索引表
	indices := getMessageIndices()

	processedIDs := make([]int64, 0)

	// 遍历索引表，找到符合条件的消息ID
	for _, index := range indices {
		min := index.Start
		max := index.End
		var ids []int64

		for _, id := range messageIDs {
			if id >= min && id <= max {
				ids = append(ids, id)
			}
		}

		if len(ids) > 0 {
			result := MessageTableInfo{
				TableName: index.Tablename,
				Messages:  ids,
			}
			tables = append(tables, result)
		}
	}

	// 处理未索引的消息ID
	unindexed := difference(messageIDs, processedIDs)
	if len(unindexed) > 0 {
		result := MessageTableInfo{
			TableName: (&XxbImMessage{}).TableName(),
			Messages:  unindexed,
		}
		tables = append(tables, result)
	}

	return tables
}

// 根据日期范围获取表
func GetTablesByDateRange(db *gorm.DB, startDate, endDate string) []MessageTableInfo {
	// 使用缓存获取索引表
	indices := getMessageIndices()

	// 解析日期范围
	var startDateTime, endDateTime *time.Time
	if startDate != "" {
		startDateTime = util.ParseLocalTime(startDate)
	}
	if endDate != "" {
		endDateTime = util.ParseLocalTime(endDate)
	}

	// 根据日期范围过滤表
	var result []MessageTableInfo
	for _, index := range indices {
		// 检查日期范围是否重叠
		shouldInclude := true
		if startDateTime != nil && index.EndDate.Before(*startDateTime) {
			shouldInclude = false
		}
		if endDateTime != nil && index.StartDate.After(*endDateTime) {
			shouldInclude = false
		}

		if shouldInclude {
			result = append(result, MessageTableInfo{
				TableName: index.Tablename,
				StartDate: index.StartDate,
				EndDate:   index.EndDate,
			})
		}
	}

	// 判断是否需要追加主表
	var appendMaster bool
	if len(result) == 0 {
		appendMaster = true
	} else if endDate != "" {
		maxEndDate := result[0].EndDate
		for _, table := range result {
			if table.EndDate.After(maxEndDate) {
				maxEndDate = table.EndDate
			}
		}

		if endDateTime != nil && maxEndDate.Before(*endDateTime) {
			appendMaster = true
		}
	}

	// 追加主表
	if appendMaster {
		var maxEndDate time.Time
		if len(result) > 0 {
			maxEndDate = result[0].EndDate
			for _, table := range result {
				if table.EndDate.After(maxEndDate) {
					maxEndDate = table.EndDate
				}
			}
		} else {
			maxEndDate = MinDate
		}

		master := MessageTableInfo{
			TableName: (&XxbImMessage{}).TableName(),
			StartDate: maxEndDate,
			EndDate:   MaxDate,
		}
		result = append(result, master)
	}
	return result
}

// 获取所有表
func GetAllTables(db *gorm.DB) []MessageTableInfo {
	// 使用缓存获取索引表
	indices := getMessageIndices()

	// 将结果转换为 TableInfo 结构体
	var result []MessageTableInfo
	for _, index := range indices {
		result = append(result, MessageTableInfo{
			TableName: index.Tablename,
			Messages:  nil,
		})
	}

	// 追加主表
	master := MessageTableInfo{
		TableName: (&XxbImMessage{}).TableName(),
		Messages:  nil,
	}
	result = append(result, master)

	return result
}

// 保存离线消息
func (i *XxbImMessage) SaveOfflineList(db *gorm.DB, messages []XxbImMessage, users []int64) error {
	if users != nil {
		// 查询已删除的用户
		var deletedUsers []int64
		db.Table((&User{}).TableName()).Select("id").Where("deleted = ?", "1").Find(&deletedUsers)

		// 过滤掉已删除的用户
		users = filterDeletedUsers(users, deletedUsers)
		// 保存消息状态
		for _, messageInfo := range messages {
			err := SaveStatus(db, users, int64(messageInfo.ID), "waiting")
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// 过滤已删除的用户
func filterDeletedUsers(users, deletedUsers []int64) []int64 {
	deletedUserMap := make(map[int64]bool)
	for _, user := range deletedUsers {
		deletedUserMap[user] = true
	}

	var filteredUsers []int64
	for _, user := range users {
		if !deletedUserMap[user] {
			filteredUsers = append(filteredUsers, user)
		}
	}
	return filteredUsers
}

// 保存消息状态
func SaveStatus(db *gorm.DB, users []int64, message int64, status string) error {
	if len(users) == 0 || message == 0 {
		return errors.New("invalid input: users or message is empty")
	}

	// 构造批量插入的数据
	var messageStatusList []XxbImMessageStatus
	for _, user := range users {
		messageStatusList = append(messageStatusList, XxbImMessageStatus{
			User:    user,
			Message: message,
			Status:  status,
		})
	}

	if db.Dialector.Name() == "mysql" {
		// 使用 GORM 的 Clauses 处理 ON DUPLICATE KEY UPDATE
		result := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user"}, {Name: "message"}}, // 复合主键
			DoUpdates: clause.Assignments(map[string]any{"status": status}),
		}).Create(&messageStatusList)

		if result.Error != nil {
			return result.Error
		}
	} else {
		// 对于非 MySQL 数据库，使用逐条插入或替换
		for _, user := range users {
			data := XxbImMessageStatus{
				User:    user,
				Message: message,
				Status:  status,
			}

			// 使用 GORM 的 Save 方法（如果主键存在则更新，否则插入）
			result := db.Save(&data)
			if result.Error != nil {
				return result.Error
			}
		}
	}
	return nil
}

// Retract one message.
func (i *XxbImMessage) MessageRetract(db *gorm.DB, gid string, isAdmin bool, deletedBy int64, chatInfo XxbImChat) (*XxbImMessage, error) {
	messageInfo, err := i.GetMessageByGid(db, gid)
	if err != nil {
		return nil, err
	}
	if chatInfo.IsArchived() {
		return nil, errors.New("chat is archived")
	}
	messageLife := int(time.Since(messageInfo.Date).Minutes())
	validTime := 2

	bySelf := messageInfo.User == strconv.FormatInt(deletedBy, 10)

	if messageLife <= validTime && bySelf {
		messageInfo.Deleted = "1"
		err := db.Model(&XxbImMessage{}).Where("gid = ?", gid).Update("deleted", messageInfo.Deleted).Error
		if err != nil {
			return nil, err
		}
	} else if isAdmin {
		messageData := map[string]any{}
		if messageInfo.Data != "" {
			_ = json.Unmarshal([]byte(messageInfo.Data), &messageData)
		}

		if !bySelf {
			messageData["deletedBy"] = deletedBy
			messageDataBytes, _ := json.Marshal(messageData)
			messageInfo.Data = string(messageDataBytes)
		}
		messageInfo.Deleted = "1"
		if bySelf {
			db.Model(&XxbImMessage{}).Where("gid = ?", gid).Update("deleted", messageInfo.Deleted)
		} else {
			db.Model(&XxbImMessage{}).Where("gid = ?", gid).Updates(map[string]any{
				"deleted": messageInfo.Deleted,
				"data":    messageInfo.Data,
			})
		}
	}
	// messages := i.FormatMessages([]XxbImMessage{messageInfo})
	return &messageInfo, nil
}

func (i *XxbImMessage) GetMessagesByIndexes(db *gorm.DB, gid string, indexList []int64) ([]XxbImMessage, error) {
	if gid == "" {
		return nil, nil
	}
	var tables map[string]MessageTableInfo
	if len(indexList) == 0 {
		tables = GetChatAllTables(db, gid)
	} else {
		tables = GetChatTablesByChatIndexes(db, gid, indexList)
	}

	if len(tables) == 0 {
		return nil, nil
	}

	var subQueries []string
	for _, table := range tables {
		query := db.Table(table.TableName).Select("*").
			Where("cgid = ?", gid)

		if len(indexList) > 0 {
			query = query.Where("`index` IN ?", table.Messages)
		}

		query = query.Session(&gorm.Session{DryRun: true}).Find(nil)
		sqlStr := db.Dialector.Explain(query.Statement.SQL.String(), query.Statement.Vars...)
		subQueries = append(subQueries, sqlStr)
	}

	unionQuery := strings.Join(subQueries, " UNION ALL ")
	finalQuery := db.Table("(" + unionQuery + ") as t").Select("*")
	var messages []XxbImMessage
	result := finalQuery.Order("id DESC").Find(&messages)
	if result.Error != nil {
		return nil, result.Error
	}
	// return i.FormatMessages(messages), nil
	return messages, nil
}

func GetChatAllTables(db *gorm.DB, cgid string) map[string]MessageTableInfo {
	if cgid == "" {
		return make(map[string]MessageTableInfo)
	}

	var tables []string
	result := db.Table((&XxbImChatMessageIndex{}).TableName()).
		Select("DISTINCT tableName").
		Where("gid = ?", cgid).
		Find(&tables)
	if result.Error != nil {
		return make(map[string]MessageTableInfo)
	}

	tablesMap := make(map[string]MessageTableInfo)
	for _, table := range tables {
		tablesMap[table] = MessageTableInfo{
			TableName: table,
			Messages:  []int64{},
		}
	}

	master := MessageTableInfo{
		TableName: (&XxbImMessage{}).TableName(),
		Messages:  []int64{},
	}
	tablesMap[(&XxbImMessage{}).TableName()] = master

	return tablesMap
}

// 根据聊天索引获取聊天表信息
func GetChatTablesByChatIndexes(db *gorm.DB, cgid string, indexes []int64) map[string]MessageTableInfo {
	if cgid == "" {
		return make(map[string]MessageTableInfo)
	}

	var indices []XxbImChatMessageIndex
	if err := db.Table((&XxbImChatMessageIndex{}).TableName()).
		Select("tableName, startIndex, endIndex").
		Where("gid = ?", cgid).
		Find(&indices).Error; err != nil {
		return make(map[string]MessageTableInfo)
	}

	tables := make(map[string]MessageTableInfo)
	processedIDs := make([]int64, 0)

	for _, index := range indices {
		min := index.StartIndex
		max := index.EndIndex
		var ids []int64
		for _, id := range indexes {
			if id >= min && id <= max {
				ids = append(ids, id)
			}
		}
		var newIndexes []int64
		for _, id := range indexes {
			found := false
			for _, processedID := range ids {
				if int64(id) == processedID {
					found = true
					break
				}
			}
			if !found {
				newIndexes = append(newIndexes, id)
			}
		}
		indexes = newIndexes

		if len(ids) > 0 {
			result := MessageTableInfo{
				TableName: index.Tablename,
				Messages:  ids,
			}
			tables[index.TableName()] = result
			processedIDs = append(processedIDs, ids...)
		}
	}

	var unindexed []int64
	for _, id := range indexes {
		found := false
		for _, processedID := range processedIDs {
			if int64(id) == processedID {
				found = true
				break
			}
		}
		if !found {
			unindexed = append(unindexed, int64(id))
		}
	}

	if len(unindexed) > 0 {
		result := MessageTableInfo{
			TableName: (&XxbImMessage{}).TableName(),
			Messages:  unindexed,
		}
		tables[(&XxbImMessage{}).TableName()] = result
	}

	return tables
}

// 获取聊天消息的数量
func (i *XxbImMessage) GetMessageCount(db *gorm.DB, gid string) (int64, error) {
	var masterTableCount int64
	result := db.Table(i.TableName()).Where("cgid =?", gid).Count(&masterTableCount)
	if result.Error != nil {
		return 0, result.Error
	}

	var partitionsMessageCount sql.NullInt64
	row := db.Table((&XxbImChatMessageIndex{}).TableName()).Select("sum(`count`)").Where("gid =?", gid).Row()
	err := row.Scan(&partitionsMessageCount)
	if err != nil && err != gorm.ErrRecordNotFound {
		return 0, err
	}

	var finalPartitionsMessageCount int64
	if partitionsMessageCount.Valid {
		finalPartitionsMessageCount = partitionsMessageCount.Int64
	}

	return masterTableCount + finalPartitionsMessageCount, nil
}

func (i *XxbImMessage) GetBroadcastContent(db *gorm.DB, typ string, chatInfo *XxbImChat, userID int64, members []int64) string {
	var user User
	userInfo, _ := user.GetAccountByID(db, userID)
	userName := userInfo.RealName
	if userName == "" {
		userName = user.Account
	}
	userMention := fmt.Sprintf("[@%s](@#%d)", userName, userInfo.ID)
	if strings.HasPrefix(typ, "changeChatOwnership") {
		re := regexp.MustCompile(`([#\` + "`" + `*_{}[\]()+\-!.])`)
		nameInMarkdown := re.ReplaceAllString(chatInfo.Name, `\$1`)
		return fmt.Sprintf(lang.Get("model.message.boardcast.changeChatOwnership"), nameInMarkdown, chatInfo.Gid, userMention)
	}

	if typ == "chatMerged" {
		return fmt.Sprintf(lang.Get("model.message.boardcast.chatMerged"), chatInfo.Name, chatInfo.IntoName)
	}

	if typ == "mergeChat" {
		return fmt.Sprintf(lang.Get("model.message.boardcast.mergeChat"), chatInfo.Name)
	}

	if typ == "renamePrivate" {
		re := regexp.MustCompile(`([#\` + "`" + `*_{}[\]()+\-!.])`)
		nameInMarkdown := re.ReplaceAllString(chatInfo.Name, `\$1`)
		return fmt.Sprintf(lang.Get("model.message.boardcast.renamePrivate"), nameInMarkdown, chatInfo.Gid)
	}

	if typ == "createChat" || typ == "renameChat" {
		re := regexp.MustCompile(`([#\` + "`" + `*_{}[\]()+\-!.])`)
		nameInMarkdown := re.ReplaceAllString(chatInfo.Name, `\$1`)
		if typ == "renameChat" {
			return fmt.Sprintf(lang.Get("model.message.boardcast.renameChat"), userMention, nameInMarkdown, chatInfo.Gid)
		}
		return fmt.Sprintf(lang.Get("model.message.boardcast.createChat"), userMention, nameInMarkdown, chatInfo.Gid)
	}

	if typ == "inviteUser" || typ == "createConferenceInvitation" || typ == "mergeChatWithMembers" {
		var user User
		var memberMentions []string
		membersList, _ := user.GetUserInfoByUserIds(db, members, false)
		for _, member := range membersList {
			memberName := member.RealName
			if memberName == "" {
				memberName = member.Account
			}
			memberMentions = append(memberMentions, fmt.Sprintf("[@%s](@#%d)", memberName, member.ID))
		}
		memberMentionsStr := strings.Join(memberMentions, lang.Get("model.message.connector"))

		if typ == "mergeChatWithMembers" {
			return fmt.Sprintf(lang.Get("model.message.boardcast.mergeChatWithMembers"), chatInfo.Name, memberMentionsStr)
		}
		if typ == "createConferenceInvitation" {
			return fmt.Sprintf(lang.Get("model.message.boardcast.createConferenceInvitation"), userMention, memberMentionsStr)
		}
		return fmt.Sprintf(lang.Get("model.message.boardcast.inviteUser"), userMention, memberMentionsStr)
	}

	if typ == "archiveChat" || typ == "unarchiveChat" {
		re := regexp.MustCompile(`([#\` + "`" + `*_{}[\]()+\-!.])`)
		nameInMarkdown := re.ReplaceAllString(chatInfo.Name, `\$1`)
		if typ == "unarchiveChat" {
			return fmt.Sprintf(lang.Get("model.message.boardcast.unarchiveChat"), userMention, nameInMarkdown)
		}
		return fmt.Sprintf(lang.Get("model.message.boardcast.archiveChat"), userMention, nameInMarkdown)
	}

	return fmt.Sprintf(lang.Get("model.message.boardcast."+typ), userMention)
}

// SendFailures 处理发送失败的消息，将其添加到离线消息队列
func (i *XxbImMessage) SendFailures(db *gorm.DB, sendfail map[int64][]string) error {
	for userID, gids := range sendfail {
		if len(gids) == 0 {
			continue
		}

		// 根据gid获取消息ID列表
		var messageIDs []int64
		err := db.Table(i.TableName()).Select("id").Where("gid IN ?", gids).Find(&messageIDs).Error
		if err != nil {
			continue
		}

		if len(messageIDs) == 0 {
			continue
		}

		// 获取消息内容
		messages, err := i.GetList(db, "", messageIDs, nil, "", "", false, false, nil)
		if err != nil {
			continue
		}

		// 保存为离线消息
		err = i.SaveOfflineList(db, messages, []int64{int64(userID)})
		if err != nil {
			return err
		}
	}
	return nil
}

// GetNotifyList 获取通知列表
func (i *XxbImMessage) GetNotifyList(db *gorm.DB) (map[int64][]NotifyMessage, error) {
	var user User

	// 获取在线用户列表
	onlineUserIDs := user.GetOnlineUsers(db, nil)

	// 查询等待状态的消息用户对
	var messageUserPairs []struct {
		Message int64 `gorm:"column:message"`
		User    int64 `gorm:"column:user"`
	}

	err := db.Table((&XxbImMessageStatus{}).TableName()).
		Select("message, user").
		Where("status = ? AND user IN ?", "waiting", onlineUserIDs).
		Find(&messageUserPairs).Error
	if err != nil || len(messageUserPairs) == 0 {
		return make(map[int64][]NotifyMessage), nil
	}

	// 按消息ID分组用户
	messageUserMap := make(map[int64][]int64)
	var messageIDs []int64
	for _, pair := range messageUserPairs {
		messageUserMap[pair.Message] = append(messageUserMap[pair.Message], pair.User)
		messageIDs = append(messageIDs, pair.Message)
	}

	// 获取通知类型的消息
	messages, err := i.GetList(db, "", messageIDs, nil, "", "notify", false, false, nil)
	if err != nil {
		return make(map[int64][]NotifyMessage), nil
	}

	// 格式化通知消息
	notifications := i.formatNotifyMessages(messages)

	// 按用户分组通知
	data := make(map[int64][]NotifyMessage)
	var processedMessageIDs []int64

	for _, notification := range notifications {
		if users, exists := messageUserMap[notification.ID]; exists {
			for _, userID := range users {
				data[userID] = append(data[userID], notification)
			}
			processedMessageIDs = append(processedMessageIDs, int64(notification.ID))
		}
	}

	// 删除已处理的消息状态记录
	if len(processedMessageIDs) > 0 {
		for userID := range data {
			var userMessageIDs []int64
			for _, msgID := range processedMessageIDs {
				if users, exists := messageUserMap[msgID]; exists {
					for _, uid := range users {
						if uid == int64(userID) {
							userMessageIDs = append(userMessageIDs, msgID)
							break
						}
					}
				}
			}

			if len(userMessageIDs) > 0 {
				db.Table((&XxbImMessageStatus{}).TableName()).
					Where("message IN ? AND user = ?", userMessageIDs, userID).
					Delete(&XxbImMessageStatus{})
			}
		}
	}

	return data, nil
}

// NotifyMessage 通知消息结构
type NotifyMessage struct {
	ID          int64   `json:"id"`
	GID         string  `json:"gid"`
	CGID        string  `json:"cgid"`
	Type        string  `json:"type"`
	Content     string  `json:"content"`
	Date        int64   `json:"date"`
	ContentType string  `json:"contentType"`
	Title       string  `json:"title"`
	Subtitle    string  `json:"subtitle"`
	URL         string  `json:"url"`
	Actions     any     `json:"actions"`
	Sender      any     `json:"sender"`
	Users       []int64 `json:"users"`
	Index       *int64  `json:"index,omitempty"`
}

func (n *NotifyMessage) ToMap() map[string]any {
	emptyMap := make(map[string]any)
	var result map[string]any
	jsonBytes, err := json.Marshal(n)
	if err != nil {
		return emptyMap
	}
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		return emptyMap
	}
	return result
}

func ConvertNotifyMessagesSlice(notifications []NotifyMessage) []any {
	result := []any{}
	for _, notification := range notifications {
		result = append(result, notification.ToMap())
	}
	return result
}

func (i *XxbImMessage) CreateXuanbotWelcomeNotify(db *gorm.DB, userID int64) (*XxbImMessage, error) {
	sender := CreateDefaultBotSender("")
	title := lang.Get("service.xuan.welcome.title")
	content := lang.Get("service.xuan.welcome.content")
	// url := lang.Get("service.xuan.welcome.link")
	info := map[string]any{
		"title":  title,
		"sender": sender,
		// "url":    url,
	}
	infoBytes, err := json.Marshal(info)
	if err != nil {
		return nil, err
	}

	notify := &XxbImMessage{
		Content:     content,
		ContentType: "text",
		Data:        string(infoBytes),
	}
	err = i.CreateXuanBotMessage(db, notify, userID)
	if err != nil {
		return nil, err
	}
	return notify, nil
}

// 语言项定义
var (
	lang_bot_name = "小喧喧"
)

type Sender struct {
	Id          int64  `json:"id"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
}

/**
 * Create default bot sender.
 *
 * @param  string $extraName
 * @access public
 * @return object
 */
func CreateDefaultBotSender(extraName string) Sender {
	sender := make(map[string]any)
	sender["id"] = 0

	// 从语言包获取commonName，这里使用一个默认值，实际项目中应该有具体实现
	var displayName string
	// 如果提供了额外名称，在显示名称后添加@extraName
	if extraName != "" {
		displayName = lang_bot_name + "@" + extraName
	} else {
		displayName = lang_bot_name
	}

	// 构建头像URL
	// 由于没有看到确切的getSysURL函数，使用util包中的相关方法
	baseURL := util.GetSysURL()
	avatar := baseURL + "data/image/xuanbot.png"

	return Sender{
		Id:          0,
		DisplayName: displayName,
		Avatar:      avatar,
	}
}

const (
	config_im_partition_messagePerTable int64 = 100000
)

// 用于存储分组统计结果（cgid分组的聚合信息）
type ChatGroupStats struct {
	Cgid     string `gorm:"column:cgid"`
	MaxID    int64  `gorm:"column:max_id"`
	MinID    int64  `gorm:"column:min_id"`
	MaxIndex int64  `gorm:"column:max_index"` // 注意index是关键字，需要转义
	MinIndex int64  `gorm:"column:min_index"`
	Count    int64  `gorm:"column:count"`
}

// MessageReindex 为指定表建立索引（对应原PHP的reindex方法）
func MessageReindex(tx *gorm.DB, tableName string) error {
	// 1. 查询表中第一条和最后一条记录的ID和日期
	var firstRecord, lastRecord XxbImMessage

	// 查询第一条记录（按ID升序）
	if err := tx.Table(tableName).
		Select("id, date").
		Order("id ASC").
		Limit(1).
		First(&firstRecord).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 查询最后一条记录（按ID降序）
	if err := tx.Table(tableName).
		Select("id, date").
		Order("id DESC").
		Limit(1).
		First(&lastRecord).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 2. 获取所有 distinct 的 cgid（聊天组ID）
	var cgids []string
	if err := tx.Table(tableName).
		Distinct("cgid").
		Pluck("cgid", &cgids).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 3. 构造消息元数据并插入到 TABLE_IM_MESSAGE_INDEX
	messageMeta := MessageIndex{
		Tablename: tableName,
		Start:     firstRecord.ID,
		End:       lastRecord.ID,
		StartDate: firstRecord.Date,
		EndDate:   lastRecord.Date,
		Chats:     "," + strings.Join(cgids, ",") + ",", // 格式：,cgid1,cgid2,
	}

	messageIndexModel := &MessageIndex{}
	if err := tx.Table(messageIndexModel.TableName()).
		Create(&messageMeta).
		Error; err != nil {
		tx.Rollback()
		return err
	}

	// 4. 按cgid分组查询统计信息（max/min id、index、记录数）
	var chatsInfo []ChatGroupStats
	if err := tx.Table(tableName).
		Select("cgid, MAX(id) as max_id, MIN(id) as min_id, MAX(`index`) as max_index, MIN(`index`) as min_index, count(*) as count").
		Group("cgid").
		Scan(&chatsInfo).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 5. 收集所有max(id)和min(id)，查询对应的日期（去重）
	var messageIds []int64
	idSet := make(map[int64]struct{}) // 用于去重
	for _, info := range chatsInfo {
		if _, exists := idSet[info.MaxID]; !exists {
			idSet[info.MaxID] = struct{}{}
			messageIds = append(messageIds, info.MaxID)
		}
		if _, exists := idSet[info.MinID]; !exists {
			idSet[info.MinID] = struct{}{}
			messageIds = append(messageIds, info.MinID)
		}
	}

	// 查询这些ID对应的日期，存入map（id => date）
	messageDates := make(map[int64]time.Time)
	var idDateList []XxbImMessage
	if err := tx.Table(tableName).
		Select("id, date").
		Where("id IN ?", messageIds).
		Scan(&idDateList).Error; err != nil && err != gorm.ErrRecordNotFound {
		tx.Rollback()
		return err
	}
	for _, item := range idDateList {
		messageDates[item.ID] = item.Date
	}

	// 6. 构造批量插入数据，插入到 TABLE_IM_CHAT_MESSAGE_INDEX
	var chatIndexList []XxbImChatMessageIndex
	for _, info := range chatsInfo {
		// 从map中获取最小ID和最大ID对应的日期
		startDate := messageDates[info.MinID]
		endDate := messageDates[info.MaxID]

		chatIndexList = append(chatIndexList, XxbImChatMessageIndex{
			Tablename:  tableName,
			Gid:        info.Cgid,
			Start:      info.MinID,
			End:        info.MaxID,
			StartIndex: info.MinIndex,
			EndIndex:   info.MaxIndex,
			StartDate:  startDate,
			EndDate:    endDate,
			Count:      info.Count,
		})
	}

	imChatMessageIndex := &XxbImChatMessageIndex{}

	// 批量插入（GORM批量插入推荐使用CreateInBatches，或直接Create切片）
	if len(chatIndexList) > 0 {
		if err := tx.Table(imChatMessageIndex.TableName()).Create(&chatIndexList).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return nil
}

// BackupMasterTable 备份主消息表中 ID 范围内的数据到备份表
// fromID: 备份 ID >= fromID 的数据
// toID: 可选参数，若 >0 则仅备份 ID <= toID 的数据
// 返回值：可能的错误
func BackupMasterTable(tx *gorm.DB, fromID, toID int64) error {
	// 定义主表和备份表名（根据实际业务调整表名）
	imMessageModel := &XxbImMessage{}
	backupTable := util.Config.Mysql.TablePrefix + "im_message_backup"

	// 1. 构建查询条件（ID 范围）
	whereClause := "id >= ?" // 基础条件：ID 大于等于 fromID
	args := []any{fromID}    // 条件参数列表

	// 若 toID 不为 0，添加上限条件（ID 小于等于 toID）
	if toID > 0 {
		whereClause += " AND id <= ?"
		args = append(args, toID)
	}

	// 2. 构建 INSERT ... SELECT 语句（核心：从主表查询并插入备份表）
	// 语法：INSERT INTO 备份表 SELECT * FROM 主表 WHERE 条件
	sql := fmt.Sprintf(
		"INSERT INTO %s SELECT * FROM %s WHERE %s",
		backupTable,
		imMessageModel.TableName(),
		whereClause,
	)

	// 3. 执行 SQL 并返回受影响的行数
	if err := tx.Exec(sql, args...).Error; err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

// DeleteFromMasterTable 批量删除im_message表中的数据
// 通过保留需要的数据到临时表，替换原表并清理旧表实现
// 参数：
//
//	end: 保留id > end的数据
//
// 返回：操作是否成功
func DeleteFromMasterTable(tx *gorm.DB, end int64) error {
	messgeModel := &XxbImMessage{}
	TableImMessage := messgeModel.TableName()

	// 生成临时表名和旧表名
	today := time.Now().Format("2006-01-02")
	tmpTable := fmt.Sprintf("%s_tmp_%s", TableImMessage, today)
	oldTable := fmt.Sprintf("%s_old_%s", TableImMessage, today)

	// 移除表名中的特殊字符
	reg := regexp.MustCompile(`[` + "`" + `-]`)
	tmpTable = reg.ReplaceAllString(tmpTable, "")
	oldTable = reg.ReplaceAllString(oldTable, "")

	// 创建临时表
	// 基于ImMessage结构体创建临时表，保证字段结构一致
	if err := tx.Table(tmpTable).AutoMigrate(&XxbImMessage{}); err != nil {
		tx.Rollback()
		return err
	}

	// 保留需要的数据（id > end）
	// 使用分批 INSERT ... SELECT 直接从原表复制到临时表，避免内存加载和大事务
	const batchSize = 1000 // 每批处理的消息数量

	// 计算需要保留的数据总量（用于分批处理）
	var totalCount int64
	if err := tx.Table(TableImMessage).Where("id > ?", end).Count(&totalCount).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 分批处理数据，避免一次性处理过多数据导致的长事务
	for offset := int64(0); offset < totalCount; offset += batchSize {
		// 使用 LIMIT 和 OFFSET 进行分批复制
		batchInsertSQL := fmt.Sprintf(
			"INSERT INTO %s SELECT * FROM %s WHERE id > ? ORDER BY id ASC LIMIT %d OFFSET %d",
			tmpTable,
			TableImMessage,
			batchSize,
			offset,
		)

		if err := tx.Exec(batchInsertSQL, end).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// 6. 重命名表：原表→旧表，临时表→原表（原子操作）
	// 执行 RENAME TABLE 原表 TO 旧表, 临时表 TO 原表
	renameSQL := fmt.Sprintf(
		"RENAME TABLE `%s` TO `%s`, `%s` TO `%s`",
		TableImMessage, oldTable, tmpTable, TableImMessage,
	)
	if err := tx.Exec(renameSQL).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 7. 删除旧表（原表数据）
	if err := tx.Exec(fmt.Sprintf("DROP TABLE `%s`", oldTable)).Error; err != nil {
		tx.Rollback()
		return err
	}

	return nil
}

// MessageNeedPartition 判断是否需要创建新的分表
func MessageNeedPartition(db *gorm.DB) (bool, error) {
	var currentID int64
	if err := db.Model(&XxbImMessage{}).
		Select("id").
		Order("id DESC").
		Limit(1).
		Scan(&currentID).Error; err != nil {
		return false, err
	}

	var lastIndexID int64
	if err := db.Model(&MessageIndex{}).
		Select("end").
		Order("end DESC").
		Limit(1).
		Scan(&lastIndexID).Error; err != nil {
		return false, err
	}

	return currentID > lastIndexID+2*config_im_partition_messagePerTable, nil
}

func MessagePartitionTable(db *gorm.DB) error {
	// 循环分表，直到不需要再分为止
	for {
		need, err := MessageNeedPartition(db)
		if err != nil {
			return err
		}
		if !need {
			// 没有需要分表的条件，退出循环
			break
		}

		// 执行单次分表操作
		if err := performSinglePartition(db); err != nil {
			return err
		}

		// 分表完成后，立即重新加载消息索引缓存
		InvalidateMessageIndexCache(db)

		// 添加日志记录分表进度
		util.Log("info", "Completed one partition cycle, checking if more partitions are needed...")
	}

	util.Log("info", "Partitioning completed - no more partitions needed")
	return nil
}

// performSinglePartition 执行单次分表操作（分一个10万消息的表）
func performSinglePartition(db *gorm.DB) error {
	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取当前表信息
	var currentTable MessageIndex
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Model(&MessageIndex{}).
		Select("id, end").
		Order("id DESC").
		Limit(1).
		First(&currentTable).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 如果是第一次分表，创建初始索引记录
			currentTable = MessageIndex{
				ID:  0,
				End: 0,
			}
		} else {
			tx.Rollback()
			return err
		}
	}

	messageModel := &XxbImMessage{}
	newTableName := fmt.Sprintf("%s_%d", messageModel.TableName(), currentTable.ID+1)

	// 创建新表结构
	if err := tx.Table(newTableName).AutoMigrate(messageModel); err != nil {
		tx.Rollback()
		return err
	}

	// 分批迁移数据，避免一次性加载大量数据到内存
	const batchSize = 1000 // 每批迁移的消息数量
	startID := currentTable.End + 1
	endID := currentTable.End + config_im_partition_messagePerTable

	for batchStart := startID; batchStart <= endID; batchStart += batchSize {
		batchEnd := batchStart + batchSize - 1
		if batchEnd > endID {
			batchEnd = endID
		}

		// 检查这一批是否有数据
		var count int64
		if err := tx.Table(messageModel.TableName()).
			Where("id >= ? AND id <= ?", batchStart, batchEnd).
			Count(&count).Error; err != nil {
			tx.Rollback()
			return err
		}

		if count == 0 {
			continue // 这一批没有数据，跳过
		}

		// 使用 INSERT ... SELECT 直接从主表复制到新表，避免加载到内存
		insertSQL := fmt.Sprintf(
			"INSERT INTO %s SELECT * FROM %s WHERE id >= ? AND id <= ?",
			newTableName,
			messageModel.TableName(),
		)
		if err := tx.Exec(insertSQL, batchStart, batchEnd).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// 为新表建立索引
	if err := MessageReindex(tx, newTableName); err != nil {
		tx.Rollback()
		return err
	}

	// 备份主表数据
	if err := BackupMasterTable(tx, startID, endID); err != nil {
		tx.Rollback()
		return err
	}

	// 从主表删除数据
	if err := DeleteFromMasterTable(tx, endID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// ============= 消息加密解密相关函数 =============

// codecWithRot47 使用 ROT47 算法对字符串进行编解码
// ROT47 是对 ASCII 字符集中可打印字符的旋转加密，ROT47 是双向的（加密和解密使用相同的函数）
func codecWithRot47(str string) string {
	const from = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"
	const to = "PQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNO"

	result := make([]byte, len(str))
	for i := 0; i < len(str); i++ {
		// 查找字符在 from 中的位置
		index := strings.IndexByte(from, str[i])
		if index != -1 {
			// 如果找到，使用 to 中对应位置的字符
			result[i] = to[index]
		} else {
			// 如果没找到，保持原字符不变
			result[i] = str[i]
		}
	}
	return string(result)
}

// decodeText 解码文本：先使用 ROT47 解码，然后进行 base64 解码
func decodeText(text string) (string, error) {
	// 先进行 ROT47 解码
	rot47Decoded := codecWithRot47(text)

	// 然后进行 base64 解码
	decoded, err := base64.StdEncoding.DecodeString(rot47Decoded)
	if err != nil {
		return "", fmt.Errorf("base64 decode error: %w", err)
	}

	return string(decoded), nil
}

// encodeText 编码文本：先进行 base64 编码，然后使用 ROT47 编码
func encodeText(text string) string {
	// 先进行 base64 编码
	base64Encoded := base64.StdEncoding.EncodeToString([]byte(text))

	// 然后进行 ROT47 编码
	return codecWithRot47(base64Encoded)
}
