package util

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

var MysqlDB *gorm.DB

func InitMysql() {
	// 已经初始化过则直接返回，避免重复连接
	if MysqlDB != nil {
		return
	}

	// 配置 GORM 日志
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // 写入标准输出
		logger.Config{
			SlowThreshold: time.Second,                            // 慢 SQL 阈值
			LogLevel:      logger.LogLevel(Config.Mysql.LogLevel), // 日志级别: 1-Silent(不打印日志), 2-Error(只打印错误日志), 3-Warn(打印警告和错误日志), 4-Info(打印所有日志)
			Colorful:      true,                                   // 彩色打印
		},
	)

	configs := &gorm.Config{
		SkipDefaultTransaction: true,
		PrepareStmt:            true,
		NamingStrategy: schema.NamingStrategy{
			TablePrefix: Config.Mysql.TablePrefix, // 表名前缀
			// SingularTable: true,  // 使用单数表名
		},
		Logger: newLogger,
	}

	charset := Config.Mysql.Charset
	if charset == "" {
		charset = "utf8mb4"
	}
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&collation=utf8mb4_unicode_ci&parseTime=True&loc=Asia%%2FShanghai",
		Config.Mysql.Username,
		Config.Mysql.Password,
		Config.Mysql.Host,
		Config.Mysql.DbPort,
		Config.Mysql.Database,
		charset,
	)
	var err error
	MysqlDB, err = gorm.Open(mysql.Open(dsn), configs)

	if err != nil {
		panic("Mysql connection failed：" + err.Error())
	}

	sqlDB, err := MysqlDB.DB()
	if err != nil {
		panic("Failed to get SQL database instance: " + err.Error())
	}
	// SetMaxIdleConns 用于设置连接池中空闲连接的最大数量。
	sqlDB.SetMaxIdleConns(int(Config.Mysql.MaxIdleConns))
	// SetMaxOpenConns 设置打开数据库连接的最大数量。
	sqlDB.SetMaxOpenConns(int(Config.Mysql.MaxOpenConns))
	// SetConnMaxLifetime 设置了连接可复用的最大时间。
	sqlDB.SetConnMaxLifetime(Config.Mysql.MaxLifetime)

	Log("info", GetLang("[DB] ", " ", "Mysql connection successful"))
}

func ExecSQLFile(sqlFile string) error {
	// 获取可执行文件所在目录
	basePath := GetRuningDir()
	// SQL 文件统一放在 site/db 目录下
	filePath := filepath.Join(basePath, "site", "db", sqlFile)

	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf(GetLang("[DB] ", " ", "read sql file failed: %v"), err)
	}

	sqlStatements := strings.Split(string(content), ";\n")

	// 执行每个SQL语句
	for _, sql := range sqlStatements {
		sql = strings.TrimSpace(sql)
		if sql == "" {
			continue
		}

		// 处理DROP语句（移除注释）
		if strings.Contains(strings.ToUpper(sql), "DROP") {
			sql = strings.Replace(sql, "--", "", -1)
		}

		// 替换表名前缀
		// 将 `im_` 替换为 `xxb_im_`
		sql = strings.Replace(sql, "`im_", "`xxb_im_", -1)

		// 将 `xxb_` 替换为 `数据库名.`xxb_`
		if Config.Mysql.Database != "" {
			sql = strings.Replace(sql, "`xxb_", "`"+Config.Mysql.Database+"`.`xxb_", -1)
		}

		// 将 xxb_ 替换为配置的表前缀
		sql = strings.Replace(sql, "xxb_", Config.Mysql.TablePrefix, -1)

		// 执行SQL语句
		// 静默安装模式下不打印 SQL 语句
		if !QuietInstallFlag {
			fmt.Println(sql)
		}
		err := MysqlDB.Exec(sql).Error
		if err != nil {
			return fmt.Errorf(GetLang("[DB] ", " ", "exec sql failed: %v\nSQL: %s"), err, sql)
		}
	}
	return nil
}

