/**
 * The upgrade file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/Unknwon/goconfig"
)

// Upgrader 升级器结构体
type Upgrader struct {
	BackendServer string
	BackendKey    string
}

// NewUpgrader 创建新的升级器实例
func NewUpgrader() *Upgrader {
	return &Upgrader{}
}

// RunUpgrade 运行升级流程
func (u *Upgrader) RunUpgrade() error {
	fmt.Println("==========================================")
	fmt.Println("欢迎使用喧喧消息转发服务器升级程序")
	fmt.Println("Welcome to Xuan Daemon Upgrade")
	fmt.Println("==========================================")
	fmt.Println()

	// a. 根据 xxd.conf 文件或者 my.php 中的数据库信息连接数据库
	if err := u.connectDatabase(); err != nil {
		return fmt.Errorf("connect database failed: %w", err)
	}

	// b. 获取 config 表中的 version 字段，提示版本升级 from to
	dbVersion, err := GetDatabaseVersion()
	if err != nil || dbVersion == "" {
		Exit("未获取到有效版本", "Failed to get valid version from database", "退出升级程序", "Exiting upgrade process", 1)
	}

	// 去掉前缀 v，并去除首尾空格，统一比较用
	dbVersion = strings.TrimSpace(strings.TrimPrefix(dbVersion, "v"))

	// 使用公共工具函数判断版本号是否合法
	if !IsValidVersion(dbVersion) {
		Exit(fmt.Sprintf("数据库中当前版本号 %q 非有效版本格式。", dbVersion), "The current version value in database is invalid.", "退出升级程序", "Exiting upgrade process", 1)
	}

	// 仅支持从 9.6 版本及以上开始升级：
	// 如果版本号小于 9.6，则提示先将环境升级到 9.6
	if VersionCompare(dbVersion, "9.6", "<") {
		Exit(fmt.Sprintf("当前数据库版本为 %s。", dbVersion), "请参考官方升级文档，将当前环境升级到 9.6 版本，再执行当前的升级程序。", "Please first follow the official upgrade guide to upgrade the current environment to version 9.6, then run this upgrade program again.", 1)
	}

	currentVersion := strings.TrimPrefix(Version, "v")
	if currentVersion != dbVersion {
		fmt.Printf("是否从版本 %s 升级到 %s？\n", dbVersion, currentVersion)
		fmt.Printf("Upgrade from version %s to %s? (y/N): ", dbVersion, currentVersion)

		confirm, _ := ReadLine()
		confirm = strings.TrimSpace(strings.ToLower(confirm))

		if confirm != "y" && confirm != "yes" {
			Exit("已取消升级", "Upgrade cancelled", 0)
		}

		// 执行版本升级SQL
		if err := u.executeUpgradeSQL(dbVersion, currentVersion); err != nil {
			return fmt.Errorf("execute upgrade sql failed: %w", err)
		}

		// 更新数据库 config 表中的 version 参数
		if err := updateVersion(Version); err != nil {
			return fmt.Errorf("update version failed: %w", err)
		}
	}

	// 迁移头像与消息 data 中的路径格式（/data/... -> /xxb/data/...，以及 JSON 内 imgUrl/sender.avatar 规范化）
	if err := u.migrateAvatarAndDataPaths(); err != nil {
		return fmt.Errorf("migrate avatar and data paths failed: %w", err)
	}

	// 补全 xxd.conf 中缺失的配置参数
	if err := u.completeConfigFile(); err != nil {
		return fmt.Errorf("complete config file failed: %w", err)
	}

	// 更新数据库 config 表中缺失的配置参数
	if err := u.updateDatabaseConfig(); err != nil {
		return fmt.Errorf("update database config failed: %w", err)
	}

	// f. 升级结束
	fmt.Println()
	fmt.Println("==========================================")
	fmt.Println("升级完成！Upgrade completed!")
	fmt.Println("请重启服务以使配置生效：")
	fmt.Println("Please restart the service to make the configuration take effect:")
	fmt.Println("==========================================")
	fmt.Println()

	Exit(0)
	return nil
}

// connectDatabase 连接数据库
// 优先从 my.php 读取，如果没有则从 xxd.conf 读取
func (u *Upgrader) connectDatabase() error {
	// 先尝试从 my.php 读取
	err := loadDatabaseConfigFromMyPHP()
	if err == nil {
		InitMysql()
		return nil
	}

	// 如果 my.php 不存在，尝试从 xxd.conf 读取
	configPath := GetRuningDir() + "/config/xxd.conf"
	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to load xxd.conf: %w", err)
	}

	// 读取 mysql section
	mysqlSection, err := config.GetSection("mysql")
	if err != nil {
		return fmt.Errorf("mysql section not found in xxd.conf: %w", err)
	}

	host := mysqlSection["host"]
	portStr := mysqlSection["dbPort"]
	username := mysqlSection["username"]
	password := mysqlSection["password"]
	database := mysqlSection["database"]
	prefix := mysqlSection["tablePrefix"]

	if host == "" || portStr == "" || username == "" || database == "" {
		return fmt.Errorf("incomplete mysql config in xxd.conf")
	}

	port, err := strconv.ParseInt(portStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid db port in xxd.conf: %w", err)
	}

	Config.Mysql.Enable = true
	Config.Mysql.Host = host
	Config.Mysql.Username = username
	Config.Mysql.Password = password
	Config.Mysql.DbPort = port
	Config.Mysql.Database = database
	if prefix != "" {
		Config.Mysql.TablePrefix = prefix
	}

	// 设置默认值
	if Config.Mysql.Charset == "" {
		Config.Mysql.Charset = "utf8mb4"
	}
	if Config.Mysql.MaxIdleConns == 0 {
		Config.Mysql.MaxIdleConns = 10
	}
	if Config.Mysql.MaxOpenConns == 0 {
		Config.Mysql.MaxOpenConns = 100
	}
	if Config.Mysql.LogLevel == 0 {
		Config.Mysql.LogLevel = 1
	}

	fmt.Println("从 xxd.conf 读取数据库配置成功")
	fmt.Println("Database config loaded from xxd.conf")
	InitMysql()

	return nil
}

// completeConfigFile 补全 xxd.conf 中缺失的配置参数
// 如果 xxd.conf 不存在，会先创建它
func (u *Upgrader) completeConfigFile() error {
	configPath := GetRuningDir() + "/config/xxd.conf"

	// 如果配置文件不存在，先创建空文件
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// 确保 config 目录存在
		configDir := GetRuningDir() + "/config"
		if err := os.MkdirAll(configDir, 0755); err != nil {
			return fmt.Errorf("create config directory failed: %w", err)
		}

		// 创建空文件
		file, err := os.Create(configPath)
		if err != nil {
			return fmt.Errorf("create config file failed: %w", err)
		}
		file.Close()
	}

	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		return fmt.Errorf("load config file failed: %w", err)
	}

	// 从数据库读取配置
	dbConfig, err := loadConfigFromDatabase()
	if err == nil {
		// 从数据库配置中提取 backend server 和 key
		if server, ok := dbConfig["server"]; ok && server != "" {
			u.BackendServer = server
		}
		if key, ok := dbConfig["key"]; ok && key != "" {
			u.BackendKey = key
		}
	}

	// 从 xxd.conf 读取 backend 配置（如果数据库中没有）
	if u.BackendServer == "" || u.BackendKey == "" {
		backendKeys := config.GetKeyList("backend")
		for _, key := range backendKeys {
			value, err := config.GetValue("backend", key)
			if err == nil && value != "" {
				// 先去除注释，再分割
				value = removeComment(value)
				parts := strings.Split(value, ",")
				if len(parts) >= 2 {
					if u.BackendServer == "" {
						u.BackendServer = strings.TrimSpace(parts[0])
					}
					if u.BackendKey == "" {
						u.BackendKey = strings.TrimSpace(parts[1])
					}
					break
				}
			}
		}
	}

	// 补全 server section 的缺失配置
	u.ensureServerConfigInFile(config)

	// 补全 mysql section（如果缺失）
	u.ensureMysqlConfigInFile(config)

	// 补全 backend section
	if u.BackendServer != "" && u.BackendKey != "" {
		backendServer := strings.TrimRight(u.BackendServer, "/")
		config.SetValue("backend", "default", fmt.Sprintf("%s/x.php,%s", backendServer, u.BackendKey))
	}

	// 设置 installed = 1
	config.SetValue("server", "installed", "1")

	// 保存配置文件
	return goconfig.SaveConfigFile(config, configPath)
}

// ensureServerConfigInFile 确保 server section 有所有必需的配置
func (u *Upgrader) ensureServerConfigInFile(config *goconfig.ConfigFile) {
	// 从数据库读取配置值
	dbConfig, _ := loadConfigFromDatabase()

	// 定义默认值映射
	defaults := map[string]string{
		"ip":                "0.0.0.0",
		"commonPort":        "11443",
		"chatPort":          "11444",
		"apiPort":           "9090",
		"adminPort":         "9080",
		"https":             "off",
		"stunPort":          "3478",
		"uploadPath":        "files/",
		"logPath":           "log/",
		"certPath":          "cert/",
		"sessionSavePath":   "session/",
		"pollingInterval":   "15",
		"maxOnlineUser":     "0",
		"debug":             "0",
		"enableAES":         "1",
		"enableClientAES":   "1",
		"enableCompression": "1",
		"thumbnail":         "1",
		"lang":              "zh-cn",
		"requestType":       "GET",
		"backendType":       "xxb",
	}

	// 检查并补全每个配置项
	for key, defaultValue := range defaults {
		value, err := config.GetValue("server", key)
		if err != nil || value == "" {
			// 优先使用数据库中的值
			if dbValue, ok := dbConfig[key]; ok && dbValue != "" {
				config.SetValue("server", key, dbValue)
			} else {
				config.SetValue("server", key, defaultValue)
			}
		}
	}

	// 特殊处理 serverHost 和 backendUrl
	serverHost, _ := config.GetValue("server", "serverHost")
	serverHost = removeComment(serverHost)
	https, _ := config.GetValue("server", "https")
	https = removeComment(https)
	scheme := "http"
	if https == "on" || https == "1" {
		scheme = "https"
	}

	adminPort, _ := config.GetValue("server", "adminPort")
	adminPort = removeComment(adminPort)
	if adminPort == "" {
		adminPort = "9080"
	}

	// 如果 serverHost 为空，走交互逻辑；否则对已有值做格式规范化
	if serverHost == "" {
		// 使用公共函数交互获取服务器主机地址
		interactiveServerHost, err := getServerHostInteractively(scheme, adminPort)
		if err != nil {
			// 如果交互获取失败，使用默认值
			interactiveServerHost = fmt.Sprintf("%s://127.0.0.1:%s/xxb/", scheme, adminPort)
		}
		config.SetValue("server", "serverHost", interactiveServerHost)
	} else {
		// 对已有 serverHost 进行规范化，确保形如 http(s)://host:port/xxb/
		parsed, perr := url.Parse(serverHost)
		if perr == nil {
			// 若缺少 scheme，则按 https/on 配置补齐
			if parsed.Scheme == "" {
				parsed.Scheme = scheme
			}
			// 若缺少 host 但有 Path 中的 host 信息，则不强行修改，直接跳过
			if parsed.Host != "" {
				// 补端口
				host, port, errPort := net.SplitHostPort(parsed.Host)
				if errPort != nil {
					parsed.Host = parsed.Host + ":" + adminPort
				} else if host != "" && port == "" {
					parsed.Host = host + ":" + adminPort
				}
				// 统一为 /xxb/
				parsed.Path = "/xxb/"
				parsed.RawPath = ""
				config.SetValue("server", "serverHost", parsed.String())
			}
		}
	}

	// 如果配置文件中没有 backendUrl，不写入它，读取时会自动使用 serverHost 的值
	// 如果配置文件中已有 backendUrl，检查是否与 serverHost 一致，如果一致则删除 backendUrl
	backendUrl, _ := config.GetValue("server", "backendUrl")
	backendUrl = removeComment(backendUrl)
	// 重新读取 serverHost，因为可能在前面被更新了
	serverHost, _ = config.GetValue("server", "serverHost")
	serverHost = removeComment(serverHost)
	if backendUrl != "" && backendUrl == serverHost {
		// 如果 backendUrl 与 serverHost 一致，删除 backendUrl 配置项
		config.DeleteKey("server", "backendUrl")
	}
}

// ensureMysqlConfigInFile 确保 mysql section 有所有必需的配置
func (u *Upgrader) ensureMysqlConfigInFile(config *goconfig.ConfigFile) {
	defaults := map[string]string{
		"enable":       "1",
		"charset":      "utf8mb4",
		"maxIdleConns": "10",
		"maxOpenConns": "100",
		"maxLifetime":  "3600",
		"logLevel":     "1",
		"printSql":     "0",
	}

	for key, defaultValue := range defaults {
		value, err := config.GetValue("mysql", key)
		if err != nil || value == "" {
			config.SetValue("mysql", key, defaultValue)
		}
	}

	// 确保必需的配置项存在
	if Config.Mysql.Host != "" {
		config.SetValue("mysql", "host", Config.Mysql.Host)
	}
	if Config.Mysql.Username != "" {
		config.SetValue("mysql", "username", Config.Mysql.Username)
	}
	if Config.Mysql.Password != "" {
		config.SetValue("mysql", "password", Config.Mysql.Password)
	}
	if Config.Mysql.DbPort > 0 {
		config.SetValue("mysql", "dbPort", fmt.Sprintf("%d", Config.Mysql.DbPort))
	}
	if Config.Mysql.Database != "" {
		config.SetValue("mysql", "database", Config.Mysql.Database)
	}
	if Config.Mysql.TablePrefix != "" {
		config.SetValue("mysql", "tablePrefix", Config.Mysql.TablePrefix)
	}
}

// updateDatabaseConfig 更新数据库 config 表中缺失的配置参数
// 如果 my.php 不存在，会先创建它
func (u *Upgrader) updateDatabaseConfig() error {
	// 确保 my.php 文件存在
	myPHPPath := GetRuningDir() + "/site/config/my.php"
	if _, err := os.Stat(myPHPPath); os.IsNotExist(err) {
		// 确保目录存在
		myPHPDir := GetRuningDir() + "/site/config"
		if err := os.MkdirAll(myPHPDir, 0755); err != nil {
			return fmt.Errorf("create my.php directory failed: %w", err)
		}

		// 复用 install.go 中的 saveMyPHP 方法创建 my.php
		installer := NewInstaller()
		if err := installer.saveMyPHP(); err != nil {
			return fmt.Errorf("create my.php failed: %w", err)
		}
	}

	// 从 xxd.conf 读取配置值
	configPath := GetRuningDir() + "/config/xxd.conf"
	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		return fmt.Errorf("load config file failed: %w", err)
	}

	// 读取 server section 的值（去除注释）
	getServerValue := func(key string) string {
		val, _ := config.GetValue("server", key)
		return removeComment(strings.TrimSpace(val))
	}

	// 读取 uploadFileSize 并去除后缀（如 M、K、G）
	uploadFileSize, _ := sizeSuffix(getServerValue("uploadFileSize"))

	// 定义需要确保存在的配置项及其默认值
	defaultConfigs := map[string]string{
		"key":             u.BackendKey,
		"backendLang":     "zh-cn",
		"server":          u.BackendServer,
		"iceServers":      "",
		"pollingInterval": getServerValue("pollingInterval"),
		"ip":              getServerValue("ip"),
		"chatPort":        getServerValue("chatPort"),
		"commonPort":      getServerValue("commonPort"),
		"uploadFileSize":  uploadFileSize,
		"fileEncrypt":     "off",
		"messageEncrypt":  "off",
		"tokenLifetime":   "30",
		"tokenAuthWindow": "20",
		"aes":             "on",
		"https":           getServerValue("https"),
		"sslcrt":          "",
		"sslkey":          "",
		"mobileClient":    "on",
		"debug":           getServerValue("debug"),
		"logLevel":        fmt.Sprintf("%d", Config.Mysql.LogLevel),
	}

	// 如果某些值从配置文件读取为空，使用默认值
	if defaultConfigs["pollingInterval"] == "" {
		defaultConfigs["pollingInterval"] = "15"
	}
	if defaultConfigs["ip"] == "" {
		defaultConfigs["ip"] = "0.0.0.0"
	}
	if defaultConfigs["chatPort"] == "" {
		defaultConfigs["chatPort"] = "11444"
	}
	if defaultConfigs["commonPort"] == "" {
		defaultConfigs["commonPort"] = "11443"
	}
	if defaultConfigs["https"] == "" {
		defaultConfigs["https"] = "off"
	}
	if defaultConfigs["debug"] == "" {
		defaultConfigs["debug"] = "0"
	}
	if defaultConfigs["uploadFileSize"] == "" {
		defaultConfigs["uploadFileSize"] = "32"
	}

	// 从数据库读取现有配置
	dbConfig, err := loadConfigFromDatabase()
	if err != nil {
		// 如果读取失败，仍然尝试创建默认配置
		dbConfig = make(map[string]string)
	}

	// 更新或创建缺失的配置
	for key, defaultValue := range defaultConfigs {
		// 如果数据库中已有该配置，跳过
		if _, exists := dbConfig[key]; exists {
			continue
		}

		// 如果默认值为空，跳过
		if defaultValue == "" {
			continue
		}

		// 创建或更新配置
		if err := updateOrCreateConfig(key, defaultValue); err != nil {
			fmt.Printf("Warning: failed to update config %s: %v\n", key, err)
		}
	}

	return nil
}

// migrateAvatarAndDataPaths 迁移 xxb_user.avatar、xxb_im_chat.avatar、xxb_im_message.data 中的路径格式
// 使 avatar 统一为 /xxb/data/upload/***，im_chat.avatar 内 imgUrl 为 data/image/***，im_message.data 内 sender.avatar 的 URL 路径为 /xxb/data/***
func (u *Upgrader) migrateAvatarAndDataPaths() error {
	if MysqlDB == nil {
		return nil
	}
	prefix := Config.Mysql.TablePrefix
	if prefix == "" {
		prefix = "xxb_"
	}

	if err := u.migrateUserAvatar(prefix); err != nil {
		return fmt.Errorf("migrate user avatar: %w", err)
	}
	if err := u.migrateImChatAvatar(prefix); err != nil {
		return fmt.Errorf("migrate im_chat avatar: %w", err)
	}
	if err := u.migrateImMessageData(prefix); err != nil {
		return fmt.Errorf("migrate im_message data: %w", err)
	}
	return nil
}

// migrateUserAvatar 将 xxb_user.avatar 从 /data/upload/*** 转为 /xxb/data/upload/***
func (u *Upgrader) migrateUserAvatar(prefix string) error {
	table := "`" + prefix + "user`"
	sql := "UPDATE " + table + " SET avatar = CONCAT('/xxb', avatar) WHERE avatar LIKE '/data/upload/%' AND avatar NOT LIKE '/xxb/data/upload/%'"
	return MysqlDB.Exec(sql).Error
}

// migrateImChatAvatar 将 xxb_im_chat.avatar 内 imgUrl 规范为 data/image/*** 或 data/upload/***（无前导斜杠、无 xxb/ 前缀）
func (u *Upgrader) migrateImChatAvatar(prefix string) error {
	type row struct {
		ID     int64  `gorm:"column:id"`
		Avatar string `gorm:"column:avatar"`
	}
	var rows []row
	err := MysqlDB.Table(prefix+"im_chat").Select("id", "avatar").Find(&rows).Error
	if err != nil {
		return err
	}
	for _, r := range rows {
		if r.Avatar == "" {
			continue
		}
		var raw map[string]any
		if err := json.Unmarshal([]byte(r.Avatar), &raw); err != nil {
			continue
		}
		data, _ := raw["data"].(map[string]any)
		if data == nil {
			continue
		}
		imgURL, _ := data["imgUrl"].(string)
		if imgURL == "" {
			continue
		}
		normalized := normalizeChatImgURL(imgURL)
		if normalized == imgURL {
			continue
		}
		data["imgUrl"] = normalized
		raw["data"] = data
		newJSON, err := json.Marshal(raw)
		if err != nil {
			continue
		}
		if err := MysqlDB.Table(prefix+"im_chat").Where("id = ?", r.ID).Update("avatar", string(newJSON)).Error; err != nil {
			return err
		}
	}
	return nil
}

// normalizeChatImgURL 将 imgUrl 规范为 data/image/*** 或 data/upload/***（无前导斜杠、无 xxb/ 前缀）
func normalizeChatImgURL(s string) string {
	s = strings.TrimSpace(s)
	for strings.HasPrefix(s, "/") {
		s = s[1:]
	}
	for strings.HasPrefix(s, "xxb/") {
		s = s[4:]
	}
	return s
}

// migrateImMessageData 将 xxb_im_message.data 内 sender.avatar 的 URL 路径统一为含 /xxb/data/***
func (u *Upgrader) migrateImMessageData(prefix string) error {
	type row struct {
		ID   int64  `gorm:"column:id"`
		Data string `gorm:"column:data"`
	}
	var rows []row
	err := MysqlDB.Table(prefix+"im_message").Select("id", "data").Find(&rows).Error
	if err != nil {
		return err
	}
	for _, r := range rows {
		if r.Data == "" {
			continue
		}
		var raw map[string]any
		if err := json.Unmarshal([]byte(r.Data), &raw); err != nil {
			continue
		}
		sender, _ := raw["sender"].(map[string]any)
		if sender == nil {
			continue
		}
		avatar, _ := sender["avatar"].(string)
		if avatar == "" {
			continue
		}
		normalized := normalizeMessageSenderAvatarURL(avatar)
		if normalized == avatar {
			continue
		}
		sender["avatar"] = normalized
		raw["sender"] = sender
		newJSON, err := json.Marshal(raw)
		if err != nil {
			continue
		}
		if err := MysqlDB.Table(prefix+"im_message").Where("id = ?", r.ID).Update("data", string(newJSON)).Error; err != nil {
			return err
		}
	}
	return nil
}

// normalizeMessageSenderAvatarURL 将 sender.avatar 的 URL 路径添加前缀 xxb/
func normalizeMessageSenderAvatarURL(avatar string) string {
	avatar = strings.TrimSpace(avatar)
	if avatar == "" || !strings.Contains(avatar, "://") {
		return avatar
	}
	parsed, err := url.Parse(avatar)
	if err != nil {
		return avatar
	}
	path := parsed.Path
	if path == "" || path == "/" {
		return avatar
	}
	if strings.HasPrefix(path, "/xxb/data") {
		return avatar
	}
	trimmed := path
	for strings.HasPrefix(trimmed, "/") {
		trimmed = trimmed[1:]
	}
	if strings.HasPrefix(trimmed, "data") {
		parsed.Path = "/xxb/" + trimmed
		return parsed.String()
	}
	return avatar
}

// executeUpgradeSQL 执行版本升级SQL
// 根据从版本号到目标版本号，执行相应的SQL文件
// 使用fall-through逻辑，从fromVersion开始执行到toVersion的所有SQL
func (u *Upgrader) executeUpgradeSQL(fromVersion, toVersion string) error {
	// 定义版本升级映射表
	// 每个版本对应需要执行的SQL文件列表
	// 格式：版本号 -> SQL文件列表
	// 注意：版本号应该按照升级顺序从低到高排列
	versionUpgradeMap := map[string][]string{
		"9.6": {"upgrade9.6.sql", "upgradexuanxuan9.6.sql"},
		// "10.0": {"upgrade10.0.sql", "upgradexuanxuan10.0.sql"},
	}

	// 定义版本顺序（按升级顺序排列，从低到高）
	// 这个顺序决定了SQL执行的顺序
	versionOrder := []string{
		"9.6",
		// "10.0",
	}

	// 使用fall-through方式执行SQL
	// 从fromVersion开始，执行所有小于等于toVersion的版本的SQL
	// 例如：从9.6升级到11.0，会执行9.6和11.0的SQL
	started := false
	for _, version := range versionOrder {
		// 判断是否应该开始执行（fromVersion <= version）
		if !started {
			// 如果fromVersion小于等于当前版本，开始执行
			if VersionCompare(fromVersion, version, "<=") {
				started = true
			} else {
				// 如果fromVersion大于当前版本，跳过
				continue
			}
		}

		// 如果已经开始执行，且当前版本小于等于toVersion，则执行该版本的SQL
		if started && VersionCompare(toVersion, version, ">=") {
			if sqlFiles, exists := versionUpgradeMap[version]; exists {
				fmt.Printf("正在执行版本 %s 的升级SQL...\n", version)
				fmt.Printf("Executing upgrade SQL for version %s...\n", version)

				for _, sqlFile := range sqlFiles {
					fmt.Printf("执行SQL文件: %s\n", sqlFile)
					fmt.Printf("Executing SQL file: %s\n", sqlFile)

					if err := ExecSQLFile(sqlFile); err != nil {
						return fmt.Errorf("执行SQL文件 %s 失败: %w", sqlFile, err)
					}
				}

				fmt.Printf("版本 %s 的升级SQL执行完成\n", version)
				fmt.Printf("Upgrade SQL for version %s completed\n", version)
			}
		}

		// 如果当前版本已经大于toVersion，停止执行
		if started && VersionCompare(version, toVersion, ">") {
			break
		}
	}

	return nil
}
