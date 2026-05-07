/**
 * The assemblage file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/mitchellh/mapstructure"
)

const (
	KB = 1024
	MB = 1024 * KB
	GB = 1024 * MB
)

// 获取 年月日
func GetYmd() string {
	return time.Now().Format("20060102")
}

// 以路径形式输出 年/月/日
func GetYmdPath(timeStamp int64) string {
	if timeStamp == 0 {
		return time.Now().Format("2006/01/02/")
	}

	return time.Unix(timeStamp, 0).Format("2006/01/02/")
}

// 格式化时间 (0000-00-00 00:00:00)
func GetFormattedTime(timestamp int64) string {
	return time.Unix(timestamp, 0).Format("2006-01-02 15:04:05")
}

// 输出时间戳
func GetUnixTime() int64 {
	return time.Now().Unix()
}

// MD5加密
func GetMD5(str string) string {
	md5H := md5.New()
	md5H.Write([]byte(str))
	cipherStr := md5H.Sum(nil)

	return hex.EncodeToString(cipherStr)
}

// 计算文件的 SHA256
func GetFileSHA256(path string) string {
	f, err := os.Open(path)
	if err != nil {
		Log("error", GetLang("[SHA256]", " ", "Open file error", ": "), err)
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		Log("error", GetLang("[SHA256]", " ", "Error during calculation", ": "), err)
	}
	return hex.EncodeToString(h.Sum(nil))
}

// 获取文件状态
func GetFileStat(path string) fs.FileInfo {
	fileStat, err := os.Stat(path)
	if err != nil {
		Log("error", GetLang("[FileSize]", " ", "Read file error", ": "), err)
	}
	return fileStat
}

// 获取程序名称
func GetProgramName() string {
	return filepath.Base(os.Args[0])
}

func Sleep(second int) {
	time.Sleep(time.Duration(second) * time.Second)
}

func SleepMillisecond(Millisecond int) {
	time.Sleep(time.Duration(Millisecond) * time.Millisecond)
}

// 生成文件夹
func Mkdir(path string) error {
	if !Exists(path) {
		err := os.MkdirAll(path, os.ModePerm)
		if err != nil {
			return err
		}
	}

	return nil
}

// 判断文件是否存在
func Exists(name string) bool {
	if _, err := os.Stat(name); err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return true
}

// 判断目录是否存在
func IsDir(path string) bool {
	info, err := os.Stat(path)
	if err == nil && info.IsDir() {
		return true
	}

	return false
}

// 文件名
func FileBaseName(path string) string {
	return filepath.Base(path)
}

// 文件扩展名
func FileExtension(path string) string {
	return filepath.Ext(path)
}

// 文件类型
func FileContentType(path string) string {
	ext := strings.ToLower(FileExtension(path))

	contentMap := map[string]string{
		".jpeg": "image/jpeg",
		".jpg":  "image/jpeg",
		".png":  "image/png",
		".webp": "image/webp",
		".css":  "text/css",
		".gif":  "image/gif",
		".htm":  "text/html",
		".html": "text/html",
		".js":   "text/javascript",
		".mjs":  "text/javascript",
		".pdf":  "application/pdf",
		".svg":  "image/svg+xml",
		".xml":  "text/xml",
		".mp4":  "video/mp4",
		".webm": "video/webm",
		".ogm":  "video/x-ogm+ogg",
		".ogv":  "video/ogg",
		".avi":  "video/x-msvideo",
		".mp3":  "audio/mpeg",
		".ogg":  "audio/ogg",
		".opus": "audio/opus",
	}
	contentType, ok := contentMap[ext]
	if ok {
		return contentType
	}
	return "application/octet-stream"
}

// 判断扩展名是否为文档文件的扩展名
func IsDocumentExt(ext string) bool {
	switch ext {
	case ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf", ".txt":
		return true
	}
	return false
}

// CleanPath 用于清理路径字符串
// CleanPath returns the shortest path name equivalent to path.
func CleanPath(path string) string {
	return filepath.Clean(path)
}

// 删除指定目录或文件
func Rm(path string) error {
	err := os.Remove(path)
	if err != nil {
		return err
	}

	return nil
}

func String2Int(str string) (int, error) {
	return strconv.Atoi(str)
}

func Int2String(i int) string {
	return strconv.Itoa(i)
}

func String2Int64(str string) (int64, error) {
	return strconv.ParseInt(str, 10, 64)
}

func Int642String(i int64) string {
	return strconv.FormatInt(i, 10)
}

func Bool2String(b bool) string {
	return strconv.FormatBool(b)
}

func Asciify(str string) string {
	notAsciiRegex := regexp.MustCompile("[[:^ascii:]]")
	return notAsciiRegex.ReplaceAllLiteralString(str, "")
}

func Pretty(str string) string {
	preRegex := regexp.MustCompile("<pre.*</pre>|^license error$") // 捕捉代码块或 license error
	return preRegex.FindString(str)
}

// BeheadErrorResponse 砍掉带有报错的响应的错误部分
// BeheadErrorResponse cuts off the error part of responses with an error
func BeheadErrorResponse(raw []byte) (responseText []byte, errorText string) {
	var splitter string

	// 处理未 AES 加密的含报错返回
	if bytes.HasSuffix(raw, []byte("]]")) { // 处理含报错明文 JSON 数组返回
		arrayJSONSplitRegex := regexp.MustCompile(`</\S+>\["`)
		splitter = arrayJSONSplitRegex.FindString(string(raw))
	} else if bytes.HasSuffix(raw, []byte("}")) { // 处理含报错明文 JSON 对象返回
		objectJSONSplitRegex := regexp.MustCompile(`</\S+>{"`)
		splitter = objectJSONSplitRegex.FindString(string(raw))
	}

	if splitter != "" {
		splits := bytes.SplitN(raw, []byte(splitter), 2)
		return append([]byte("[\""), splits[1]...), string(append(splits[0], []byte(splitter[2:])...))
	}

	// 处理 AES 加密的含报错返回
	htmlRegex := regexp.MustCompile(`^(?P<err><\w[^>]+?>.*</\w+?>)`)
	html := htmlRegex.FindString(string(raw))
	if html != "" {
		return bytes.SplitN(raw, []byte(html), 2)[1], html
	}
	return raw, html
}

func StringHasPrefix(str, prefix string) bool {
	return strings.HasPrefix(str, prefix)
}

func StringHasSuffix(str, suffix string) bool {
	return strings.HasSuffix(str, suffix)
}

func StringContains(str string, substr string) bool {
	return strings.Contains(str, substr)
}

func StringReplace(str string, tgtStr string, newStr string, times int) string {
	return strings.Replace(str, tgtStr, newStr, times)
}

func JSONToStruct(data any, structure any) error {
	return mapstructure.Decode(data, &structure)
}

// Int64SliceUnique returns unique values of an int64 slice as a slice.
func Int64SliceUnique(slice []int64) []int64 {
	unique := make([]int64, 0, len(slice))
	mark := make(map[int64]bool)
	for _, val := range slice {
		if _, ok := mark[val]; !ok {
			mark[val] = true
			unique = append(unique, val)
		}
	}
	return unique
}

// Base64 编码
func URLBase64Encode(str string) string {
	return base64.URLEncoding.EncodeToString([]byte(str))
}

// Base64 解码
func URLBase64Decode(str string) (string, error) {
	decoded, err := base64.URLEncoding.DecodeString(str)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}

// HostIsLoopback 判断主机地址是否为本地主机地址
// HostIsLoopback checks whether the host address is localhost
func HostIsLoopback(host string) bool {
	return StringHasPrefix(host, "localhost") || StringHasPrefix(host, "127.0.0.1") || StringHasPrefix(host, "::1")
}

// URLIsLocalhost 判断 URL 是否为本地主机地址，当 URL 无效时也返回 false
// URLIsLocalhost checks whether the URL pointed to localhost, will also return false when the URL is invalid
func URLIsLocalhost(str string) bool {
	url, err := url.Parse(str)
	if err != nil {
		return false
	}
	return HostIsLoopback(url.Host)
}

// RequestGetURL 获取 HTTP 请求的完整 URL
// RequestGetURL gets URL of a HTTP request
func RequestGetURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + r.Host + r.URL.String()
}

// Contains checks if x is in a
func Contains(a []any, x any) bool {
	for _, n := range a {
		if x == n {
			return true
		}
	}
	return false
}

// ContainsAll checks if all elements in b are in a
func ContainsAll(a, b []any) bool {
	for _, x := range b {
		if !Contains(a, x) {
			return false
		}
	}
	return true
}

// StringSliceContains checks if x is in a
func StringSliceContains(a []string, x string) bool {
	var ax []any
	for _, v := range a {
		ax = append(ax, v)
	}
	return Contains(ax, x)
}
func IntSliceContains(a []int64, x int64) bool {
	var ax []any
	for _, v := range a {
		ax = append(ax, v)
	}
	return Contains(ax, x)
}

// StringSliceContainsAll checks if all elements in b are in a
func StringSliceContainsAll(a, b []string) bool {
	var ai []any
	var bi []any
	for _, v := range a {
		ai = append(ai, v)
	}
	for _, v := range b {
		bi = append(bi, v)
	}
	return ContainsAll(ai, bi)
}

func IntsToInt64s(ints []int) []int64 {
	int64s := make([]int64, len(ints))
	for i, v := range ints {
		int64s[i] = int64(v)
	}
	return int64s
}
