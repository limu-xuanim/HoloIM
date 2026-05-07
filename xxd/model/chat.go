package model

import (
	"errors"
	"fmt"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"
	"xxd/util"

	"github.com/goccy/go-json"
	"gorm.io/gorm"
)

type XxbImChat struct {
	Id               int64      `gorm:"column:id;primary_key;AUTO_INCREMENT" json:"id"`
	Gid              string     `gorm:"column:gid;NOT NULL" json:"gid"`
	Name             string     `gorm:"column:name;NOT NULL" json:"name"`
	Type             string     `gorm:"column:type;default:group;NOT NULL" json:"type"`
	Admins           string     `gorm:"column:admins;NOT NULL" json:"admins"`
	Committers       string     `gorm:"column:committers;NOT NULL" json:"committers"`
	Subject          int64      `gorm:"column:subject;default:0;NOT NULL" json:"subject"`
	Public           string     `gorm:"column:public;default:0;NOT NULL" json:"public"`
	CreatedBy        string     `gorm:"column:createdBy;NOT NULL" json:"createdBy"`
	CreatedDate      time.Time  `gorm:"column:createdDate;NOT NULL" json:"createdDate"`
	OwnedBy          string     `gorm:"column:ownedBy;NOT NULL" json:"ownedBy"`
	EditedBy         string     `gorm:"column:editedBy;NOT NULL" json:"editedBy"`
	EditedDate       *time.Time `gorm:"column:editedDate" json:"editedDate"`
	MergedDate       *time.Time `gorm:"column:mergedDate" json:"mergedDate"`
	LastActiveTime   *time.Time `gorm:"column:lastActiveTime" json:"lastActiveTime"`
	LastMessage      int64      `gorm:"column:lastMessage;default:0;NOT NULL" json:"lastMessage"`
	LastMessageIndex int64      `gorm:"column:lastMessageIndex;default:0;NOT NULL" json:"lastMessageIndex"`
	DismissDate      *time.Time `gorm:"column:dismissDate" json:"dismissDate"`
	PinnedMessages   string     `gorm:"column:pinnedMessages;NOT NULL" json:"pinnedMessages"`
	MergedChats      string     `gorm:"column:mergedChats;NOT NULL" json:"mergedChats"`
	AdminInvite      string     `gorm:"column:adminInvite;default:0;NOT NULL" json:"adminInvite"`
	Avatar           string     `gorm:"column:avatar;NOT NULL" json:"avatar"`
	ArchiveDate      *time.Time `gorm:"column:archiveDate" json:"archiveDate"`

	IntoName             string         `json:"intoName" gorm:"-"` // 不映射到数据库
	Star                 string         `json:"star" gorm:"-"`
	Hide                 string         `json:"hide" gorm:"-"`
	Mute                 string         `json:"mute" gorm:"-"`
	Freeze               string         `json:"freeze" gorm:"-"`
	Category             string         `json:"category" gorm:"-"`
	LastReadMessage      int64          `json:"lastReadMessage" gorm:"-"`
	LastReadMessageIndex int64          `json:"lastReadMessageIndex" gorm:"-"`
	LastMessageInfo      map[string]any `json:"lastMessageInfo" gorm:"-"`
	Members              []int64        `json:"members" gorm:"-"`
}
type Avatar struct {
	Type string `json:"type"`
	Data struct {
		ImgURL     string `json:"imgUrl"`
		ImgId      int64  `json:"imgId"`
		BgColor    string `json:"bgColor"`
		CustomText string `json:"customText"`
	} `json:"data"`
}

func (a *Avatar) ToMap() map[string]any {
	avatar := map[string]any{
		"type": a.Type,
		"data": map[string]any{},
	}

	if a.Data.ImgURL != "" {
		if after, ok := strings.CutPrefix(a.Data.ImgURL, "/"); ok {
			a.Data.ImgURL = after
		}
		imgURL := util.GetWebUrl(a.Data.ImgURL)
		if strings.HasPrefix(a.Data.ImgURL, "data/image/xuanbot.png") {
			imgURL = util.GetSysURL() + a.Data.ImgURL
		}
		avatar["data"].(map[string]any)["imgUrl"] = imgURL
	}

	if a.Data.ImgId != 0 {
		avatar["data"].(map[string]any)["imgId"] = a.Data.ImgId
	}

	if a.Data.BgColor != "" {
		avatar["data"].(map[string]any)["bgColor"] = a.Data.BgColor
	}

	if a.Data.CustomText != "" {
		avatar["data"].(map[string]any)["customText"] = a.Data.CustomText
	}

	return avatar
}

func (a *Avatar) JSON() (string, error) {
	avatar := map[string]any{
		"type": a.Type,
		"data": map[string]any{},
	}

	if a.Data.ImgURL != "" {
		avatar["data"].(map[string]any)["imgUrl"] = a.Data.ImgURL
	}

	if a.Data.ImgId != 0 {
		avatar["data"].(map[string]any)["imgId"] = a.Data.ImgId
	}

	if a.Data.BgColor != "" {
		avatar["data"].(map[string]any)["bgColor"] = a.Data.BgColor
	}

	if a.Data.CustomText != "" {
		avatar["data"].(map[string]any)["customText"] = a.Data.CustomText
	}

	jsonBytes, err := json.Marshal(avatar)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

func (*XxbImChat) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_chat"
}

