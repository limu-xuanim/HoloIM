package util

import (
	"crypto/md5"
	crand "crypto/rand"
	"encoding/hex"
	"fmt"
	"math/rand"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/mozillazg/go-pinyin"
	"github.com/segmentio/encoding/json"
)

var (
	hanRegex   = regexp.MustCompile(`[\p{Han}]+`)
	pinyinArgs = pinyin.Args{
		Style:     pinyin.Normal,
		Heteronym: false,
	}
)

// 支持中英文混合的转换
func ConvertPinyin(items []string) map[string]string {
	result := make(map[string]string, len(items))
	var wg sync.WaitGroup
	var mu sync.Mutex

	// 使用 Goroutines 并行处理
	for _, item := range items {
		wg.Add(1)
		go func(item string) {
			defer wg.Done()
			fullPinyin, abbr := processMixedString(item)
			pinyinResult := strings.ToLower(fullPinyin + " " + abbr)

			mu.Lock()
			result[item] = pinyinResult
			mu.Unlock()
		}(item)
	}

	wg.Wait()
	return result
}

// 处理混合字符串（如 "Tommy张"）
func processMixedString(s string) (string, string) {
	var full strings.Builder
	var abbr strings.Builder
	segments := splitMixedString(s)

	for _, seg := range segments {
		if isChinese(seg) {
			pys := pinyin.Pinyin(seg, pinyinArgs)
			for _, py := range pys {
				full.WriteString(py[0])
				abbr.WriteString(string(py[0][0]))
			}
		} else {
			lowerSeg := strings.ToLower(seg)
			full.WriteString(lowerSeg)
			if len(lowerSeg) > 0 {
				abbr.WriteString(string(lowerSeg[0]))
			}
		}
	}

	return full.String(), abbr.String()
}

// 分割混合字符串（如 "Tommy张" -> ["Tommy", "张"]）
func splitMixedString(s string) []string {
	var segments []string
	lastEnd := 0

	// 找出所有中文字段的位置
	matches := hanRegex.FindAllStringIndex(s, -1)
	for _, match := range matches {
		start, end := match[0], match[1]
		if start > lastEnd {
			segments = append(segments, s[lastEnd:start])
		}
		segments = append(segments, s[start:end])
		lastEnd = end
	}
	if lastEnd < len(s) {
		segments = append(segments, s[lastEnd:])
	}

	return segments
}

func isChinese(s string) bool {
	for _, r := range s {
		if !unicode.Is(unicode.Han, r) {
			return false
		}
	}
	return true
}

func CreateGID() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	id := md5.Sum([]byte(time.Now().String() + strconv.Itoa(r.Int())))
	idStr := hex.EncodeToString(id[:])
	return idStr[:8] + "-" + idStr[8:12] + "-" + idStr[12:16] + "-" + idStr[16:20] + "-" + idStr[20:32]
}

func ArrayDiff(a, b []int64) []int64 {
	var result []int64
	exists := make(map[int64]bool)
	for _, v := range b {
		exists[v] = true
	}
	for _, v := range a {
		if !exists[v] {
			result = append(result, v)
		}
	}
	return result
}

func ArrayMerge(a, b []int64) []int64 {
	result := append(a, b...)
	// 去重
	uniqueMap := make(map[int64]bool)
	var uniqueResult []int64

	for _, item := range result {
		if !uniqueMap[item] {
			uniqueMap[item] = true
			uniqueResult = append(uniqueResult, item)
		}
	}

	return uniqueResult
}

// arrayIntersect 计算两个或多个整数数组的交集
func StringArrayIntersect(arrays ...[]string) []string {
	if len(arrays) == 0 {
		return []string{}
	}
	// 创建一个 map 来记录每个元素的出现次数
	counts := make(map[string]int)
	// 遍历每个数组，并记录每个元素的出现次数
	for _, arr := range arrays {
		for _, value := range arr {
			counts[value]++
		}
	}
	// 计算数组的数量
	numArrays := len(arrays)
	// 创建结果数组，存储在所有数组中都存在的元素
	var result []string
	for key, count := range counts {
		if count == numArrays {
			result = append(result, key)
		}
	}
	return result
}

func JsonEncode(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(b)
}

