package util

import (
	"fmt"
	"strconv"
	"strings"
)

func AnyToInt64(v any) (int64, error) {
	switch val := v.(type) {
	case int64:
		return val, nil
	case int:
		return int64(val), nil
	case int32:
		return int64(val), nil
	case float64:
		return int64(val), nil
	case float32:
		return int64(val), nil
	default:
		return strconv.ParseInt(fmt.Sprintf("%v", v), 10, 64)
	}
}

func AnyToString(v any) (string, error) {
	if v == nil {
		return "", nil
	}
	if str, ok := v.(string); ok {
		return str, nil
	}

	return "", fmt.Errorf("%v to string error", v)
}

func AnyToBool(v any) (bool, error) {
	if b, ok := v.(bool); ok {
		return b, nil
	}

	return false, fmt.Errorf("%v to bool error", v)
}

func AnyToAnySlice(v any) ([]any, error) {
	if s, ok := v.([]any); ok {
		return s, nil
	}

	// 兼容 map[string]any 的情况，提取 values 作为 slice
	if m, ok := v.(map[string]any); ok {
		result := make([]any, 0, len(m))
		for _, value := range m {
			result = append(result, value)
		}
		return result, nil
	}

	return nil, fmt.Errorf("%v to []any error", v)
}

func AnyToInt64Slice(v any) ([]int64, error) {
	anySlice, err := AnyToAnySlice(v)
	if err != nil {
		return nil, err
	}

	return AnySliceToInt64Slice(anySlice)
}

func AnyToStringSlice(v any) ([]string, error) {
	anySlice, err := AnyToAnySlice(v)
	if err != nil {
		return nil, err
	}

	return AnySliceToStringSlice(anySlice)
}

func AnyToMapStringAny(v any) (map[string]any, error) {
	if m, ok := v.(map[string]any); ok {
		return m, nil
	}

	return nil, fmt.Errorf("%v to map[string]any error", v)
}

func AnySliceToInt64Slice(a []any) ([]int64, error) {
	var result []int64
	for _, v := range a {
		i, err := AnyToInt64(v)
		if err != nil {
			return nil, err
		}
		result = append(result, i)
	}
	return result, nil
}

func AnySliceToStringSlice(a []any) ([]string, error) {
	var result []string
	for _, v := range a {
		if str, err := AnyToString(v); err != nil {
			return nil, err
		} else {
			result = append(result, str)
		}
	}
	return result, nil
}

func Int64SliceToStringSlice(a []int64) []string {
	var result []string
	for _, v := range a {
		result = append(result, strconv.FormatInt(v, 10))
	}
	return result
}

func Int64SliceToString(slice []int64) string {
	strSlice := make([]string, len(slice))
	for i, v := range slice {
		strSlice[i] = strconv.Itoa(int(v))
	}
	return strings.Join(strSlice, ",")
}

// 将字符串按指定 "," 分割为切片，并过滤空元素
func StringToStringSlice(str string) []string {
	if str == "" {
		return []string{}
	}
	slice := strings.Split(str, ",")
	var result []string
	for _, s := range slice {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

// 将字符串按 "," 分割为切片，并过滤空元素
func StringToInt64Slice(str string, unique bool) []int64 {
	strSlice := StringToStringSlice(str)
	// 将字符串切片转换为int切片
	intSlice := StringSliceToInt64Slice(strSlice)
	if unique {
		intSlice = UniqueIntSlice(intSlice)
	}
	return intSlice
}

func StringSliceToInt64Slice(a []string) []int64 {
	var result []int64
	for _, v := range a {
		if v == "" {
			continue
		}
		i, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			continue
		}
		result = append(result, i)
	}
	return result
}

// GetStringFromMap 安全地从 map[string]any 中获取字符串值
// 如果 key 不存在或转换失败，返回默认值
func GetStringFromMap(m map[string]any, key string, defaultValue string) string {
	if m == nil {
		return defaultValue
	}
	value, exists := m[key]
	if !exists {
		return defaultValue
	}
	result, err := AnyToString(value)
	if err != nil {
		return defaultValue
	}
	return result
}

// GetInt64FromMap 安全地从 map[string]any 中获取 int64 值
// 如果 key 不存在或转换失败，返回默认值
func GetInt64FromMap(m map[string]any, key string, defaultValue int64) int64 {
	if m == nil {
		return defaultValue
	}
	value, exists := m[key]
	if !exists {
		return defaultValue
	}
	result, err := AnyToInt64(value)
	if err != nil {
		return defaultValue
	}
	return result
}

// GetInt64SliceFromMap 安全地从 map[string]any 中获取 []int64 值
// 如果 key 不存在或转换失败，返回默认值
func GetInt64SliceFromMap(m map[string]any, key string, defaultValue []int64) []int64 {
	if m == nil {
		return defaultValue
	}
	value, exists := m[key]
	if !exists {
		return defaultValue
	}
	result, err := AnyToInt64Slice(value)
	if err != nil {
		return defaultValue
	}
	return result
}

// GetBoolFromMap 安全地从 map[string]any 中获取 bool 值
// 如果 key 不存在或转换失败，返回默认值
func GetBoolFromMap(m map[string]any, key string, defaultValue bool) bool {
	if m == nil {
		return defaultValue
	}
	value, exists := m[key]
	if !exists {
		return defaultValue
	}
	result, err := AnyToBool(value)
	if err != nil {
		return defaultValue
	}
	return result
}