func (u *XxbImChat) ToMap() (map[string]any, error) {
	jsonBytes, err := json.Marshal(u)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		return nil, err
	}

	result["admins"] = util.StringToStringSlice(u.Admins)
	result["mergedChats"] = util.StringToStringSlice(u.MergedChats)
	result["pinnedMessages"] = util.StringToInt64Slice(u.PinnedMessages, true)

	// 将所有的time字段转为时间戳
	result["createdDate"] = ConvertDateToInt(&u.CreatedDate)
	result["editedDate"] = ConvertDateToInt(u.EditedDate)
	result["mergedDate"] = ConvertDateToInt(u.MergedDate)
	result["lastActiveTime"] = ConvertDateToInt(u.LastActiveTime)
	result["dismissDate"] = ConvertDateToInt(u.DismissDate)
	result["archiveDate"] = ConvertDateToInt(u.ArchiveDate)

	avatar := Avatar{}
	json.Unmarshal([]byte(u.Avatar), &avatar)
	result["avatar"] = avatar.ToMap()

	return result, err
}

func ConvertChatsSlice(chats []XxbImChat) []any {
	chatList := make([]any, 0)
	for _, chatInfo := range chats {
		chatMap, _ := chatInfo.ToMap()
		chatList = append(chatList, chatMap)
	}

	return chatList
}

// 判断userId是都在Admins中
func (m *XxbImChat) CheckIdIsInAdmins(db *gorm.DB, imChat *XxbImChat, userID int64) bool {
	if strings.Contains(imChat.Gid, "&") {
		return true
	}

	if imChat.Admins != "" && strings.Contains(imChat.Admins, fmt.Sprintf(",%d,", userID)) {
		return true
	}

	userInfo, _ := (&User{}).GetAccountByID(db, userID)
	if imChat.CreatedBy == "system" {
		if userInfo.IsSuper() {
			return true
		}
	}

	return m.IsOwner(db, userInfo.Account)
}

// 解散群
func (m *XxbImChat) Dismiss(db *gorm.DB, gid, editedBy string) error {
	// 获取聊天记录
	// 更新聊天记录的名称
	updates := map[string]any{
		"dismissDate": time.Now(),
		"editedBy":    editedBy,
		"editedDate":  time.Now(),
	}
	if err := db.Model(&XxbImChat{}).Where("gid = ?", gid).Updates(updates).Error; err != nil {
		return err
	}

	// 失效聊天缓存，确保获取最新数据
	util.InvalidateChatCache(gid)

	return nil

}

func (m *XxbImChat) IsArchived() bool {
	return m.ArchiveDate != nil
}

func (m *XxbImChat) IsDismissed() bool {
	return m.DismissDate != nil
}

func (m *XxbImChat) IsMerged() bool {
	return m.MergedDate != nil
}

func (m *XxbImChat) IsPublic() bool {
	return m.Public == "1"
}

func IsXuanBot(cgid string) bool {
	return strings.Contains(cgid, "xuanbot")
}

func (m *XxbImChat) IsAdminInvite() bool {
	return m.AdminInvite == "1"
}

func (m *XxbImChat) IsGroup() bool {
	return m.Type == "group"
}

func (m *XxbImChat) IsSystem() bool {
	return m.Type == "system"
}

func (m *XxbImChat) IsPrivate(userId int64) bool {
	return strings.Contains(m.Gid, fmt.Sprintf("%d&%d", userId, userId))
}

// 更新群名称
func (m *XxbImChat) UpdateName(db *gorm.DB, gid, name, editedBy string) error {
	// 更新聊天记录的名称
	updates := map[string]any{
		"name":       name,
		"editedBy":   editedBy,
		"editedDate": time.Now(),
	}
	if err := db.Model(&XxbImChat{}).Where("gid = ?", gid).Updates(updates).Error; err != nil {
		return err
	}

	// 失效聊天缓存，确保获取最新数据
	util.InvalidateChatCache(gid)

	return nil
}

func (m *XxbImChat) IsOwner(db *gorm.DB, account string) bool {
	if m.OwnedBy == "" {
		return account == m.CreatedBy
	}

	return account == m.OwnedBy
}

// 查询用户是否是管理员
func (m *XxbImChat) IsAdmin(userInfo User) bool {
	// 如果是私聊，直接返回 true
	if strings.Contains(m.Gid, "&") {
		return true
	}

	// 检查用户是否在管理员列表中
	if m.Admins != "" {
		admins := strings.Split(m.Admins, ",")
		for _, admin := range admins {
			if admin == strconv.FormatInt(userInfo.ID, 10) {
				return true
			}
		}
	}

	// 如果是系统创建的聊天，检查是否是超级管理员
	if m.CreatedBy == "system" && userInfo.Admin == "super" {
		return true
	}

	// 检查是否是创建者
	creatorAccount := m.OwnedBy
	if creatorAccount == "" {
		creatorAccount = m.CreatedBy
	}

	return creatorAccount == userInfo.Account
}

