package sys

import (
	"time"
	"xxd/model"
	"xxd/util"

	"gorm.io/gorm"
)

var user model.User

type SysService struct {
	FileEncryptionKey *string
	db                *gorm.DB
}

func NewSysService() *SysService {
	return &SysService{
		db: util.MysqlDB,
	}
}

func (sys *SysService) UpdateLastPoll() {
	_, err := model.SetItem(sys.db, "system.common.xxd.lastPoll", time.Now().Format(time.DateTime), "")
	if err != nil {
		util.Log("error", util.GetLang("updateLastPoll error: %s"), err)
		return
	}
}