// CreateDatabase 创建数据库
func CreateDatabase() error {
	// 先检查并创建数据库
	err := ensureDatabaseExists()
	if err != nil {
		return err
	}

	// 初始化数据库连接
	InitMysql()

	return nil
}

// ensureDatabaseExists 确保数据库存在，如果不存在则创建
func ensureDatabaseExists() error {
	// 先连接到MySQL服务器（不指定数据库）
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=%s&parseTime=True&loc=Asia%%2FShanghai",
		Config.Mysql.Username,
		Config.Mysql.Password,
		Config.Mysql.Host,
		Config.Mysql.DbPort,
		Config.Mysql.Charset,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf(GetLang("[DB] ", " ", "connect mysql failed: %v"), err)
	}

	// 检查数据库是否存在
	var exists string
	err = db.Raw("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", Config.Mysql.Database).Scan(&exists).Error
	if err != nil {
		return fmt.Errorf(GetLang("[DB] ", " ", "check db exists failed: %v"), err)
	}

	// 如果数据库不存在，则创建
	if exists == "" {
		createSQL := fmt.Sprintf("CREATE DATABASE `%s`",
			Config.Mysql.Database,
		)
		err = db.Exec(createSQL).Error
		if err != nil {
			return fmt.Errorf(GetLang("[DB] ", " ", "create db failed: %v"), err)
		}
		Log("info", GetLang("[DB] ", " ", "create db success: %s"), Config.Mysql.Database)
	} else {
		Log("info", GetLang("[DB] ", " ", "db already exists: %s"), Config.Mysql.Database)
	}

	// 关闭临时连接
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.Close()
	}

	return nil
}

// loadDatabaseConfigFromMyPHP 从 my.php 文件读取数据库配置
func loadDatabaseConfigFromMyPHP() error {
	myPHPPath := GetRuningDir() + "/site/config/my.php"

	info, err := os.Stat(myPHPPath)
	if os.IsNotExist(err) || info.IsDir() {
		return fmt.Errorf("my.php not found")
	}
	if err != nil {
		return err
	}

	content, err := os.ReadFile(myPHPPath)
	if err != nil {
		return err
	}

	getDbValue := func(key string) string {
		pattern := "$config->db->" + key
		idx := strings.Index(string(content), pattern)
		if idx == -1 {
			return ""
		}
		sub := string(content)[idx:]
		start := strings.Index(sub, "'")
		if start == -1 {
			return ""
		}
		sub = sub[start+1:]
		end := strings.Index(sub, "'")
		if end == -1 {
			return ""
		}
		return strings.TrimSpace(sub[:end])
	}

	host := getDbValue("host")
	portStr := getDbValue("port")
	name := getDbValue("name")
	user := getDbValue("user")
	password := getDbValue("password")
	prefix := getDbValue("prefix")

	if host == "" || portStr == "" || name == "" || user == "" {
		return fmt.Errorf("invalid db config in my.php")
	}

	port, err := strconv.ParseInt(portStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid db port in my.php: %w", err)
	}

	// 使用 my.php 中的配置填充到 Config.Mysql
	Config.Mysql.Enable = true
	Config.Mysql.Host = host
	Config.Mysql.Username = user
	Config.Mysql.Password = password
	Config.Mysql.DbPort = port
	Config.Mysql.Database = name
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
	if Config.Mysql.MaxLifetime == 0 {
		Config.Mysql.MaxLifetime = time.Hour
	}
	if Config.Mysql.LogLevel == 0 {
		Config.Mysql.LogLevel = 1
	}

	return nil
}

