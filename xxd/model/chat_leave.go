package model

import (
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

func (m *XxbImChat) Leave(db *gorm.DB, gid string, userID int64) error {
	err := db.Model(&XxbImChatUser{}).Where("cgid = ? AND user = ?", gid, userID).Update("quit", time.Now()).Error
	if err != nil {
		return err
	}

	util.InvalidateChatMembersCache(gid)

	return nil
}
