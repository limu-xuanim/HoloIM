package model

import "xxd/util"

type History struct {
	ID     int64  `json:"id" gorm:"column:id"`
	Action int64  `json:"action" gorm:"column:action"`
	Field  string `json:"field" gorm:"column:field"`
	Old    int64  `json:"old" gorm:"column:old"`
	New    string `json:"new" gorm:"column:new"`
	Diff   string `json:"diff" gorm:"column:diff"`
}

// TableName 表名称
func (*History) TableName() string {
	return util.Config.Mysql.SysPrefix + "history"
}
