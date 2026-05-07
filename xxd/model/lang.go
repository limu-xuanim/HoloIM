package model

import (
	"errors"
	"xxd/lang"
	"xxd/util"

	"gorm.io/gorm"
)

type XxbLang struct {
	ID      int64  `json:"id" gorm:"column:id"`
	Lang    string `json:"lang" gorm:"column:lang"`
	Module  string `json:"module" gorm:"column:module"`
	Section string `json:"section" gorm:"column:section"`
	Key     string `json:"key" gorm:"column:key"`
	Value   string `json:"value" gorm:"column:value"`
	System  string `json:"system" gorm:"column:system"`
}

func (*XxbLang) TableName() string {
	return util.Config.Mysql.SysPrefix + "lang"
}
func (*XxbLang) CreateXxbLang(db *gorm.DB, lang *XxbLang) (int64, error) {
	// 检查是否已存在相同的记录
	var existingLang XxbLang
	result := db.Where("`lang` = ? AND `module` = ? AND `section` = ? AND`key` = ? AND `system` = ?",
		lang.Lang, lang.Module, lang.Section, lang.Key, lang.System).First(&existingLang)

	if result.Error == nil {
		existingLang.Value = lang.Value
		if err := db.Save(&existingLang).Error; err != nil {
			return 0, err
		}
		return existingLang.ID, nil // 返回更新记录的 ID
	} else if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 如果不存在相同的记录，则插入新记录
		if err := db.Create(lang).Error; err != nil {
			return 0, err
		}
		return lang.ID, nil // 返回新记录的 ID
	} else {
		// 其他错误
		return 0, result.Error
	}
}

type RoleKeyValue struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func GetAllRoles() ([]RoleKeyValue, error) {
	db := util.MysqlDB
	langKey := util.Config.Lang
	var roleList []RoleKeyValue
	err := db.Model(&XxbLang{}).Select("key", "value").Where("module = ? AND section = ? AND lang IN (?)", "user", "roleList", []string{langKey, "all"}).Find(&roleList).Error
	if len(roleList) == 0 {
		return GetDefaultRoles(), nil
	}
	return roleList, err
}

func GetDefaultRoles() []RoleKeyValue {
	roleList := []RoleKeyValue{
		{Key: "dev", Value: lang.Get("position.dev")},
		{Key: "pm", Value: lang.Get("position.pm")},
		{Key: "market", Value: lang.Get("position.market")},
		{Key: "sale", Value: lang.Get("position.sale")},
		{Key: "hr", Value: lang.Get("position.hr")},
		{Key: "office", Value: lang.Get("position.office")},
		{Key: "service", Value: lang.Get("position.service")},
		{Key: "support", Value: lang.Get("position.support")},
		{Key: "marketmgr", Value: lang.Get("position.marketmgr")},
		{Key: "salemgr", Value: lang.Get("position.salemgr")},
		{Key: "hrmgr", Value: lang.Get("position.hrmgr")},
		{Key: "adminmgr", Value: lang.Get("position.adminmgr")},
		{Key: "servicemgr", Value: lang.Get("position.servicemgr")},
		{Key: "supportmgr", Value: lang.Get("position.supportmgr")},
		{Key: "top", Value: lang.Get("position.top")},
		{Key: "others", Value: lang.Get("position.others")},
	}

	return roleList
}