func (m *XxbImChat) Create(db *gorm.DB, gid, name, chatType string, members []int64, subjectID int64, public bool, userID int64) (*XxbImChat, []int64, error) {
	// 获取用户信息（假设有一个 User 结构体）
	var user User
	user, _ = user.GetAccountByID(db, int64(userID))
	publicVal := "0"
	if public {
		publicVal = "1"
	}
	// 创建 Chat 对象
	updateChat := XxbImChat{
		Gid:         gid,
		Name:        name,
		Type:        chatType,
		Subject:     subjectID,
		CreatedBy:   user.Account,
		OwnedBy:     user.Account,
		CreatedDate: time.Now(),
		Public:      publicVal,
	}
	// 处理 bot 类型
	if chatType == "bot" || (chatType == "one2one" && IsXuanBot(gid)) {
		updateChat.Type = "bot"

		avatar := Avatar{
			Type: "image",
			Data: struct {
				ImgURL     string `json:"imgUrl"`
				ImgId      int64  `json:"imgId"`
				BgColor    string `json:"bgColor"`
				CustomText string `json:"customText"`
			}{
				ImgURL: "data/image/xuanbot.png",
			},
		}
		avatarJSON, err := json.Marshal(avatar)
		if err != nil {
			return nil, nil, err
		}
		updateChat.Avatar = string(avatarJSON)
	}

	// 插入聊天
	if err := db.Table(m.TableName()).Create(&updateChat).Error; err != nil {
		return nil, nil, err
	}

	// 添加成员
	for _, member := range members {
		if _, err := m.Join(db, gid, member); err != nil {
			return nil, nil, err
		}
	}
	// 返回创建的聊天记录
	var chatUser XxbImChatUser
	userIds, err := chatUser.GetMembers(db, &updateChat)
	if err != nil {
		return nil, nil, err
	}

	// 更新lastMessage和lastMessageIndex
	// var message XxbImMessage
	// lastMessage, err := message.GetLastMessage(db, gid, 0)
	// if err == nil && lastMessage != nil {
	// 	err = db.Table(m.TableName()).
	// 		Where("gid = ?", gid).
	// 		Updates(map[string]interface{}{
	// 			"lastMessage":      lastMessage.ID,
	// 			"lastMessageIndex": lastMessage.Index,
	// 		}).Error
	// 	if err != nil {
	// 		return nil, nil, fmt.Errorf("update chat error: %s", err.Error())
	// 	}
	// }

	return &updateChat, userIds, nil
}

func (m *XxbImChat) Join(db *gorm.DB, gid string, userID int64) (int64, error) {
	// 更新聊天记录的最后活动时间
	if err := m.Touch(db, gid); err != nil {
		return 0, err
	}
	// 获取聊天记录的最后消息信息
	var lastMessageInfo XxbImChat
	if err := db.Select("lastMessage, lastMessageIndex").Where("gid = ?", gid).First(&lastMessageInfo).Error; err != nil {
		return 0, err
	}
	// 查询用户是否已经加入过聊天
	var chatUser XxbImChatUser
	result := db.Where("cgid = ? AND user = ?", gid, userID).First(&chatUser)

	if result.Error == nil {
		// 如果用户已经加入且未退出，直接返回
		if chatUser.Quit == nil {
			return userID, nil
		}
		err := db.Transaction(func(tx *gorm.DB) error {
			// 临时禁用严格模式
			if err := tx.Exec("SET SESSION sql_mode = ''").Error; err != nil {
				return err
			}
			updates := map[string]any{
				"join":                 time.Now(),
				"quit":                 nil,
				"lastReadMessage":      int64(lastMessageInfo.LastMessage),
				"lastReadMessageIndex": int64(lastMessageInfo.LastMessageIndex),
			}
			if err := tx.Model(&XxbImChatUser{}).Where("id = ?", chatUser.ID).Updates(updates).Error; err != nil {
				return err
			}
			return nil
		})
		if err == nil {
			// 失效会话成员缓存
			util.InvalidateChatMembersCache(gid)
		}
		return 0, err
	} else if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 如果用户未加入过聊天，创建新记录
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SET SESSION sql_mode = ''").Error; err != nil {
				return err
			}
			// 如果用户未加入过聊天，创建新记录
			chatUser = XxbImChatUser{
				CGid:                 gid,
				User:                 userID,
				Join:                 time.Now(),
				Quit:                 nil,
				LastReadMessage:      int64(lastMessageInfo.LastMessage),
				LastReadMessageIndex: int64(lastMessageInfo.LastMessageIndex),
			}
			if err := tx.Create(&chatUser).Error; err != nil {
				return err
			}
			// 更新 order 字段（必须使用同一个事务连接）
			if err := tx.Table(chatUser.TableName()).Model(&chatUser).Update("order", chatUser.ID).Error; err != nil {
				return err
			}
			return nil
		})
		if err == nil {
			// 失效会话成员缓存
			util.InvalidateChatMembersCache(gid)
		}
		return 0, err
	} else {
		return 0, result.Error
	}
}

