package lang

import (
	"errors"
	"fmt"
	"xxd/util"
)

// Language 表示一种语言的所有文本条目
type Language map[string]string

func getLang() Language {
	lang := util.Config.Lang
	switch lang {
	case "en":
		return En
	case "zh-cn":
		return ZhCN
	case "zh-tw":
		return ZhTW
	}
	return En
}

// Get 获取指定键的文本，如果不存在返回键名
func Get(key string, args ...any) string {
	languages := getLang()
	text, ok := languages[key]
	if !ok {
		return key
	}
	if len(args) > 0 {
		return fmt.Sprintf(text, args...)
	}
	return text
}

func Errorf(key string, args ...any) error {
	text := Get(key, args...)
	return errors.New(text)
}
