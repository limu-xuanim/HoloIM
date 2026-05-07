package model

import (
	"fmt"
	"sort"
	"strings"
	"time"
	"xxd/util"

	"github.com/goccy/go-json"
	"gorm.io/gorm"
)

type XxbImChatUser struct {
	ID                   int64      `json:"id" gorm:"column:id;primary_key;auto_increment"`
	CGid                 string     `json:"cgid" gorm:"column:cgid"`
	User                 int64      `json:"user" gorm:"column:user"`
	Order                int64      `json:"order" gorm:"column:order"`
	Star                 string     `json:"star" gorm:"column:star"`
	Hide                 string     `json:"hide" gorm:"column:hide"`
	Mute                 string     `json:"mute" gorm:"column:mute"`
	Freeze               string     `json:"freeze" gorm:"column:freeze"`
	Join                 time.Time  `json:"join" gorm:"column:join"`
	Quit                 *time.Time `json:"quit" gorm:"column:quit"`
	Category             string     `json:"category" gorm:"column:category"`
	LastReadMessage      int64      `json:"lastReadMessage" gorm:"column:lastReadMessage"`
	LastReadMessageIndex int64      `json:"lastReadMessageIndex" gorm:"column:lastReadMessageIndex"`
}

type MemberDetail struct {
	ID       int64     `gorm:"column:id" json:"id"`
	Account  string    `gorm:"column:account" json:"account"`
	Join     time.Time `gorm:"column:join" json:"join"`
	LastSeen time.Time `gorm:"column:lastSeen" json:"lastSeen"`
	LastPost time.Time `gorm:"column:lastPost" json:"lastPost"`
	IsOwner  string    `gorm:"column:isOwner" json:"isOwner"`
	IsAdmin  string    `gorm:"column:isAdmin" json:"isAdmin"`
}

func (m *MemberDetail) ToMap() (map[string]any, error) {

	jsonBytes, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		return nil, err
	}

	// 将所有的time字段转为时间戳
	result["join"] = ConvertDateToInt(&m.Join)
	result["lastSeen"] = ConvertDateToInt(&m.LastSeen)
	result["lastPost"] = ConvertDateToInt(&m.LastPost)

	return result, err
}

func ConvertMemberDetailsSlice(memberDetails []MemberDetail) []any {
	memberDetailSlice := make([]any, 0)
	for _, memberDetail := range memberDetails {
		memberDetailMap, _ := memberDetail.ToMap()
		memberDetailSlice = append(memberDetailSlice, memberDetailMap)
	}

	return memberDetailSlice
}

// TableName 表名称
func (*XxbImChatUser) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_chatuser"
}

// 设置freeze
func (i *XxbImChatUser) SetFreeze(db *gorm.DB, cgid string, freeze bool, userId int64) error {
	freezeStr := "0"
	if freeze {
		freezeStr = "1"
	}
	err := db.Table(i.TableName()).Where("cgid = ? and user = ?", cgid, userId).Update("freeze", freezeStr).Error
	if err != nil {
		return err
	}
	return nil
}

// 设置mute
func (i *XxbImChatUser) SetMute(db *gorm.DB, cgid string, mute bool, userId int64) error {
	muteStr := "0"
	if mute {
		muteStr = "1"
	}
	err := db.Table(i.TableName()).Where("cgid = ? and user = ?", cgid, userId).Update("mute", muteStr).Error
	if err != nil {
		return err
	}
	return nil
}

// 设置star
func (i *XxbImChatUser) SetStar(db *gorm.DB, cgid string, star bool, userId int64) error {
	starStr := "0"
	if star {
		starStr = "1"
	}
	err := db.Table(i.TableName()).Where("cgid = ? and user = ?", cgid, userId).Update("star", starStr).Error
	if err != nil {
		return err
	}
	return nil
}

// 查询用户加入的聊天的cgid
func (i *XxbImChatUser) GetCgIdListByUser(db *gorm.DB, userID int64) ([]string, error) {
	var cgids []string
	var systemCgids []string
	err := db.Table((&XxbImChat{}).TableName()).Select("gid").Where("type = ?", "system").Find(&systemCgids).Error
	if err != nil {
		return cgids, err
	}
	err = db.Table(i.TableName()).Select("cgid").Where("user = ? and quit IS NULL", userID).Find(&cgids).Error
	if err != nil {
		return cgids, err
	}
	cgids = append(cgids, systemCgids...)
	return cgids, nil
}