func (m *XxbImChat) Touch(db *gorm.DB, gid string) error {
	// 更新聊天记录的最后编辑时间
	result := db.Model(&XxbImChat{}).Where("gid = ?", gid).Update("editedDate", time.Now())
	if result.Error != nil {
		return result.Error
	}

	util.InvalidateChatCache(gid)

	return nil
}

// 通过gid获取详情
func (m *XxbImChat) GetChatByGid(db *gorm.DB, gid string) (*XxbImChat, error) {
	// 先从缓存获取
	if cached, ok := util.GetChatFromCache(gid); ok {
		if chat, ok := cached.(*XxbImChat); ok {
			return chat, nil
		}
	}

	// 缓存未命中，从数据库查询
	var chat XxbImChat
	err := db.Table(m.TableName()).Select("*").Where("gid = ?", gid).First(&chat).Error
	if err != nil {
		return &chat, err
	}

	// 写入缓存
	if chat.Id > 0 {
		util.SetChatToCache(gid, &chat)
	}

	return &chat, err
}

// 批量查询会话信息
func (m *XxbImChat) GetChatsByGids(db *gorm.DB, gids []string) ([]XxbImChat, error) {
	if len(gids) == 0 {
		return []XxbImChat{}, nil
	}

	var chats []XxbImChat
	err := db.Table(m.TableName()).
		Where("gid IN ?", gids).
		Find(&chats).Error

	if err != nil {
		return nil, err
	}

	return chats, nil
}

func (m *XxbImChat) GetChatByGidForUser(db *gorm.DB, gid string, userID int64) *XxbImChat {
	chat, err := m.GetChatByGidWithExtra(db, gid)
	if err != nil {
		return nil
	}

	if !slices.Contains(chat.Members, userID) {
		return nil
	}

	return chat
}

func (m *XxbImChat) GetChatByGidWithExtra(db *gorm.DB, gid string) (*XxbImChat, error) {
	chat, err := m.GetChatByGid(db, gid)
	if err != nil {
		return nil, err
	}

	if chat.LastMessage != 0 {
		// 加入lastMessageInfo
		var lastMessageInfo *XxbImMessage
		lastMessageInfo, err = lastMessageInfo.GetLastMessage(db, gid, chat.LastMessage)
		if err != nil {
			return nil, err
		}
		if lastMessageInfo != nil {
			lastMessageInfoMap, err := lastMessageInfo.ToMap()
			if err != nil {
				return nil, err
			}
			chat.LastMessageInfo = lastMessageInfoMap
		}
	}

	// 加入members
	var chatUser *XxbImChatUser
	members, err := chatUser.GetMembers(db, chat)
	if err != nil {
		return nil, err
	}

	chat.Members = members
	return chat, err
}

// 查询公共聊天
func (m *XxbImChat) GetPublicChat(db *gorm.DB, chatIDs []string) (chatList []XxbImChat, err error) {
	err = db.Table(m.TableName()).Select("*").Where("public = ? AND dismissDate IS NULL AND mergedDate IS NULL AND archiveDate IS NULL AND gid NOT IN ?",
		"1", chatIDs).Find(&chatList).Error
	if err != nil {
		return chatList, err
	}
	return chatList, err
}

// 定义一个方法，用于处理 ArchiveDate 的转换逻辑
func ConvertDateToInt(date *time.Time) int64 {
	if date == nil || date.Unix() <= 0 {
		return 0
	}
	return int64(date.Unix())
}

// 查询逻辑的方法
func (m *XxbImChat) GetChats(db *gorm.DB, user *User, limitDays int, withSys bool) ([]XxbImChat, error) {
	var chats []struct {
		XxbImChat
		Star                 string `json:"star" gorm:"column:cu_star"`
		Hide                 string `json:"hide" gorm:"column:cu_hide"`
		Mute                 string `json:"mute" gorm:"column:cu_mute"`
		Freeze               string `json:"freeze" gorm:"column:cu_freeze"`
		Category             string `json:"category" gorm:"column:cu_category"`
		LastReadMessage      int64  `json:"lastReadMessage" gorm:"column:cu_lastReadMessage"`
		LastReadMessageIndex int64  `json:"lastReadMessageIndex" gorm:"column:cu_lastReadMessageIndex"`
	}
	var chatUser XxbImChatUser
	query := db.Table(m.TableName()+" AS chat").
		Select(`chat.*,
            cu.star as cu_star, cu.hide as cu_hide, cu.mute as cu_mute, cu.freeze as cu_freeze, cu.category as cu_category,
            cu.lastReadMessage AS cu_lastReadMessage,
            cu.lastReadMessageIndex AS cu_lastReadMessageIndex`).
		Joins("LEFT JOIN "+chatUser.TableName()+" AS cu ON chat.gid = cu.cgid").
		Where("cu.user = ? AND cu.quit IS NULL", user.ID).
		Where(db.Where("chat.dismissDate IS NULL").
			Or("chat.dismissDate > ?", time.Now().AddDate(0, 0, -limitDays).Format(time.DateTime)))

	if err := query.Find(&chats).Error; err != nil {
		return nil, err
	}

	var formattedChats []XxbImChat
	for _, chat := range chats {
		formattedChat := chat.XxbImChat
		formattedChat.Star = chat.Star
		formattedChat.Hide = chat.Hide
		formattedChat.Mute = chat.Mute
		formattedChat.Freeze = chat.Freeze
		formattedChat.Category = chat.Category
		formattedChat.LastReadMessage = chat.LastReadMessage
		formattedChat.LastReadMessageIndex = chat.LastReadMessageIndex
		formattedChats = append(formattedChats, formattedChat)
	}

	if withSys {
		systemChat, _ := m.GetSystemChat(db, user.Account)
		formattedChats = append(formattedChats, *systemChat)
	}

	// 加入lastMessageInfo
	cgIds := make([]string, 0, len(formattedChats))
	msgIds := make([]int64, 0, len(formattedChats))
	for _, chatInfo := range formattedChats {
		cgIds = append(cgIds, chatInfo.Gid)
		msgIds = append(msgIds, chatInfo.LastMessage)
	}

	lastMessages, _ := (&XxbImMessage{}).GetLastMessageList(db, cgIds, msgIds)

	lastMessageMap := make(map[string]*XxbImMessage)
	for i := range lastMessages {
		lastMessageMap[lastMessages[i].CgId] = &lastMessages[i]
	}

	for i, chatInfo := range formattedChats {
		if lastMessageInfo, ok := lastMessageMap[chatInfo.Gid]; ok && lastMessageInfo != nil {
			lastMessageInfoMap, _ := lastMessageInfo.ToMap()
			formattedChats[i].LastMessageInfo = lastMessageInfoMap
		}
	}

	return formattedChats, nil
}