// getDatabaseVersion 从 config 表中读取当前数据库的版本号
// 对应 updateVersion 写入的 owner=system,module=common,section=global,key=version
func GetDatabaseVersion() (string, error) {
	if MysqlDB == nil {
		return "", fmt.Errorf("database not initialized")
	}

	var versionValue string
	err := MysqlDB.Table(Config.Mysql.SysPrefix+"config").
		Select("value").
		Where("owner = ? AND module = ? AND section = ? AND `key` = ?",
			"system", "common", "global", "version").
		Scan(&versionValue).Error
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(versionValue), nil
}

// loadConfigFromDatabase 从数据库 config 表读取喧喧相关配置
func loadConfigFromDatabase() (map[string]string, error) {
	type XuanxuanConfigRow struct {
		Owner   string `gorm:"column:owner"`
		Module  string `gorm:"column:module"`
		Section string `gorm:"column:section"`
		Key     string `gorm:"column:key"`
		Value   string `gorm:"column:value"`
	}

	var rows []XuanxuanConfigRow
	err := MysqlDB.Table(Config.Mysql.SysPrefix+"config").
		Where("owner = ? AND module = ? AND section = ?", "system", "common", "xuanxuan").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	configMap := make(map[string]string)
	for _, r := range rows {
		configMap[r.Key] = strings.TrimSpace(r.Value)
	}

	return configMap, nil
}

// createDefaultConfig 在数据库 config 表中创建默认配置
func createDefaultConfig(key string, value string) error {
	config := map[string]any{
		"owner":   "system",
		"module":  "common",
		"section": "xuanxuan",
		"key":     key,
		"value":   value,
	}
	// 使用 Model() 方法指定表，然后使用 Create() 方法
	err := MysqlDB.Table(Config.Mysql.SysPrefix + "config").
		Model(map[string]any{}).
		Create(config).Error
	if err != nil {
		return err
	}
	return nil
}

// updateOrCreateConfig 更新或创建数据库 config 表中的配置
func updateOrCreateConfig(key string, value string) error {
	table := Config.Mysql.SysPrefix + "config"
	where := []any{"system", "common", "xuanxuan", key}

	// 只更新 value 字段，避免将唯一键字段写入 UPDATE 语句触发 Duplicate entry
	result := MysqlDB.Table(table).
		Where("owner = ? AND module = ? AND section = ? AND `key` = ?", where...).
		Updates(map[string]any{"value": value})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return nil
	}

	// MySQL：当新值与旧值相同时，UPDATE 可能返回 RowsAffected=0（未“修改”任何行），
	// 若据此再 INSERT 会触发 uk_unique 重复键。需先确认记录是否已存在。
	var count int64
	if err := MysqlDB.Table(table).
		Where("owner = ? AND module = ? AND section = ? AND `key` = ?", where...).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	config := map[string]any{
		"owner":   "system",
		"module":  "common",
		"section": "xuanxuan",
		"key":     key,
		"value":   value,
	}
	return MysqlDB.Table(table).Create(&config).Error
}

// TestMysqlConnection 测试 MySQL 连接（不修改全局配置）。
// 仅验证主机可达且凭据有效，不要求数据库已存在。
func TestMysqlConnection(host string, port int64, user, password string) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4&parseTime=True&loc=Asia%%2FShanghai",
		user, password, host, port)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer sqlDB.Close()

	return sqlDB.Ping()
}

// updateVersion 更新数据库中的版本号
func updateVersion(version string) error {
	table := Config.Mysql.SysPrefix + "config"
	val := strings.TrimPrefix(version, "v")
	where := []any{"system", "common", "global", "version"}

	result := MysqlDB.Table(table).
		Where("owner = ? AND module = ? AND section = ? AND `key` = ?", where...).
		Updates(map[string]any{"value": val})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return nil
	}

	var count int64
	if err := MysqlDB.Table(table).
		Where("owner = ? AND module = ? AND section = ? AND `key` = ?", where...).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	config := map[string]any{
		"owner":   "system",
		"module":  "common",
		"section": "global",
		"key":     "version",
		"value":   val,
	}
	return MysqlDB.Table(table).Model(map[string]any{}).Create(config).Error
}
