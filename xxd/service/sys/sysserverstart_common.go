package sys

import (
	"errors"
	"time"
	"xxd/lang"
	"xxd/model"
	"xxd/util"

	"gorm.io/gorm"
)

// 初始化系统聊天
func (sys *SysService) chatInitSystemChat(db *gorm.DB) {
	if true {
		var chat model.XxbImChat
		err := db.Where("type = ?", "system").First(&chat).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果不存在，创建新的系统聊天
			chat = model.XxbImChat{
				Gid:         util.CreateGID(),
				Name:        lang.Get("service.sys.systemName"),
				Type:        "system",
				CreatedBy:   "system",
				CreatedDate: time.Now(),
			}
			if err = db.Create(&chat).Error; err != nil {
				util.Log("error", util.GetLang("[SysServerStart]", " ", "create system chat failed: %s"), err)
				return
			}
		} else if err != nil {
			util.Log("error", util.GetLang("[SysServerStart]", " ", "create system chat failed: %s"), err)
			return
		}
		util.Log("info", util.GetLang("[SysServerStart]", " ", "create system chat successful"))
		return
	}
}

func (sys *SysService) setXxdStartTime(db *gorm.DB) {
	id, err := model.SetItem(db, "system.common.xxd.start", time.Now().Format(time.DateTime), "")
	if err != nil {
		util.Log("error", util.GetLang("[SysServerStart]", " ", "set xxd start time error: %s"), err)
		return
	}
	util.Log("info", util.GetLang("[SysServerStart]", " ", "set xxd start time id: %d"), id)
}

// 用户复位状态
func (sys *SysService) userResetStatus(db *gorm.DB) {
	var user model.User
	err := user.ResetStatus(db, "offline")
	if err != nil {
		util.Log("error", util.GetLang("[SysServerStart]", " ", "user reset status error: %s"), err)
	}
}

// 重置拼音
func (sys *SysService) userReindexPinyin(db *gorm.DB, users []int64) {
	// 查询符合条件的用户
	var realNames []model.User
	query := db.Select("id, realname")
	if len(users) > 0 {
		query = query.Where("id IN ?", users)
	}
	if err := query.Find(&realNames).Error; err != nil {
		util.Log("error", util.GetLang("[SysServerStart]", " ", "user reindex pinyin error: %s"), err)
		return
	}

	// 提取 realName 并转换为拼音
	names := make([]string, 0, len(realNames))
	idToName := make(map[int64]string) // 用于存储 id 和 realname 的映射
	for _, user := range realNames {
		names = append(names, user.RealName)
		idToName[user.ID] = user.RealName
	}
	pinyinMap := util.ConvertPinyin(names)

	// 构建批量更新数据
	updates := make([]map[string]any, 0, len(realNames))
	for id, realName := range idToName {
		if pinyin, ok := pinyinMap[realName]; ok {
			updates = append(updates, map[string]any{
				"id":     id,
				"pinyin": pinyin,
			})
		}
	}

	// 执行批量更新
	if err := db.Transaction(func(tx *gorm.DB) error {
		for _, update := range updates {
			if err := tx.Model(&model.User{}).Where("id = ?", update["id"]).Update("pinyin", update["pinyin"]).Error; err != nil {
				return err // 返回错误，事务会回滚
			}
		}
		return nil
	}); err != nil {
		util.Log("error", util.GetLang("[SysServerStart]", " ", "user reindex pinyin error: %s"), err)
		return
	}

	util.Log("info", util.GetLang("[SysServerStart]", " ", "user reindex pinyin completed successfully"))
}
