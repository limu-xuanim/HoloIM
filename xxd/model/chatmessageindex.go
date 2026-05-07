package model

import (
	"time"
	"xxd/util"
)

type XxbImChatMessageIndex struct {
	ID         int64     `gorm:"column:id;primary_key;auto_increment" json:"id"`
	Gid        string    `gorm:"column:gid;type:char(40);not null" json:"gid"`
	Tablename  string    `gorm:"column:tableName;type:char(64);not null" json:"tableName"`
	Start      int64     `gorm:"column:start;not null" json:"start"`
	End        int64     `gorm:"column:end;not null" json:"end"`
	StartIndex int64     `gorm:"column:startIndex;not null" json:"startIndex"`
	EndIndex   int64     `gorm:"column:endIndex;not null" json:"endIndex"`
	StartDate  time.Time `gorm:"column:startDate;not null" json:"startDate"`
	EndDate    time.Time `gorm:"column:endDate;not null" json:"endDate"`
	Count      int64     `gorm:"column:count;not null" json:"count"`
}

// TableName 设置表名
func (*XxbImChatMessageIndex) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_chat_message_index"
}
