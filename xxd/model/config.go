package model

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
	"xxd/util"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	token_life_time   = 30
	token_auth_window = 20
)

var (
	configCache sync.Map
	// 数据库锁，用于查询缓存失败后查询数据库
	cacheLock sync.Mutex
	// 正缓存与负缓存统一 TTL，过期后触发重新查库
	configCacheTTL = 5 * time.Minute
)

// notFoundCacheEntry 负缓存条目，记录不存在的配置项及其缓存时间
type notFoundCacheEntry struct {
	CachedAt time.Time
}

// cachedValueEntry 正缓存条目，带过期时间，便于 5 分钟刷新
type cachedValueEntry struct {
	Value    string
	CachedAt time.Time
}

type XxbConfig struct {
	ID      int64  `gorm:"column:id;type:mediumint(9) unsigned;primary_key;AUTO_INCREMENT" json:"id"`
	Owner   string `gorm:"column:owner;type:char(30);NOT NULL" json:"owner"`
	Module  string `gorm:"column:module;type:varchar(30);NOT NULL" json:"module"`
	Section string `gorm:"column:section;type:char(30);NOT NULL" json:"section"`
	Key     string `gorm:"column:key;type:char(30)" json:"key"`
	Value   string `gorm:"column:value;type:text;NOT NULL" json:"value"`
}

func (m *XxbConfig) TableName() string {
	return util.Config.Mysql.SysPrefix + "config"
}

func createXxbConfig(db *gorm.DB, config *XxbConfig) (int64, error) {
	// 核心：用 OnConflict 实现 UPSERT，依赖唯一索引触发冲突
	err := db.Clauses(clause.OnConflict{
		// 冲突条件：owner + module + section + key 组合唯一（需数据库加唯一索引）
		Columns: []clause.Column{
			{Name: "owner"},
			{Name: "module"},
			{Name: "section"},
			{Name: "key"},
		},
		// 冲突时执行的更新操作：仅更新 Value 字段（可按需添加其他字段，如 CreatedAt）
		DoUpdates: clause.Assignments(map[string]interface{}{
			"value": config.Value,
		}),
	}).Create(config).Error

	if err != nil {
		return 0, err
	}

	// 创建/更新后，config.ID 会被 Gorm 自动填充（无论插入还是更新）
	return config.ID, nil
}

func InitConfigCache(db *gorm.DB) error {
	// 预加载 xuanxuan 配置默认值
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "backendLang"), "zh-cn")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "iceServers"), "")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "pollingInterval"), "15")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "uploadFileSize"), "32")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "fileEncrypt"), "off")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "tokenLifeTime"), "30")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "tokenAuthWindow"), "20")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "aes"), "on")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "sslcrt"), "")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "mobileClient"), "on")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "sslkey"), "")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "readStatus"), "")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "disableSystemGroupChat"), "off")
	SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "common", "xuanxuan", "enableSystemConference"), "1")

	// 预加载 restriction 配置默认值（通常不存在，使用负缓存）
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "restriction", "common", "enabled"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "restriction", "common", "cidrs"))

	// 预加载 jitsi 配置默认值（通常不存在，使用负缓存）
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "jitsi", "common", "enabled"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "jitsi", "common", "domain"))

	// 预加载 watermark 配置默认值（通常不存在，使用负缓存）
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "watermark", "client", "enabled"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "watermark", "client", "content"))

	// 预加载 office 集成配置默认值（通常不存在，使用负缓存）
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "integration", "office", "officeEnabled"))

	// 预加载 push 配置默认值（通常不存在，使用负缓存）
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "push", "common", "enable"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "push", "common", "privacyLevel"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "push", "ios", "xuan_im"))
	SetItemToCacheWithNotFound(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", "system", "push", "android", "aliyun"))

	// 从数据库加载所有 system 配置，覆盖默认值
	var configs []XxbConfig
	if err := db.Where("owner = ?", "system").Find(&configs).Error; err != nil {
		return err
	}

	for _, config := range configs {
		SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", config.Owner, config.Module, config.Section, config.Key), config.Value)
	}
	return nil
}