// 查询系统聊天记录的方法
func (m *XxbImChat) GetSystemChat(db *gorm.DB, account string) (*XxbImChat, error) {
	var systemChat XxbImChat
	err := db.Table(m.TableName()).
		Where("type = ?", "system").
		Limit(1).
		Find(&systemChat).Error
	if err != nil {
		return nil, err
	}

	systemConfig, err := GetChatSystemConfig(db, account)
	if err != nil {
		return nil, err
	}

	var lastReadMessage = int64(0)
	if lastReadMessageStr, ok := systemConfig["lastreadid"]; ok && lastReadMessageStr != "" {
		lastReadMessage, _ = strconv.ParseInt(lastReadMessageStr, 10, 64)
	}

	lastReadMessageIndex := int64(0)
	if lastReadMessageIndexStr, ok := systemConfig["lastreadindex"]; ok && lastReadMessageIndexStr != "" {
		lastReadMessageIndex, _ = strconv.ParseInt(lastReadMessageIndexStr, 10, 64)
	}

	systemChat.Star = "1"
	systemChat.Freeze = "0"
	systemChat.Mute = "0"
	systemChat.Hide = "0"
	systemChat.Category = ""
	systemChat.LastReadMessage = lastReadMessage
	systemChat.LastReadMessageIndex = lastReadMessageIndex
	if systemChat.LastMessage == 0 {
		systemChat.LastMessage = lastReadMessage
	}
	if systemChat.LastMessageIndex == 0 {
		systemChat.LastMessageIndex = lastReadMessageIndex
	}

	return &systemChat, nil
}

func (m *XxbImChat) AdminGetChatGroups(db *gorm.DB) ([]XxbImChat, error) {
	var chatList []XxbImChat
	err := db.Table(m.TableName()).Select("*").
		Where("type = ? AND mergedDate IS NULL AND dismissDate IS NULL", "group").
		Find(&chatList).Error
	if err != nil {
		return nil, err
	}
	return chatList, nil
}

