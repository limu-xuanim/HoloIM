package util

import (
	"crypto/md5"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"net/mail"

	"github.com/microcosm-cc/bluemonday"
	"github.com/mozillazg/go-pinyin"
)

var p = bluemonday.StrictPolicy()

// ConvertToPinyin 将中文转换为拼音
func ConvertToPinyin(chinese string) string {
	// 配置拼音转换器
	a := pinyin.NewArgs()
	a.Style = pinyin.Normal // 不带声调
	a.Separator = ""        // 拼音之间不添加分隔符

	// 转换拼音
	pinyinSlice := pinyin.Pinyin(chinese, a)

	// 将拼音切片转换为字符串
	var result string
	var firstLetters string

	for _, p := range pinyinSlice {
		if len(p) > 0 {
			result += p[0]
			// 获取首字母
			firstLetters += string(p[0][0])
		}
	}

	// 处理数字和字母
	for _, char := range chinese {
		if (char >= '0' && char <= '9') || (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') {
			result += string(char)
			firstLetters += string(char)
		}
	}

	// 如果结果不为空，添加首字母
	if result != "" {
		result += " " + firstLetters
	}

	return result
}

// MD5 计算字符串的MD5值
func MD5(str string) string {
	h := md5.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}

// SHA1 计算字符串的SHA1值
func SHA1(str string) string {
	h := sha1.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}

func AddIntToString(str string, value int64) string {
	strSlice := StringToStringSlice(str)
	intSlice := StringSliceToInt64Slice(strSlice)
	intSlice = append(intSlice, value)
	intSlice = UniqueIntSlice(intSlice)
	return Int64SliceToString(intSlice)
}

func IsEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func StripHtml(html string) string {
	return p.Sanitize(html)
}

func CreateLink(module string, method string, keys []string, values []string, ignoreBaseURL bool) string {
	baseURL := ""
	if !ignoreBaseURL {
		baseURL = Config.BackendUrl
	}
	if Config.ConfigServer.RequestType == "PATH_INFO" {

		varsString := ""
		if len(keys) > 0 {
			for _, value := range values {
				if value == "" {
					continue
				}
				varsString += fmt.Sprintf("-%s", value)
			}
		}
		return fmt.Sprintf("%s/%s-%s%s.html", baseURL, module, method, varsString)
	}

	varsString := ""
	if len(keys) > 0 {
		for i, key := range keys {
			value := values[i]
			varsString += fmt.Sprintf("&%s=%s", key, value)
		}
	}
	return fmt.Sprintf("%s/index.php?m=%s&f=%s%s", baseURL, module, method, varsString)
}