func GetItemFromCache(paramString string) (string, bool, error) {
	val, ok := configCache.Load(paramString)
	if !ok {
		return "", false, errors.New("not found in cache")
	}

	// 检查是否是负缓存条目
	if entry, isNotFoundEntry := val.(notFoundCacheEntry); isNotFoundEntry {
		if time.Since(entry.CachedAt) > configCacheTTL {
			return "", false, errors.New("not found cache expired")
		}
		return "", true, nil // true 表示已缓存但不存在
	}

	// 正缓存条目（带 TTL）
	if entry, ok := val.(*cachedValueEntry); ok {
		if time.Since(entry.CachedAt) > configCacheTTL {
			return "", false, errors.New("cache expired")
		}
		return entry.Value, false, nil
	}

	// 兼容旧格式：曾存的裸 string，视为有效（启动后均由 SetItemToCache 写入 cachedValueEntry）
	if valStr, ok := val.(string); ok {
		return valStr, false, nil
	}

	return "", false, errors.New("invalid cache value type")
}

func SetItemToCache(paramString string, value string) {
	configCache.Store(paramString, &cachedValueEntry{Value: value, CachedAt: time.Now()})
}

func SetItemToCacheWithNotFound(paramString string) {
	configCache.Store(paramString, notFoundCacheEntry{
		CachedAt: time.Now(),
	})
}

func DeleteItemFromCache(paramString string) {
	configCache.Delete(paramString)
}

func shouldBypassConfigCache(paramString string) bool {
	params := parseItemParam(paramString)
	return params["owner"] == "system" && params["module"] == "push"
}

// 从数据库中获取指定参数的设置值
func GetItem(db *gorm.DB, paramString string, paramType string) string {
	if shouldBypassConfigCache(paramString) {
		params := parseItemParam(paramString)
		var xxbConfig XxbConfig
		err := db.Table(xxbConfig.TableName()).
			Where("`owner` = ? AND  `module` = ? AND `section` = ? AND `key` = ?", params["owner"], params["module"], params["section"], params["key"]).
			First(&xxbConfig).
			Error
		if err != nil {
			return ""
		}

		return xxbConfig.Value
	}

	if val, isNotFound, err := GetItemFromCache(paramString); err == nil {
		// 如果是负缓存（配置不存在），直接返回空
		if isNotFound {
			return ""
		}
		return val
	}

	cacheLock.Lock()
	defer cacheLock.Unlock()

	// 再次检查，避免写入后重新查库
	if val, isNotFound, err := GetItemFromCache(paramString); err == nil {
		if isNotFound {
			return ""
		}
		return val
	}

	// 缓存未命中或负缓存已过期，查询数据库中的单个配置
	params := parseItemParam(paramString)
	var xxbConfig XxbConfig
	err := db.Table(xxbConfig.TableName()).
		Where("`owner` = ? AND  `module` = ? AND `section` = ? AND `key` = ?", params["owner"], params["module"], params["section"], params["key"]).
		First(&xxbConfig).
		Error
	if err != nil {
		// 查询失败，缓存负结果（避免重复查询不存在的配置）
		SetItemToCacheWithNotFound(paramString)
		return ""
	}

	// 查询成功，更新缓存
	SetItemToCache(paramString, xxbConfig.Value)
	return xxbConfig.Value
}

func GetItems(db *gorm.DB, paramString string, paramType string) ([]XxbConfig, error) {
	params := parseItemParam(paramString)
	var xxbConfigs []XxbConfig
	query := db.Table((&XxbConfig{}).TableName())
	if params["owner"] != "" {
		query = query.Where("`owner` = ?", params["owner"])
	}
	if params["module"] != "" {
		query = query.Where("`module` = ?", params["module"])
	}
	if params["section"] != "" {
		query = query.Where("`section` = ?", params["section"])
	}
	if params["key"] != "" {
		query = query.Where("`key` = ?", params["key"])
	}
	err := query.Find(&xxbConfigs).Error
	if err != nil {
		return nil, err
	}
	return xxbConfigs, nil
}