func (m *XxbImChat) Search(db *gorm.DB, searchField string, pager *util.Pager, orderBy string) ([]map[string]any, error) {
	var totalCount int64
	var accounts []string
	// 1. 搜索用户账户
	if searchField != "" {
		searchPattern := "%" + searchField + "%"
		err := db.Model(&User{}).
			Select("account").
			Where(
				db.Where("account LIKE ?", searchPattern).
					Or("pinyin LIKE ?", searchPattern).
					Or("realname LIKE ?", searchPattern),
			).
			Where("deleted = 0").
			Pluck("account", &accounts).Error
		if err != nil {
			return nil, err
		}
	}

	// 2. 查询群组成员数量
	chatMemberCounts := make(map[string]int)
	{
		var results []struct {
			GID   string `gorm:"column:gid" json:"gid"`
			Count int    `gorm:"column:memberCount"`
		}

		query := db.Table((&XxbImChatUser{}).TableName()+" AS tcu").
			Joins("LEFT JOIN "+m.TableName()+" AS tc ON tcu.cgid = tc.gid").
			Select("tc.gid, COUNT(*) as memberCount").
			Where("tc.type = ?", "group").
			Where("tc.dismissDate IS NULL AND tc.mergedDate IS NULL AND tcu.quit IS NULL")

		if searchField != "" {
			query = query.Where(
				db.Where("tc.name LIKE ?", "%"+searchField+"%").
					Or("tc.ownedBy IN (?)", accounts),
			)
		}

		err := query.Group("tcu.cgid").Scan(&results).Error
		if err != nil {
			return nil, err
		}

		for _, r := range results {
			chatMemberCounts[r.GID] = r.Count
		}
	}

	// 3. 处理按用户数量排序的分页
	var pagerGids []string
	if orderBy == "userCount_asc" || orderBy == "userCount_desc" {
		// 创建排序结构体
		type sortedChat struct {
			gid   string
			count int
		}
		var sortedChats []sortedChat
		for gid, count := range chatMemberCounts {
			sortedChats = append(sortedChats, sortedChat{gid, count})
		}

		// 排序
		sort.Slice(sortedChats, func(i, j int) bool {
			if orderBy == "userCount_asc" {
				return sortedChats[i].count < sortedChats[j].count
			}
			return sortedChats[i].count > sortedChats[j].count
		})

		// 分页
		start := int((pager.PageID - 1) * pager.RecPerPage)
		end := int(start + int(pager.RecPerPage))
		if start > len(sortedChats) {
			start = len(sortedChats)
		}
		if end > len(sortedChats) {
			end = len(sortedChats)
		}

		for _, sc := range sortedChats[start:end] {
			pagerGids = append(pagerGids, sc.gid)
		}
	}

	// 4. 查询群组详细信息
	query := db.Select("tc.gid, tc.id, tc.name, tc.public, "+
		"tu.id as groupOwner, tc.createdDate, "+
		"tc.lastActiveTime, tc.archiveDate").
		Table(m.TableName()+" AS tc").
		Joins("LEFT JOIN "+(&User{}).TableName()+" AS tu ON tc.ownedBy = tu.account").
		Where("tc.type = ?", "group").
		Where("tc.dismissDate IS NULL AND tc.mergedDate IS NULL")

	if searchField != "" {
		query = query.Where(
			db.Where("tc.name LIKE ?", "%"+searchField+"%").
				Or("tc.ownedBy IN (?)", accounts),
		)
	}

	if len(pagerGids) > 0 {
		query = query.Where("tc.gid IN (?)", pagerGids)
	} else {
		// 应用其他排序条件
		if orderBy != "" {
			orderbySplit := strings.Split(orderBy, "_")
			orderbyField := orderbySplit[0]
			orderbyType := orderbySplit[1]
			query = query.Order(orderbyField + " " + orderbyType)
		}
	}

	// 分页处理（仅当不是按用户数量排序时）
	offset := (pager.PageID - 1) * pager.RecPerPage
	query = query.Offset(int(offset)).Limit(int(pager.RecPerPage))

	// 先计算总数
	query.Count(&totalCount)
	pager.RecTotal = totalCount

	rows, err := query.Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []map[string]any
	for rows.Next() {
		var chatInfo struct {
			GID            string `gorm:"column:gid" json:"gid"`
			ID             int64
			Name           string
			Public         int64
			GroupOwner     int64     `gorm:"column:groupOwner"`
			CreatedDate    time.Time `gorm:"column:createdDate"`
			LastActiveTime time.Time `gorm:"column:lastActiveTime"`
			ArchiveDate    time.Time `gorm:"column:archiveDate"`
		}
		err = db.ScanRows(rows, &chatInfo)
		if err != nil {
			return nil, err
		}
		userCount := chatMemberCounts[chatInfo.GID]

		// 转换时间格式
		createdDate := ConvertDateToInt(&chatInfo.CreatedDate)
		lastActiveTime := ConvertDateToInt(&chatInfo.LastActiveTime)
		archiveDate := ConvertDateToInt(&chatInfo.ArchiveDate)

		chats = append(chats, map[string]any{
			"id":             chatInfo.ID,
			"gid":            chatInfo.GID,
			"name":           chatInfo.Name,
			"public":         chatInfo.Public == 1,
			"groupOwner":     chatInfo.GroupOwner,
			"createdDate":    createdDate,
			"archiveDate":    archiveDate,
			"lastActiveTime": lastActiveTime,
			"userCount":      userCount,
		})
	}

	// 5. 按用户数量排序时的最终排序（保持PHP逻辑）
	if orderBy == "userCount_asc" || orderBy == "userCount_desc" {
		var sortedChats []map[string]any
		for _, gid := range pagerGids {
			for _, chat := range chats {
				if chat["gid"] == gid {
					sortedChats = append(sortedChats, chat)
					break
				}
			}
		}
		chats = sortedChats
	}

	return chats, nil
}

// 根据owdedBy查询userIds
func (m *XxbImChat) GetUserIdsByOwnedBy(db *gorm.DB, gid string) (int64, error) {
	var user User
	err := db.Table((&XxbImChat{}).TableName()+" AS t1").
		Select("t2.id").
		Joins("LEFT JOIN "+(&User{}).TableName()+" AS t2 ON t1.ownedBy = t2.account").
		Where("t1.gid = ?", gid).
		First(&user).Error
	if err != nil {
		return 0, err
	}
	return user.ID, nil
}

