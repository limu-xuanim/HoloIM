package model

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

type Action struct {
	ID         int64     `json:"id" gorm:"column:id"`
	ObjectType string    `json:"objectType" gorm:"column:objectType"`
	ObjectId   int64     `json:"objectID" gorm:"column:objectID"`
	Ip         string    `json:"ip" gorm:"column:ip"`
	Actor      string    `json:"actor" gorm:"column:actor"`
	Action     string    `json:"action" gorm:"column:action"`
	Result     string    `json:"result" gorm:"column:result"`
	Date       time.Time `json:"date" gorm:"column:date"`
	Comment    string    `json:"comment" gorm:"column:comment"`
	Extra      string    `json:"extra" gorm:"column:extra"`
}

// TableName 表名称
func (*Action) TableName() string {
	return util.Config.Mysql.SysPrefix + "action"
}

// 添加用户操作记录
func (a *Action) AddUserAction(db *gorm.DB, account string, objectType string, objectID int64, actionType string, result string, comment string, clientIP string) (int64, error) {
	extra, _ := json.Marshal(map[string]int64{
		"actorId": objectID,
	})
	action := Action{
		ObjectType: strings.ToLower(objectType),
		ObjectId:   objectID,
		Ip:         clientIP,
		Result:     strings.ToLower(result),
		Actor:      account, // 保持原有 actor 逻辑
		Action:     strings.ToLower(actionType),
		Date:       time.Now(),
		Comment:    comment,
		Extra:      string(extra),
	}
	// 使用 GORM 进行插入操作
	err := db.Create(&action).Error
	if err != nil {
		return 0, err
	}
	// 返回插入记录的 ID
	return action.ID, nil
}

// HasChanges 检查在指定时间间隔内是否有对象被创建/编辑/删除
func (a *Action) HasChanges(db *gorm.DB, objectType string, pollingInterval int) ([]int64, error) {
	if pollingInterval <= 0 {
		pollingInterval = 60 // 默认60秒
	}

	var objectIDs []int64

	// 计算查询的时间点
	timeStr := time.Now().Add(-time.Duration(pollingInterval) * time.Second)

	err := db.Model(&Action{}).
		Select("DISTINCT objectID").
		Where("objectType = ?", objectType).
		Where("action IN (?)", []string{"create", "edit", "delete"}).
		Where("date > ?", timeStr).
		Pluck("objectID", &objectIDs).Error

	if err != nil {
		return nil, err
	}

	return objectIDs, nil
}

// GetListSinceLastPoll 获取自上次轮询以来的特定操作记录（与PHP版本逻辑完全一致）
func (a *Action) GetListSinceLastPoll(db *gorm.DB, actionType string) ([]Action, error) {
	pollingInterval := util.Config.PollingInterval

	var actions []Action

	// 获取lastPoll时间并计算查询时间点
	lastpollStr := GetItem(db, "owner=system&module=common&section=xxd&key=lastPoll", "config")
	lastpoll := util.ParseLocalTime(lastpollStr)
	if lastpoll == nil {
		return nil, errors.New("lastPoll time is invalid")
	}
	lastPollTime := lastpoll.Add(-time.Duration(2*pollingInterval) * time.Second)

	var user User
	var history History

	switch actionType {
	case "changepassword":
		// 密码更改操作需要联表查询 action、history、user 表
		err := db.Table(a.TableName()+" t1").
			Select("t1.id, t1.objectID, t1.date").
			Joins("LEFT JOIN "+history.TableName()+" t2 ON t1.id = t2.action").
			Joins("LEFT JOIN "+user.TableName()+" t3 ON t1.objectID = t3.id").
			Where("t3.clientStatus != ?", "offline").
			Where("t1.objectType = ?", "user").
			Where("t2.field = ?", "password").
			Where("t1.action = ?", "edited").
			Where("t1.date > ?", lastPollTime.Format(time.DateTime)).
			Order("t1.date DESC").
			Find(&actions).Error
		if err != nil {
			return nil, err
		}
	case "loginxuanxuan":
		// 登录操作查询
		err := db.Table(a.TableName()).
			Select("id, objectID, date").
			Where("date > ?", lastPollTime.Format(time.DateTime)).
			Where("action = ?", "loginxuanxuan").
			Order("date DESC").
			Find(&actions).Error
		if err != nil {
			return nil, err
		}
	}

	// 去重逻辑：确保每个objectID只出现一次
	var uniqueActions []Action
	for _, action := range actions {
		exist := false
		for _, uniqueAction := range uniqueActions {
			if uniqueAction.ObjectId == action.ObjectId {
				exist = true
				break
			}
		}
		if !exist {
			uniqueActions = append(uniqueActions, action)
		}
	}

	return uniqueActions, nil
}