func (*XxbImChatUser) GetInfoByChat(db *gorm.DB, cgid string, userID int64) (XxbImChatUser, error) {
	var chatUser XxbImChatUser
	err := db.Where("cgid = ? and user = ? and quit IS NULL", cgid, userID).First(&chatUser).Error
	if err != nil {
		return chatUser, err
	}
	return chatUser, nil
}

func (m *XxbImChatUser) GetMembers(db *gorm.DB, chatInfo *XxbImChat) ([]int64, error) {
	// system 类型不缓存（返回所有用户）
	if chatInfo.Type == "system" {
		var userIds []int64
		var user User
		_ = db.Table(user.TableName()).Select("id").Where("deleted = ?", "0").Scan(&userIds).Error
		return userIds, nil
	}

	// 先从缓存获取
	if cached, ok := util.GetChatMembersFromCache(chatInfo.Gid); ok {
		return cached, nil
	}

	// 缓存未命中，从数据库查询
	var userIds []int64
	err := db.Table(m.TableName()).Select("user").
		Joins(fmt.Sprintf("LEFT JOIN %s ON %s.user = %s.id", (&User{}).TableName(), m.TableName(), (&User{}).TableName())).
		Where(fmt.Sprintf("%s.quit IS NULL", m.TableName())).
		Where(fmt.Sprintf("%s.deleted = ?", (&User{}).TableName()), "0").
		Where("cgid = ?", chatInfo.Gid).
		Scan(&userIds).Error
	if err != nil {
		return nil, err
	}

	// 写入缓存
	if len(userIds) > 0 {
		util.SetChatMembersToCache(chatInfo.Gid, userIds)
	}

	return userIds, nil
}

func (u *XxbImChatUser) GetMembersDetail(db *gorm.DB, cgId string, memberIds []int64, orderBy string, pager util.Pager) ([]MemberDetail, util.Pager, error) {
	var memberDetails []MemberDetail
	chatInfo, err := (&XxbImChat{}).GetChatByGid(db, cgId)
	if err != nil {
		return memberDetails, pager, err
	}
	if chatInfo.Id == 0 || chatInfo.Type == "system" {
		return memberDetails, pager, nil
	}

	// 基础查询：连接表并筛选
	query := db.Table((&XxbImChatUser{}).TableName()+" tcu").
		Joins("JOIN "+(&User{}).TableName()+" tu ON tcu.user = tu.id").
		Where("tcu.cgid = ?", cgId).
		Where("tcu.quit IS NULL").
		Where("tu.deleted = ?", "0")

	if len(memberIds) > 0 {
		query = query.Where("tcu.user IN ?", memberIds)
	}

	// 执行查询
	err = query.
		Select("tcu.user as id, tu.account, tcu.join, tu.last as lastSeen, NULL as lastPost, 0 as isOwner, 0 as isAdmin").
		Find(&memberDetails).Error

	if err != nil {
		return nil, pager, err
	}

	// Get date of members' last message in chat.
	memberIds = []int64{}
	for _, memberDetail := range memberDetails {
		memberIds = append(memberIds, memberDetail.ID)
	}

	ownerAcount := chatInfo.OwnedBy
	if ownerAcount == "" {
		ownerAcount = chatInfo.CreatedBy
	}

	lastMessageDates, err := (&XxbImMessage{}).GetMembersLastMessage(db, cgId, memberIds)
	if err != nil {
		return nil, pager, err
	}
	for i, memberDetail := range memberDetails {
		memberDetails[i].LastPost = lastMessageDates[memberDetail.ID]
		// set admin
		if strings.Contains(chatInfo.Admins, fmt.Sprintf(",%d,", memberDetail.ID)) {
			memberDetails[i].IsAdmin = "1"
		}
		// set owner
		if memberDetail.Account == ownerAcount {
			memberDetails[i].IsOwner = "1"
		}
	}

	// 对memberDetail进行排序,按照 IsOwner desc IsAdmin desc join desc
	if orderBy == "" || strings.Contains(orderBy, "member_") {
		sort.Slice(memberDetails, func(i, j int) bool {
			if memberDetails[i].IsOwner != memberDetails[j].IsOwner {
				return memberDetails[i].IsOwner > memberDetails[j].IsOwner
			}
			if memberDetails[i].IsAdmin != memberDetails[j].IsAdmin {
				return memberDetails[i].IsAdmin > memberDetails[j].IsAdmin
			}
			return memberDetails[i].Join.After(memberDetails[j].Join)
		})
	} else {
		orderByPorps := strings.Split(orderBy, "_")
		field := orderByPorps[0]
		order := "asc"
		if len(orderByPorps) > 1 {
			order = orderByPorps[1]
		}

		sort.Slice(memberDetails, func(i, j int) bool {
			switch strings.ToLower(field) {
			case "join":
				if order == "asc" {
					return memberDetails[i].Join.Before(memberDetails[j].Join)
				}
				return memberDetails[i].Join.After(memberDetails[j].Join)
			case "lastseen":
				if order == "asc" {
					return memberDetails[i].LastSeen.Before(memberDetails[j].LastSeen)
				}
				return memberDetails[i].LastSeen.After(memberDetails[j].LastSeen)
			case "lastpost":
				if order == "asc" {
					return memberDetails[i].LastPost.Before(memberDetails[j].LastPost)
				}
				return memberDetails[i].LastPost.After(memberDetails[j].LastPost)
			default:
				return false // 不支持的字段
			}
		})
	}

	// 根据pager的信息，对memberDetails进行分页
	recTotal := int64(len(memberDetails))
	pager.RecTotal = recTotal

	if pager.RecPerPage*(pager.PageID-1) >= recTotal {
		if pager.RecPerPage > 0 {
			pager.PageID = (recTotal + pager.RecPerPage - 1) / pager.RecPerPage
		} else {
			pager.PageID = 1
		}
	}
	startIndex := pager.RecPerPage * (pager.PageID - 1)
	if startIndex >= recTotal || startIndex < 0 {
		return []MemberDetail{}, pager, nil
	}
	endIndex := startIndex + pager.RecPerPage
	if endIndex > recTotal {
		endIndex = recTotal
	}
	memberDetails = memberDetails[startIndex:endIndex]

	return memberDetails, pager, nil
}