func (m *XxbImChat) PinMessages(db *gorm.DB, chat *XxbImChat, messageIds []int64) ([]int64, error) {
	pinnedMessages := chat.PinnedMessages
	var xxbMessage XxbImMessage

	// 移除已删除的消息
	var validMessageIds []int64
	if pinnedMessages != "" && pinnedMessages != ",," {
		ids := util.StringToInt64Slice(pinnedMessages, true)
		messageList, err := xxbMessage.GetMessageByIds(db, ids)
		if err != nil {
			return nil, err
		}

		for _, message := range messageList {
			if message.Deleted != "1" {
				validMessageIds = append(validMessageIds, message.ID)
			}
		}
	}

	// 限制置顶消息数量
	if len(validMessageIds) > 10 {
		validMessageIds = validMessageIds[:10]
	}

	pinnedMessageIds := util.ArrayMerge(validMessageIds, messageIds)
	// 用逗号拼接int数组
	pinnedMessages = ""
	for _, id := range pinnedMessageIds {
		idStr := strconv.FormatInt(id, 10)
		if pinnedMessages != "" {
			pinnedMessages += ","
		}
		pinnedMessages += idStr
	}
	pinnedMessages = "," + pinnedMessages + ","
	// 更新pinnedMessages字段
	err := db.Model(&XxbImChat{}).Where("id = ?", chat.Id).Update("pinnedMessages", pinnedMessages).Error
	if err != nil {
		return nil, err
	}

	util.InvalidateChatCache(chat.Gid)

	// 获取新的聊天信息，这里假设 GetChatByGid 方法会返回更新后的 XxbImChat 结构体
	newChatInfo, err := m.GetChatByGid(db, chat.Gid)
	if err != nil {
		return nil, err
	}

	return util.StringToInt64Slice(newChatInfo.PinnedMessages, true), nil
}

// 取消置顶消息
func (m *XxbImChat) UnpinMessages(db *gorm.DB, chat *XxbImChat, messageIds []int64) ([]int64, error) {
	pinnedMessages := strings.Split(chat.PinnedMessages, ",")

	// 遍历要取消置顶的消息 ID 列表，从已置顶消息中移除它们
	var validMessageIds []string
	for _, id := range pinnedMessages {
		if id == "" {
			continue
		}
		intId, err := strconv.ParseInt(id, 10, 64)
		if err != nil {
			continue
		}
		if !util.IntSliceContains(messageIds, intId) {
			validMessageIds = append(validMessageIds, id)
		}
	}

	pinnedMessagesFormat := strings.Join(validMessageIds, ",")
	pinnedMessagesFormat = "," + pinnedMessagesFormat + ","

	// 更新数据库中聊天记录的置顶消息字段
	err := db.Model(&XxbImChat{}).Where("id =?", chat.Id).Update("pinnedMessages", pinnedMessagesFormat).Error
	if err != nil {
		return nil, err
	}

	util.InvalidateChatCache(chat.Gid)

	// 获取更新后的聊天信息并解析出新的置顶消息 ID 列表
	newChatInfo, err := m.GetChatByGid(db, chat.Gid)
	if err != nil {
		return nil, err
	}

	return util.StringToInt64Slice(newChatInfo.PinnedMessages, true), nil
}

func (m *XxbImChat) SetLastReadMessageByIndex(db *gorm.DB, gid string, lastReadMessageIndex int64, userInfo User) error {
	var xxbMessage XxbImMessage
	var imChatUser XxbImChatUser
	message, err := xxbMessage.GetMessageByIndex(db, lastReadMessageIndex, gid)
	if err != nil {
		return err
	}

	// 更新聊天用户信息
	affected, err := imChatUser.UpdateLastReadMessage(db, gid, userInfo.ID, lastReadMessageIndex, message.ID)
	if err != nil {
		return err
	}

	if affected == 0 {
		var systemChatGidList []string
		// 查询系统聊天的 GID 列表
		result := db.Table(m.TableName()).
			Select("gid").
			Where("type = ?", "system").
			Scan(&systemChatGidList)
		if result.Error != nil {
			return result.Error
		}

		for _, g := range systemChatGidList {
			if g == gid {
				// 设置系统聊天的最后阅读 ID 和索引
				if _, err = SetItem(db, userInfo.Account+".chat.system.lastreadid", strconv.FormatInt(message.ID, 10), ""); err != nil {
					return err
				}

				if _, err = SetItem(db, userInfo.Account+".chat.system.lastreadindex", strconv.FormatInt(lastReadMessageIndex, 10), ""); err != nil {
					return err
				}
				break
			}
		}
	}
	return nil
}

// 实现合并聊天的功能
func (m *XxbImChat) ChatMerge(db *gorm.DB, chat, targetChat *XxbImChat, user *User) (*XxbImChat, error) {
	if (!chat.IsOwner(db, user.Account) || !targetChat.IsOwner(db, user.Account)) &&
		!user.IsSuper() {
		return nil, errors.New("permission denied")
	}
	if chat.IsMerged() {
		return nil, errors.New("chat already merged")
	}

	// 标记聊天为已合并
	now := time.Now()
	err := db.Model(&XxbImChat{}).Where("gid = ?", chat.Gid).Update("mergedDate", now).Error
	if err != nil {
		return nil, err
	}
	chat.MergedDate = &now

	//Merge previously merged chats.
	prevMergedChats := util.StringToStringSlice(chat.MergedChats)
	currMergedChats := util.StringToStringSlice(targetChat.MergedChats)
	mergedChats := append([]string{chat.Gid}, prevMergedChats...)
	mergedChats = append(mergedChats, currMergedChats...)

	mergedChatsStr := strings.Join(mergedChats, ",")
	err = db.Model(&XxbImChat{}).Where("gid = ?", targetChat.Gid).Update("mergedChats", mergedChatsStr).Error
	if err != nil {
		return nil, err
	}

	util.InvalidateChatCache(targetChat.Gid)

	// 合并成员
	for _, memberID := range chat.Members {
		// 假设 leave 和 join 是你定义的函数
		err = m.Leave(db, chat.Gid, memberID)
		if err != nil {
			return nil, err
		}
		_, err = m.Join(db, targetChat.Gid, memberID)
		if err != nil {
			return nil, err
		}
	}
	info, _ := m.GetChatByGidWithExtra(db, targetChat.Gid)
	return info, nil
}