func DeleteItem(db *gorm.DB, paramString string, paramType string) error {
	params := parseItemParam(paramString)
	var xxbConfig XxbConfig
	err := db.Table(xxbConfig.TableName()).
		Where("`owner` = ? AND  `module` = ? AND `section` = ? AND `key` = ?", params["owner"], params["module"], params["section"], params["key"]).
		Delete(&xxbConfig).
		Error
	if err != nil {
		return fmt.Errorf("failed to delete items: %w", err)
	}

	DeleteItemFromCache(paramString)
	return nil
}

// 解析参数字符串为数组
func parseItemParam(paramString string) map[string]string {
	params := make(map[string]string)
	// 解析参数字符串
	values, _ := url.ParseQuery(paramString)
	for key, val := range values {
		if len(val) > 0 {
			params[key] = val[0]
		}
	}
	// 初始化未设置的字段
	fields := []string{"owner", "module", "section", "key"}
	for _, field := range fields {
		if _, ok := params[field]; !ok {
			params[field] = ""
		}
	}
	return params
}

// 设置配置项
func SetItem(db *gorm.DB, path, value, itemType string) (id int64, err error) {
	level := strings.Count(path, ".")
	if level < 2 {
		return 0, fmt.Errorf("path must have at least two levels")
	}

	if itemType == "" {
		itemType = "config"
	}
	var xxbConfig XxbConfig
	var xxbLang XxbLang
	switch itemType {
	case "config":
		if level == 2 {
			parts := strings.Split(path, ".")
			xxbConfig.Owner = parts[0]
			xxbConfig.Module = parts[1]
			xxbConfig.Key = parts[2]
		} else if level == 3 {
			parts := strings.Split(path, ".")
			xxbConfig.Owner = parts[0]
			xxbConfig.Module = parts[1]
			xxbConfig.Section = parts[2]
			xxbConfig.Key = parts[3]
		}
	case "lang":
		if level == 2 {
			return 0, fmt.Errorf("path must have at least three levels for lang type")
		} else if level == 3 {
			parts := strings.Split(path, ".")
			xxbLang.Lang = parts[0]
			xxbLang.Module = parts[1]
			xxbLang.Key = parts[2]
		} else if level == 4 {
			parts := strings.Split(path, ".")
			xxbLang.Lang = parts[0]
			xxbLang.Module = parts[1]
			xxbLang.Section = parts[2]
			xxbLang.Key = parts[3]
			xxbLang.System = parts[4]
		}
	default:
		return 0, fmt.Errorf("invalid item type: %s", itemType)
	}

	xxbLang.Value = value
	xxbConfig.Value = value

	if itemType == "config" {
		id, err = createXxbConfig(db, &xxbConfig)
		if err == nil {
			SetItemToCache(fmt.Sprintf("owner=%s&module=%s&section=%s&key=%s", xxbConfig.Owner, xxbConfig.Module, xxbConfig.Section, xxbConfig.Key), xxbConfig.Value)
		}
	} else {
		id, err = xxbLang.CreateXxbLang(db, &xxbLang)
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}

func GetChatSystemConfig(db *gorm.DB, account string) (map[string]string, error) {
	xxbConfigs, err := GetItems(db, fmt.Sprintf("owner=%s&module=chat&section=system", account), "config")
	if err != nil {
		return nil, err
	}

	configMap := make(map[string]string)
	for _, xxbConfig := range xxbConfigs {
		configMap[xxbConfig.Key] = xxbConfig.Value
	}
	return configMap, nil
}

func GetTokenLifeTime(db *gorm.DB) int64 {
	tokenLifeTime := getCommonConfig(db, "tokenLifeTime")
	if tokenLifeTime == "" {
		return token_life_time
	}

	tokenLifeTimeInt, err := strconv.ParseInt(tokenLifeTime, 10, 64)
	if err != nil {
		return token_life_time
	}

	if tokenLifeTimeInt == 0 {
		return token_life_time
	}

	return tokenLifeTimeInt
}

func GetTokenAuthWindow(db *gorm.DB) int64 {
	tokenAuthWindow := getCommonConfig(db, "tokenAuthWindow")
	if tokenAuthWindow == "" {
		return token_auth_window
	}

	tokenAuthWindowInt, err := strconv.ParseInt(tokenAuthWindow, 10, 64)
	if err != nil {
		return token_auth_window
	}

	if tokenAuthWindowInt == 0 {
		return token_auth_window
	}

	return tokenAuthWindowInt
}

func GetMobileClient(db *gorm.DB) string {
	return getCommonConfig(db, "mobileClient", "xuanxuan")
}

func GetLastUnEncryptMessageId(db *gorm.DB) int64 {
	val := getCommonConfig(db, "lastUnEncryptMessageId", "xuanxuan")
	if val == "" {
		return 0
	}
	lastId, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return 0
	}
	return lastId
}

