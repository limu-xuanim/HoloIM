package model

import (
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

// 结构体定义
type MessageIndex struct {
	ID        int64     `json:"id" gorm:"column:id;primary_key;auto_increment"`
	Tablename string    `json:"tableName" gorm:"column:tableName"`
	Start     int64     `json:"start" gorm:"column:start"`
	End       int64     `json:"end" gorm:"column:end"`
	StartDate time.Time `json:"startDate" gorm:"column:startDate"`
	EndDate   time.Time `json:"endDate" gorm:"column:endDate"`
	Chats     string    `json:"chats" gorm:"column:chats"`
}

// TableName 表名称
func (*MessageIndex) TableName() string {
	return util.Config.Mysql.TablePrefix + "im_message_index"
}

var (
	// MinDate 使用 time 包的零值时间表示最小时间
	MinDate = time.Time{}
	// MaxDate 使用 time 包构造的公历上限时间（到秒）
	MaxDate = time.Date(9999, 12, 31, 23, 59, 59, 0, time.Local)
)

// 最终返回结果结构
type TableMessages struct {
	TableName string
	Messages  []int64
}

// 辅助函数：计算数组差异
func difference(all, processed []int64) []int64 {
	processedMap := make(map[int64]bool)
	for _, id := range processed {
		processedMap[id] = true
	}

	var diff []int64
	for _, id := range all {
		if !processedMap[id] {
			diff = append(diff, id)
		}
	}
	return diff
}

// 数据库表结构定义
type TableInfo struct {
	TableName string `gorm:"column:tableName"` // 对应数据库字段名
	Messages  string `gorm:"-"`                // 非数据库字段，手动填充
}

// 根据聊天的 cgids 获取表名列表
func (m *MessageIndex) GetTablesByChats(db *gorm.DB, cgids any) ([]string, error) {
	var tableNames []string
	result := db.Table((&XxbImChatMessageIndex{}).TableName()).
		Select("DISTINCT tableName").
		Where("gid IN ?", cgids).
		Find(&tableNames)
	if result.Error != nil {
		return nil, result.Error
	}
	return tableNames, nil
}