func (m *XxbImChat) IsCommitter(db *gorm.DB, message XxbImMessage, userInfo User) bool {
	members := strings.Split(message.CgId, "&")
	if len(members) == 2 && !util.StringSliceContains(members, strconv.FormatInt(userInfo.ID, 10)) {
		return false
	}
	if m.IsArchived() {
		return false
	}

	/* Check if user is in the group. */
	if m.Type != "group" && message.Type == "normal" {
		var xxbChatUser XxbImChatUser
		chatMembers, _ := xxbChatUser.GetMembers(db, m)
		if !util.IntSliceContains(chatMembers, userInfo.ID) {
			return false
		}
	}
	/* Check if user is in committers. */
	if m.Committers != "" {
		if m.Committers == "$ADMINS" {
			if !m.IsAdmin(userInfo) {
				return false
			}
		} else {
			committers := strings.Split(m.Committers, ",")
			if !util.StringSliceContains(committers, strconv.FormatInt(userInfo.ID, 10)) {
				return false
			}
		}
	}
	return true
}

// 根据用户 ID 获取聊天 gid 列表
func (m *XxbImChat) GetGidListByUserID(db *gorm.DB, userID int64, includeMerged bool) ([]string, error) {
	var systemChatGidList []string
	// 查询系统聊天的 gid 列表
	result := db.Table(m.TableName()).Select("gid").Where("type = ?", "system").Find(&systemChatGidList)
	if result.Error != nil {
		return nil, result.Error
	}

	var gidList []string
	query := db.Table((&XxbImChat{}).TableName()+" AS t1").
		Select("t1.gid").
		Joins("LEFT JOIN "+(&XxbImChatUser{}).TableName()+" AS t2 ON t2.cgid = t1.gid").
		Where("t2.user = ?", userID)

	if includeMerged {
		query = query.Where("t2.quit = '1970-01-01 00:00:00' OR t1.mergedDate != '1970-01-01 00:00:00'")
	} else {
		query = query.Where("t2.quit = '1970-01-01 00:00:00'")
	}

	// 使用 Group 方法去重
	result = query.Group("t1.gid").Find(&gidList)
	if result.Error != nil {
		return nil, result.Error
	}

	// 合并两个列表
	allGidList := append(systemChatGidList, gidList...)
	return allGidList, nil
}

func (m *XxbImChat) HasBotChat(chatList []XxbImChat) bool {
	for _, chat := range chatList {
		if IsXuanBot(chat.Gid) {
			return true
		}
	}
	return false
}

func (m *XxbImChat) FilterUsers(db *gorm.DB, userIDs []int64) []int64 {
	if m.Type == "group" {
		imChatUser := XxbImChatUser{}
		members, err := imChatUser.GetMembers(db, m)
		if err != nil {
			return []int64{}
		}

		return util.Int64Intersect(members, userIDs)
	}
	if m.Type == "one2one" {
		memberStrs := strings.Split(m.Gid, "&")
		members := []int64{}
		for _, memberStr := range memberStrs {
			memberID, _ := strconv.ParseInt(memberStr, 10, 64)
			members = append(members, memberID)
		}
		return util.Int64Intersect(members, userIDs)
	}
	return userIDs
}

func (m *XxbImChat) GetGroupPairs(db *gorm.DB) (map[string]string, error) {
	var chats []XxbImChat
	if err := db.Table(m.TableName()).
		Select("gid", "name").
		Where("type = ?", "group").
		Where("dismissDate IS NULL").
		Find(&chats).Error; err != nil {
		return nil, err
	}

	chatPairs := make(map[string]string, len(chats))
	for _, chat := range chats {
		chatPairs[chat.Gid] = chat.Name
	}

	return chatPairs, nil
}

func (m *XxbImChat) GetUserPairs(db *gorm.DB, gid string) (map[int64]string, error) {
	var userIDs []int64
	query := db.Model(&XxbImChatUser{}).
		Where("quit IS NULL")

	if gid != "" {
		query = query.Where("cgid = ?", gid)
	}

	if err := query.Pluck("user", &userIDs).Error; err != nil {
		return nil, err
	}

	if len(userIDs) == 0 {
		return make(map[int64]string), nil
	}

	var users []User
	if err := db.Model(&User{}).
		Select("id", "realname").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return nil, err
	}

	userPairs := make(map[int64]string, len(users))
	for _, u := range users {
		userPairs[u.ID] = u.RealName
	}

	return userPairs, nil
}
