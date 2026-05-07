package im

import (
	"xxd/util"

	"gorm.io/gorm"
)

// ImService 服务
type ImService struct {
	db *gorm.DB
}

func NewImService() *ImService {
	return &ImService{
		db: util.MysqlDB,
	}
}
