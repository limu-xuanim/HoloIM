package user

import (
	"xxd/util"

	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService() *UserService {
	return &UserService{
		db: util.MysqlDB,
	}
}

// 对比并合并两个 map[string]any 类型的值
func mergeMaps(userSettings, Params map[string]any) map[string]any {
	// 复制 Params 到结果 map 中
	result := make(map[string]any)
	for k, v := range Params {
		result[k] = v
	}

	// 遍历 userSettings
	for k, v := range userSettings {
		// 检查 Params 中是否存在该键
		if _, exists := Params[k]; !exists {
			// 如果 Params 中不存在该键，则将其添加到结果 map 中
			result[k] = v
		}
	}

	return result
}