func (m *XxbImChatUser) UpdateLastReadMessage(db *gorm.DB, gid string, userID int64, lastReadMessageIndex int64, messageID int64) (int64, error) {
	var affected int64
	err := db.Table(m.TableName()).Where("cgid = ? AND user = ?", gid, userID).
		Updates(map[string]any{
			"lastReadMessageIndex": lastReadMessageIndex,
			"lastReadMessage":      messageID,
		}).Count(&affected).Error
	if err != nil {
		return affected, err
	}
	return affected, nil
}

func (m *XxbImChatUser) GetMembersByGidAndStatus(db *gorm.DB, gid, status string) ([]int64, error) {
	var imChat XxbImChat
	err := db.Table(imChat.TableName()).Select("*").Where("gid = ?", gid).Find(&imChat).Error
	if err != nil {
		return nil, err
	}
	var userIds []int64
	if imChat.Type == "system" {
		var user User
		_ = db.Table(user.TableName()).Select("id").Where("deleted = ?", "0").Find(&userIds).Error
		return userIds, nil
	} else {

		query := db.Table(m.TableName()).Select("user").
			Joins(fmt.Sprintf("LEFT JOIN %s ON %s.user = %s.id", util.Config.Mysql.TablePrefix+"user", m.TableName(), util.Config.Mysql.TablePrefix+"user")).
			Where(fmt.Sprintf("%s.quit IS NULL", m.TableName())).
			Where(fmt.Sprintf("%s.deleted = ?", util.Config.Mysql.TablePrefix+"user"), "0").
			Where("cgid = ?", imChat.Gid)
		if status != "" {
			if status == "online" {
				query = query.Where(fmt.Sprintf("%s.clientStatus  <> ? ", util.Config.Mysql.TablePrefix+"user"), "offline")
			} else {
				query = query.Where(fmt.Sprintf("%s.clientStatus = ?", util.Config.Mysql.TablePrefix+"user"), status)
			}
		}
		err = query.Find(&userIds).Error
		if err != nil {
			return nil, err
		}
		return userIds, nil
	}
}

func (m *XxbImChatUser) IsInChat(db *gorm.DB, gid string, userID int64) bool {
	var imChat XxbImChat
	err := db.Table(imChat.TableName()).Select("*").Where("gid = ?", gid).Find(&imChat).Error
	return err == nil
}