// GenerateRandomHex 生成长度为 2*nBytes 的十六进制随机字符串。
// 使用 crypto/rand 作为随机源，失败时返回错误。
func GenerateRandomHex(nBytes int) (string, error) {
	if nBytes <= 0 {
		return "", fmt.Errorf("invalid nBytes: %d", nBytes)
	}
	buf := make([]byte, nBytes)
	if _, err := crand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// VersionCompare 比较两个版本号
// 参数:
// - version1: 第一个版本号
// - version2: 第二个版本号
// - operator: 可选的比较运算符 ("<", "<=", ">", ">=", "==", "!=")
// 返回值:
// - 如果提供了运算符，返回布尔值表示比较结果
// - 如果没有提供运算符，默认进行 ">=" 比较
func VersionCompare(version1, version2 string, operator ...string) bool {
	// 分割版本号
	v1Parts := splitVersion(version1)
	v2Parts := splitVersion(version2)
	// 获取较短的长度
	minLength := min(len(v2Parts), len(v1Parts))
	// 比较每个部分
	for i := range minLength {
		num1, _ := strconv.Atoi(v1Parts[i])
		num2, _ := strconv.Atoi(v2Parts[i])
		if num1 != num2 {
			// 如果提供了运算符，使用运算符逻辑
			if len(operator) > 0 {
				return compareWithOperator(num1, num2, operator[0])
			}
			// 默认返回 >= 比较结果
			return num1 >= num2
		}
	}
	// 如果前面的部分都相同，则根据长度判断
	if len(v1Parts) != len(v2Parts) {
		// 如果提供了运算符，使用运算符逻辑
		if len(operator) > 0 {
			return compareWithOperator(len(v1Parts), len(v2Parts), operator[0])
		}
		// 默认返回 >= 比较结果
		return len(v1Parts) >= len(v2Parts)
	}
	// 版本完全相同
	if len(operator) > 0 {
		return compareWithOperator(0, 0, operator[0])
	}
	// 默认返回 true (相等时 >= 为 true)
	return true
}

// compareWithOperator 使用指定运算符比较两个数值
func compareWithOperator(a, b int, operator string) bool {
	switch operator {
	case "<":
		return a < b
	case "<=":
		return a <= b
	case ">":
		return a > b
	case ">=":
		return a >= b
	case "==", "=":
		return a == b
	case "!=", "<>":
		return a != b
	default:
		return false // 无效的运算符
	}
}

// splitVersion 分割版本号为字符串切片
func splitVersion(version string) []string {
	// 使用正则表达式分割版本号
	re := regexp.MustCompile(`[\.\-+]`)
	return re.Split(version, -1)
}

// IsValidVersion 判断版本号格式是否有效（仅允许由 .-+ 分隔的数字段）
func IsValidVersion(version string) bool {
	parts := splitVersion(version)
	if len(parts) == 0 {
		return false
	}
	for _, p := range parts {
		if p == "" {
			continue
		}
		if _, err := strconv.Atoi(p); err != nil {
			return false
		}
	}
	return true
}

// FormatVersion 格式化版本号为 semver 格式
// 例如: "3" -> "3.0.0", "3.1" -> "3.1.0", "3beta" -> "3.0.0-beta"
func FormatVersion(version string) string {
	// 正则表达式匹配版本号各部分
	re := regexp.MustCompile(`^([0-9]+)((?:\.[0-9]+)?)((?:\.[0-9]+)?)(?:[\.\s\-\+]?)((?:[A-Za-z]+)?)((?:\.?[0-9]+)?)`)

	return re.ReplaceAllStringFunc(version, func(match string) string {
		matches := re.FindStringSubmatch(match)
		if len(matches) < 6 {
			return match
		}

		major := matches[1]
		minor := matches[2]
		patch := matches[3]
		preRelease := matches[4]
		build := matches[5]

		versionStrs := []string{major}
		if minor == "" {
			versionStrs = append(versionStrs, ".0")
		} else {
			versionStrs = append(versionStrs, minor)
		}
		if patch == "" {
			versionStrs = append(versionStrs, ".0")
		} else {
			versionStrs = append(versionStrs, patch)
		}

		if preRelease != "" || build != "" {
			versionStrs = append(versionStrs, "-")
		}
		if preRelease != "" {
			versionStrs = append(versionStrs, preRelease)
		}
		if build != "" {
			if preRelease == "" {
				versionStrs = append(versionStrs, "build")
			}
			if !strings.HasPrefix(build, ".") {
				versionStrs = append(versionStrs, ".")
			}
			versionStrs = append(versionStrs, build)
		}

		return strings.Join(versionStrs, "")
	})
}

func ParseLocalTime(timeStr string) *time.Time {
	shanghaiTZ, _ := time.LoadLocation("Asia/Shanghai")
	startTime, err := time.ParseInLocation(time.DateTime, timeStr, shanghaiTZ)
	if err != nil {
		return nil
	}
	return &startTime
}