func GetIceServers(db *gorm.DB) string {
	return getCommonConfig(db, "iceServers", "xuanxuan")
}

func getCommonConfig(db *gorm.DB, key string, section ...string) string {
	if len(section) > 0 {
		return GetItem(db, fmt.Sprintf("owner=system&module=common&section=%s&key=%s", section[0], key), "config")
	}
	return GetItem(db, fmt.Sprintf("owner=system&module=common&section=xuanxuan&key=%s", key), "config")
}

type IPRestriction struct {
	Enabled bool     `json:"enabled"`
	CIDRs   []string `json:"cidrs"`
}

type ConferenceConfig struct {
	Enabled      string `json:"enabled"` // "false": 禁用 "true": 开启
	Domain       string `json:"domain"`
	EnableSystem int64  `json:"enableSystem"` // 0: 禁用 1: 开启
}

// IsSystemGroupEnable 是否启用系统会话：读取 xuanxuan disableSystemGroupChat，on=禁用，off 或未配置=启用
func IsSystemGroupEnable(db *gorm.DB) bool {
	v := GetItem(db, "owner=system&module=common&section=xuanxuan&key=disableSystemGroupChat", "config")
	return v != "on"
}

func MarkOngoingMessagePartition(db *gorm.DB, ongoing string) bool {
	lastStatus := GetItem(db, "owner=system&module=common&section=partition&key=ongoing", "config")
	if ongoing != lastStatus {
		SetItem(db, "system.common.partition.ongoing", ongoing, "config")
		return true
	}
	return false
}

type WatermarkConfig struct {
	Enabled string `json:"enabled"` // "0": 禁用 "1": 开启
	Content string `json:"content"`
}

type DeptVisibilityConfig struct {
	Visibility         string `json:"visibility"`
	VisibleLevel       int64  `json:"visibleLevel"`
	ChatControl        string `json:"chatControl"`
	ChatLevelOfManager int64  `json:"chatLevelOfManager"`
	ChatLevelOfMember  int64  `json:"chatLevelOfMember"`
}

// GetUploadFileSize 从缓存获取上传文件大小限制（单位：字节），如果读取不到则使用默认值 32MB
func GetUploadFileSize(db *gorm.DB) int64 {
	const defaultSizeMB = 32

	val := getCommonConfig(db, "uploadFileSize", "xuanxuan")
	if val == "" {
		return defaultSizeMB * util.MB
	}

	sizeMB, err := strconv.ParseInt(val, 10, 64)
	if err != nil || sizeMB <= 0 {
		return defaultSizeMB * util.MB
	}

	return sizeMB * util.MB
}
