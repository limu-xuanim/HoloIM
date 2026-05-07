/**
 * The config file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/Unknwon/goconfig"
	"github.com/francoispqt/gojay"
)

type RanzhiServer struct {
	RanzhiAddr  string
	RanzhiToken []byte
}

type ConfigIni struct {
	ConfigServer

	OIDC OIDCConfig

	Services map[string]Service

	// multiSite or singleSite
	SiteType      string
	DefaultServer string
	RanzhiServer  map[string]RanzhiServer
	Mysql         MysqlConfig
	Cluster       ClusterConfig
}

// server section 对应的数据结构，以后在server中配置只在这个数据结构中添加，confName标签是对应的配置文件中的键名
type ConfigServer struct {
	Installed     int64  `confName:"installed"`
	Ip            string `confName:"ip"`
	ChatPort      string `confName:"chatPort"`
	CommonPort    string `confName:"commonPort"`
	StunPort      string `confName:"stunPort"`
	AdvertisePort string `confName:"advertisePort"`
	ApiPort       string `confName:"apiPort"`
	AdminPort     string `confName:"adminPort"`
	IsHttps       string `confName:"https"`
	UploadPath    string `confName:"uploadPath"`
	LogPath       string `confName:"logPath"`
	CrtPath       string `confName:"certPath"`
	Lang          string `confName:"lang"`
	ServerHost    string `confName:"serverHost"`

	SessionSavePath string `confName:"sessionSavePath"`

	PollingInterval   int64  `confName:"pollingInterval"`
	MaxOnlineUser     int64  `confName:"maxOnlineUser"`
	Debug             int64  `confName:"debug"`
	EnableAES         int64  `confName:"enableAES"`
	EnableClientAES   int64  `confName:"enableClientAES"`
	EnableCompression int64  `confName:"enableCompression"`
	Thumbnail         int64  `confName:"thumbnail"`
	RequestType       string `confName:"requestType"`
	BackendUrl        string `confName:"backendUrl"`
	BackendType       string `confName:"backendType"`

	AdminerPasswdFile string `confName:"adminerPasswdFile"`
}

type MysqlConfig struct {
	Enable       bool          `confName:"enable"`
	Host         string        `confName:"host"`
	Username     string        `confName:"username"`
	Password     string        `confName:"password"`
	DbPort       int64         `confName:"dbPort"`
	Database     string        `confName:"database"`
	Charset      string        `confName:"charset"`
	TablePrefix  string        `confName:"tablePrefix"`
	SysPrefix    string        `confName:"sysPrefix"`
	MaxIdleConns int64         `confName:"maxIdleConns"`
	MaxOpenConns int64         `confName:"maxOpenConns"`
	MaxLifetime  time.Duration `confName:"maxLifetime"`
	LogLevel     int64         `confName:"logLevel"`
	PrintSql     bool          `confName:"printSql"`
}

// Pager 分页结构体
type Pager struct {
	PageID     int64 `json:"pageID"`     // 当前页码
	RecPerPage int64 `json:"recPerPage"` // 每页记录数
	RecTotal   int64 `json:"recTotal"`   // 总记录数
	PageTotal  int64 `json:"pageTotal"`  // 总页数
	Data       any   `json:"data"`       // 数据
}

func (p *Pager) ToMap() map[string]any {
	return map[string]any{
		"pageID":     p.PageID,
		"recPerPage": p.RecPerPage,
		"recTotal":   p.RecTotal,
		"pageTotal":  p.PageTotal,
		"data":       p.Data,
	}
}

func (p *Pager) FromMap(data map[string]any, init bool) {
	if init {
		p.PageID = 1
		p.RecPerPage = 10
		p.RecTotal = 0
	}
	if pageID, ok := data["pageID"].(float64); ok {
		p.PageID = int64(pageID)
	}
	if recPerPage, ok := data["recPerPage"].(float64); ok {
		p.RecPerPage = int64(recPerPage)
	}
	if recTotal, ok := data["recTotal"].(float64); ok {
		p.RecTotal = int64(recTotal)
	}
	if pageTotal, ok := data["pageTotal"].(float64); ok {
		p.PageTotal = int64(pageTotal)
	}
}

type OIDCConfig struct {
	EnableOIDC       int64  `confName:"enableOIDC"`
	Backend          string `confName:"backend"`
	SessionName      string `confName:"sessionName"`
	SessionSecretKey string `confName:"sessionSecretKey"`
	SessionMaxAge    int64  `confName:"sessionMaxAge"`
	AccessTokenExp   int64  `confName:"accessTokenExp"`
	RefreshTokenExp  int64  `confName:"refreshTokenExp"`
	DefaultDomain    string `confName:"defaultDomain"`
	Apps             map[string]OIDCApp
}

type OIDCApp struct {
	ID     string
	Secret string `confName:"secret"`
	Name   string `confName:"name"`
	Domain string `confName:"domain"`
	Scopes map[string]OIDCAppScope
}

type OIDCAppScope struct {
	ID    string
	Title string `confName:"title"`
}

type Service struct {
	Config []string
}

type ClusterConfig struct {
	Enable  bool   `confName:"enable"`
	Address string `confName:"address"`
	Port    string `confName:"port"`
	Master  bool   `confName:"master"`
}

// GetService gets the service config by name.
func (c *ConfigIni) getService(name string) []string {
	if len(c.Services) == 0 {
		return nil
	}
	if service, ok := c.Services[name]; ok {
		return service.Config
	}
	return nil
}

// GetFileServer gets the file server address from services.
func (c *ConfigIni) GetFileServer() string {
	// TODO: use key to encrypt file server communications.
	config := c.getService("fileServer")
	if config == nil {
		return ""
	}
	return strings.TrimSuffix(config[0], "/") + "/"
}

const configPath = "config/xxd.conf"

var Config = ConfigIni{
	SiteType:     "singleSite",
	RanzhiServer: make(map[string]RanzhiServer),
	Cluster: ClusterConfig{
		Enable:  false,
		Address: "0.0.0.0",
		Port:    "11800",
		Master:  false,
	},
}
var ServersideConfig = map[string]map[string]any{}
var DebugCli int64 = 0

var ServiceFlag string
var QuietInstallFlag bool

// 静默安装配置参数
var QuietInstallCommonPort string
var QuietInstallChatPort string
var QuietInstallAdminPort string
var QuietInstallStunPort string
var QuietInstallHttps string
var QuietInstallServerHost string
var QuietInstallDbPort string
var QuietInstallDbPassword string

// Adminer 密码文件生成（跨平台，通过可执行文件执行）
var AdminerPasswdUser string     // -adminer-passwd-user
var AdminerPasswdPassword string // -adminer-passwd-password，留空则从标准输入读取

// CheckUpgradeFlag 为 true 时仅检测是否需要 xxb 数据库升级并退出（见 RunCheckUpgradeAndExit）。
var CheckUpgradeFlag bool

var runningDir *string

var ApiSchema JSONData
var apiSchemaMutex sync.RWMutex

var ApiOptimizer *JSONOptimizer

func GetApiSchema() JSONData {
	// 判断包变量ApiSchema是否为空，如果不为空，直接返回
	apiSchemaMutex.RLock()
	if ApiSchema != nil {
		apiSchemaMutex.RUnlock()
		return ApiSchema
	}
	apiSchemaMutex.RUnlock()

	// 初始化ApiSchema
	ApiSchema = make(JSONData)

	// 读取apischeme.json文件
	data, err := os.ReadFile(GetRuningDir() + "/config/apischeme.json")
	if err != nil {
		Log("error", "Failed to read apischeme.json: %v", err)
		return nil
	}

	err = gojay.Unsafe.Unmarshal(data, &ApiSchema)
	if err != nil {
		Log("error", "Failed to unmarshal apischeme.json: %v", err)
		return nil
	}

	return ApiSchema
}

func Init() {
	InitColor()
	InitConfig()
	InitServeMux()
	InitSysRun()
	InitWait()
}

func InitConfig() {
	confPathFlag := flag.String("conf", "", "Absolute path of the configuration file. (optional)")
	debugv := flag.Bool("v", false, "Verbose level 1.")
	debugvv := flag.Bool("vv", false, "Verbose level 2.")
	lang := flag.String("lang", "en", "Logging language: en, zh. (optional)")
	isPrintVersion := flag.Bool("V", false, "Print version and exit.")
	runningDir = flag.String("rdir", "", "Absolute path of the running dir. (optional)")

	flag.StringVar(&ServiceFlag, "service", "", "Control the system service.")
	flag.BoolVar(&QuietInstallFlag, "quiet-install", false, "Run installation in quiet mode (use default values).")

	// 静默安装配置参数
	flag.StringVar(&QuietInstallCommonPort, "commonPort", "", "Common port for quiet installation (default: 11443).")
	flag.StringVar(&QuietInstallChatPort, "chatPort", "", "Chat port for quiet installation (default: 11444).")
	flag.StringVar(&QuietInstallAdminPort, "adminPort", "", "Admin port for quiet installation (default: 9080).")
	flag.StringVar(&QuietInstallStunPort, "stunPort", "", "STUN port for quiet installation (default: 3478).")
	flag.StringVar(&QuietInstallHttps, "https", "", "HTTPS for quiet installation (default: off).")
	flag.StringVar(&QuietInstallServerHost, "serverHost", "", "Server host for quiet installation (default: http://127.0.0.1:9080/).")
	flag.StringVar(&QuietInstallDbPort, "dbPort", "", "Database port for quiet installation (default: 3306).")
	flag.StringVar(&QuietInstallDbPassword, "dbPassword", "", "Database password for quiet installation (default: 123456).")

	// Adminer 密码文件生成：指定用户名与输出文件后执行并退出，密码可通过 -adminer-passwd-password 或 stdin 传入
	flag.StringVar(&AdminerPasswdUser, "adminer-passwd-user", "", "Username for adminer passwd file.")
	flag.StringVar(&AdminerPasswdPassword, "adminer-passwd-password", "", "Password for adminer user (optional; if empty, read one line from stdin).")

	flag.BoolVar(&CheckUpgradeFlag, "check-upgrade", false, "If upgrade is needed, print the same reminder as startup and exit. Exit: 0=no reminder, 1=reminder printed, 2=panic.")

	flag.Parse()

	if *isPrintVersion {
		Printf("XXD %s %s\n", Version, Build)
		Exit(0)
	}

	if *debugv {
		DebugCli = 1
	}
	if *debugvv {
		DebugCli = 2
	}
	I18n(*lang)

	dir := GetRuningDir()
	ApiOptimizer = NewJSONOptimizer()

	var err error
	var data *goconfig.ConfigFile

	if *confPathFlag == "" {
		data, err = goconfig.LoadConfigFile(dir + "/" + configPath)
	} else {
		data, err = goconfig.LoadConfigFile(GetAbsPath(*confPathFlag))
	}

	if err != nil {
		Config.SiteType = "singleSite"
		Config.DefaultServer = "xuanxuan"
		Config.RanzhiServer["xuanxuan"] = RanzhiServer{"serverInfo", []byte("serverInfo")}

		Log("error", GetLang("[Config]", " %s ", "can't be loaded", ". ", "Use default conf", "!"), configPath)
		return
	}

	// 设置默认值
	confServerSection := ConfigServer{
		Installed:         0,
		Ip:                "0.0.0.0",
		ChatPort:          "11444",
		CommonPort:        "11443",
		StunPort:          "3478",
		AdvertisePort:     "",
		ApiPort:           "80",
		AdminPort:         "9080",
		IsHttps:           "0",
		UploadPath:        "tmpfile",
		Debug:             0,
		PollingInterval:   15,
		EnableAES:         1,
		EnableClientAES:   1,
		EnableCompression: 1,
		Thumbnail:         1,
		MaxOnlineUser:     0,
		LogPath:           dir + "/log/",
		CrtPath:           dir + "/certificate/",
		SessionSavePath:   dir + "/session/",
		Lang:              "zh-cn",
		ServerHost:        "http://127.0.0.1",
		RequestType:       "GET",
		BackendUrl:        "",
		BackendType:       "xxb",
		AdminerPasswdFile: dir + "/users",
	}

	confMysqlSection := MysqlConfig{
		Enable:       false,
		Host:         "localhost",
		Username:     "user",
		Password:     "password",
		DbPort:       3306,
		Database:     "xxb",
		Charset:      "utf8mb4",
		TablePrefix:  "xxb_",
		SysPrefix:    "xxb_",
		MaxIdleConns: 10,
		MaxOpenConns: 100,
		MaxLifetime:  time.Hour,
		LogLevel:     3,
		PrintSql:     true,
	}
	if confServerSectionMap, err := data.GetSection("server"); err == nil {
		getServerSection(&confServerSection, confServerSectionMap)
	}
	// 如果配置文件中没有 BackendUrl，则使用 ServerHost 的值
	if confServerSection.BackendUrl == "" {
		confServerSection.BackendUrl = confServerSection.ServerHost
	}
	Config.ConfigServer = confServerSection
	checkConfServerSection()

	if confMysqlSectionMap, err := data.GetSection("mysql"); err == nil {
		getMysqlSection(&confMysqlSection, confMysqlSectionMap)
	}
	Config.Mysql = confMysqlSection
	if Config.Mysql.SysPrefix == "" {
		Config.Mysql.SysPrefix = Config.Mysql.TablePrefix
	}

	getRanzhi(data)

	fixConfigFile(data)

	// parse nested OIDC config if any and set into `Config`
	processOIDCConfig(data)

	// parse services config if any and set into `Config.Services`
	processServicesConfig(data)

	if confClusterSectionMap, err := data.GetSection("cluster"); err == nil {
		getClusterSection(&Config.Cluster, confClusterSectionMap)
	}

	ReplaceSessionPathInPhpIni()
}

func fixConfigFile(config *goconfig.ConfigFile) error {
	certificateSection := config.GetKeyList("certificate")
	dir := GetRuningDir()

	// 处理早期版本配置文件升级
	if len(certificateSection) > 0 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}

		config.DeleteSection("server")
		config.DeleteSection("backend")
		config.DeleteSection("ranzhi")
		config.DeleteSection("log")
		config.DeleteSection("certificate")

		config.MustValueSet("server", "ip", Config.Ip)
		config.MustValueSet("server", "commonPort", Config.CommonPort)
		config.MustValueSet("server", "chatPort", Config.ChatPort)
		https := "on"
		if Config.IsHttps == "0" {
			https = "off"
		}
		config.MustValueSet("server", "https", https)
		config.MustValueSet("server", "uploadPath", Config.UploadPath)
		config.MustValueSet("server", "maxOnlineUser", Int642String(Config.MaxOnlineUser))
		config.MustValueSet("server", "logPath", Config.LogPath)
		config.MustValueSet("server", "crtPath", Config.CrtPath)
		config.MustValueSet("server", "debug", "0")
		config.MustValueSet("server", "sessionSavePath", "session/")

		for key, value := range Config.RanzhiServer {
			server := RanzhiServer(value)
			config.MustValueSet("backend", key, server.RanzhiAddr+","+string(server.RanzhiToken))
		}

		goconfig.SaveConfigFile(config, dir+"/"+configPath)

		Println(GetLang("The configuration file has been updated to the latest", "."))
		Println(GetLang("The old configuration file is backed up for you as xxd.conf.old"))
	}

	// 针对添加 pollingInterval 设置项
	pollingIntervalConfig, _ := config.GetValue("server", "pollingInterval")
	if interval, _ := String2Int64(removeComment(pollingIntervalConfig)); interval < 5 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "pollingInterval", "15")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	// 针对添加 enableAES 设置项
	enableAESConfig, _ := config.GetValue("server", "enableAES")
	if enableAES, _ := String2Int64(removeComment(enableAESConfig)); enableAESConfig == "" || enableAES < 0 || enableAES > 1 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "enableAES", "1")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	// 针对添加 enableClientAES 设置项
	enableClientAESConfig, _ := config.GetValue("server", "enableClientAES")
	if enableClientAES, _ := String2Int64(removeComment(enableClientAESConfig)); enableClientAESConfig == "" || enableClientAES < 0 || enableClientAES > 1 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "enableClientAES", "1")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	// 针对添加 enableCompression 设置项
	enableCompressionConfig, _ := config.GetValue("server", "enableCompression")
	if enableCompression, _ := String2Int64(removeComment(enableCompressionConfig)); enableCompressionConfig == "" || enableCompression < 0 || enableCompression > 1 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "enableCompression", "1")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	// 针对添加 stunPort 设置项
	stunPortConfig, _ := config.GetValue("server", "stunPort")
	if stunPort, _ := String2Int64(removeComment(stunPortConfig)); stunPortConfig == "" || stunPort < 1 || stunPort > 65535 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "stunPort", "3478")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	// 针对添加 thumbnail 设置项
	thumbnailConfig, _ := config.GetValue("server", "thumbnail")
	if thumbnail, _ := String2Int64(removeComment(thumbnailConfig)); thumbnailConfig == "" || thumbnail < 0 || thumbnail > 1 {
		err := goconfig.SaveConfigFile(config, dir+"/"+configPath+".old")
		if err != nil {
			Exit(Sprintf(GetLang("[Config]", " ", "The config directory has no write permissions", ", %s"), err))
		}
		config.SetValue("server", "thumbnail", "1")
		goconfig.SaveConfigFile(config, dir+"/"+configPath)
	}

	return nil
}

// 获取服务器列表,conf中[backend]段不能改名.
func getRanzhi(config *goconfig.ConfigFile) {
	var section = "backend"
	var keyList []string
	keyList = config.GetKeyList(section)

	//兼容2.1.0之前的版本
	if len(keyList) == 0 {
		section = "ranzhi"
		keyList = config.GetKeyList(section)
	}

	Config.DefaultServer = ""
	if len(keyList) > 1 {
		Config.SiteType = "multiSite"
	}

	for index, ranzhiName := range keyList {
		ranzhiServer, err := config.GetValue(section, ranzhiName)
		if err != nil {
			Exit(GetLang("[Config]", " ", "get backend server error"), err)
		}

		serverInfo := strings.Split(ranzhiServer, ",")
		//逗号前面是地址，后面是token，token长度固定为32
		if len(serverInfo) < 2 || len(serverInfo[1]) != 32 {
			LogDetail(Sprintf("serverInfo %s, the token len is %d", ranzhiServer, len(serverInfo[1])))
			Exit(GetLang("[Config]", " ", "backend server config error"))
		}

		if serverInfo[1] == "88888888888888888888888888888888" {
			Exit("[Config] The key cannot be set to 88888888888888888888888888888888")
		}

		if (len(serverInfo) >= 3 && serverInfo[2] == "default") || index == 0 {
			Config.DefaultServer = ranzhiName
		}

		Config.RanzhiServer[ranzhiName] = RanzhiServer{serverInfo[0], []byte(serverInfo[1])}
	}
}

func sizeSuffix(uploadFileSize string) (string, string) {
	if strings.HasSuffix(uploadFileSize, "K") {
		return strings.TrimSuffix(uploadFileSize, "K"), "K"
	}

	if strings.HasSuffix(uploadFileSize, "M") {
		return strings.TrimSuffix(uploadFileSize, "M"), "M"
	}

	if strings.HasSuffix(uploadFileSize, "G") {
		return strings.TrimSuffix(uploadFileSize, "G"), "G"
	}

	return uploadFileSize, ""
}

func removeComment(value string) string {
	if strings.Index(value, "#") > 0 {
		valid := strings.Split(value, "#")
		return strings.TrimSpace(valid[0])
	}
	return value
}

// 用反射来填充到数据结构中数据，server section
func getServerSection(sectionStruct *ConfigServer, confMap map[string]string) {
	serverStructReflectPointer := reflect.ValueOf(sectionStruct)
	serverStructTypeReflectElem := serverStructReflectPointer.Elem()

	for i := 0; i < serverStructTypeReflectElem.NumField(); i++ {
		tagName := serverStructTypeReflectElem.Type().Field(i).Tag.Get("confName")
		if tagName == "" {
			continue
		}

		confFieldValue, ok := confMap[tagName]
		if !ok {
			continue
		}

		confFieldValue = removeComment(confFieldValue)
		if strings.TrimSpace(confFieldValue) == "" {
			continue
		}

		serverField := serverStructTypeReflectElem.Field(i)
		if serverField.IsValid() && serverField.CanSet() {
			if serverField.Kind() == reflect.String {
				serverField.SetString(confFieldValue)
			} else if serverField.Kind() == reflect.Int64 {
				valueInt, _ := String2Int64(confFieldValue)
				serverField.SetInt(valueInt)
			}
		}
	}
}

func transUploadFileSize(uploadFileSize string) int64 {
	defaultSize := int64(32) * MB
	size, suffix := sizeSuffix(uploadFileSize)
	if fileSize, err := String2Int64(size); err == nil {
		switch suffix {
		case "K":
			defaultSize = fileSize * KB

		case "M":
			defaultSize = fileSize * MB

		case "G":
			defaultSize = fileSize * GB

		default:
			defaultSize = fileSize
		}
	}
	return defaultSize
}

func checkConfServerSection() {
	// 检查ip格式
	err := CheckIp(Config.Ip)
	if err != nil {
		Exit(GetLang("[Config]", " E_IP_UNAVAILABLE: ", "Unable to listen on IP", " ", Config.Ip, "\n", "Visit", " https://www.xuanim.com/book/xuanxuanserver/238.html#E_IP_UNAVAILABLE ", "for troubleshooting hints", "."))
	}

	// 检查最小定时请求时间间隔
	if Config.PollingInterval < 5 {
		Config.PollingInterval = 5
		Println(GetLang("[Config]", " ", "get server polling interval error", ", ", "interval should be greater than 5", "."))
	}

	// 转换https值
	if Config.IsHttps == "on" {
		Config.IsHttps = "1"
	} else {
		Config.IsHttps = "0"
	}

	// 检查AES加密
	if Config.EnableAES < 0 || Config.EnableAES > 1 {
		Config.EnableAES = 1
		Println(GetLang("[Config]", " ", "get server encryption configuration 'enableAES' error", ", ", "its value should be 0 or 1", "."))
	}

	// 检查客户端到 XXD AES 加密
	if Config.EnableClientAES < 0 || Config.EnableClientAES > 1 {
		Config.EnableClientAES = 1
		Println(GetLang("[Config]", " ", "get server encryption configuration 'enableClientAES' error", ", ", "its value should be 0 or 1", "."))
	}

	// 检查websocket通信压缩
	if Config.EnableCompression < 0 || Config.EnableCompression > 1 {
		Config.EnableCompression = 1
		Println(GetLang("[Config]", " ", "get server encryption configuration 'enableCompression' error", ", ", "its value should be 0 or 1", "."))
	}

	// 检查 thumbnail
	if Config.Thumbnail < 0 || Config.Thumbnail > 1 {
		Config.Thumbnail = 1
		Println(GetLang("[Config]", " ", "get configuration 'thumbnail' error", ", ", "its value should be 0 or 1", "."))
	}

	// 检查设置上传路径
	Config.UploadPath = GetAbsPath(Config.UploadPath) + "/"

	// 检查php session保存路径
	Config.SessionSavePath = GetAbsPath(Config.SessionSavePath) + "/"

	// 检查证书路径
	Config.CrtPath = GetAbsPath(Config.CrtPath) + "/"
}

// 获取文件的绝对路径
func GetAbsPath(path string) string {
	if !filepath.IsAbs(path) {
		dir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
		path = dir + "/" + path
	}
	if runtime.GOOS == "windows" {
		path = filepath.ToSlash(path)
	}
	return path
}

func GetSysURL() string {
	host := Config.ServerHost
	if !strings.HasSuffix(host, "/") {
		host += "/"
	}
	return host
}

func GetSysURLWithoutXxb() string {
	host := Config.ServerHost
	if strings.HasSuffix(host, "xxb/") {
		if after, ok := strings.CutSuffix(host, "xxb/"); ok {
			host = after
		}
	}
	return host
}

func GetWebUrl(path string) string {
	// 如果首个字符是/，那么移除掉/
	if after, ok := strings.CutPrefix(path, "/"); ok {
		path = after
	}
	fullPath := path
	if !strings.HasPrefix(fullPath, "data/upload/") {
		fullPath = "data/upload/" + path
	}
	realPath := GetAbsPath("site/www/" + fullPath)
	// 判断文件是否存在，如果不存在那么切掉文件后缀后返回
	if !Exists(realPath) {
		ext := filepath.Ext(fullPath)
		if ext != "" {
			fullPath = strings.TrimSuffix(fullPath, ext)
		}
	}

	return GetSysURL() + fullPath
}

// 获取程序当前运行目录
func GetRuningDir() string {
	if *runningDir != "" {
		return *runningDir
	}
	dir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
	if runtime.GOOS == "windows" {
		dir = filepath.ToSlash(dir)
	}
	return dir
}

// processOIDCConfig processes OIDC config from the given config file and sets it into `Config`
func processOIDCConfig(config *goconfig.ConfigFile) {
	oidc, err := config.GetSection("oidc")
	if err != nil {
		return
	}

	oidcConfig := OIDCConfig{}

	// process OIDC main config
	refEl := reflect.ValueOf(&oidcConfig).Elem()
	for i := 0; i < refEl.NumField(); i++ {
		tagName := refEl.Type().Field(i).Tag.Get("confName")
		if tagName == "" {
			continue
		}
		value := oidc[tagName]
		field := refEl.Field(i)
		if field.IsValid() && field.CanSet() {
			if field.Kind() == reflect.String {
				field.SetString(removeComment(value))
			} else if field.Kind() == reflect.Int64 {
				value, _ := String2Int64(removeComment(value))
				field.SetInt(value)
			}
		}
	}

	// process OIDC apps
	sectionNames := config.GetSectionList()
	appSections := []string{} // app section key starts with "oidc.app."
	for _, sectionName := range sectionNames {
		if strings.HasPrefix(sectionName, "oidc.app.") && !strings.Contains(sectionName, ".scope.") {
			appSections = append(appSections, sectionName)
		}
	}
	oidcConfig.Apps = map[string]OIDCApp{}
	if len(appSections) > 0 {
		for _, appSection := range appSections {
			app := OIDCApp{ID: strings.TrimPrefix(appSection, "oidc.app.")}
			appSectionData, _ := config.GetSection(appSection)
			refEl := reflect.ValueOf(&app).Elem()
			for i := 0; i < refEl.NumField(); i++ {
				tagName := refEl.Type().Field(i).Tag.Get("confName")
				if tagName == "" {
					continue
				}
				value := appSectionData[tagName]
				field := refEl.Field(i)
				if field.IsValid() && field.CanSet() {
					if field.Kind() == reflect.String {
						field.SetString(removeComment(value))
					}
				}
			}
			// process app scopes
			scopeSections := []string{}
			for _, sectionName := range sectionNames {
				if strings.HasPrefix(sectionName, appSection+".scope.") { // app scope section key starts with "oidc.app.<app_id>.scope."
					scopeSections = append(scopeSections, sectionName)
				}
			}
			app.Scopes = map[string]OIDCAppScope{}
			if len(scopeSections) > 0 {
				for _, scopeSection := range scopeSections {
					scope := OIDCAppScope{ID: strings.TrimPrefix(scopeSection, appSection+".scope.")}
					scopeSectionData, _ := config.GetSection(scopeSection)
					refEl := reflect.ValueOf(&scope).Elem()
					for i := 0; i < refEl.NumField(); i++ {
						tagName := refEl.Type().Field(i).Tag.Get("confName")
						if tagName == "" {
							continue
						}
						value := scopeSectionData[tagName]
						field := refEl.Field(i)
						if field.IsValid() && field.CanSet() {
							if field.Kind() == reflect.String {
								field.SetString(removeComment(value))
							}
						}
					}
					app.Scopes[scope.ID] = scope
				}
			}
			oidcConfig.Apps[app.ID] = app
		}
	}
	Config.OIDC = oidcConfig
}

// IsOIDCEnabledAndConfigured checks if OIDC is enabled and configured, returns false on any misconfiguration to prevent undefined behavior
func IsOIDCEnabledAndConfigured() bool {
	if Config.OIDC.EnableOIDC != 1 {
		return false
	}
	if Config.OIDC.SessionName == "" || Config.OIDC.SessionSecretKey == "" || Config.OIDC.SessionMaxAge <= 0 || Config.OIDC.AccessTokenExp <= 0 || Config.OIDC.DefaultDomain == "" {
		return false
	}
	if len(Config.OIDC.Apps) == 0 {
		return false
	}
	for _, app := range Config.OIDC.Apps {
		if app.ID == "" || app.Secret == "" || app.Name == "" || app.Domain == "" {
			return false
		}
		if len(app.Scopes) == 0 {
			return false
		}
		for _, scope := range app.Scopes {
			if scope.ID == "" || scope.Title == "" {
				return false
			}
		}
	}

	return true
}

// processServicesConfig processes services config from the given config file and sets it into `Config`
func processServicesConfig(config *goconfig.ConfigFile) {
	serviceSection, err := config.GetSection("service")
	if err != nil {
		return
	}

	Config.Services = map[string]Service{}
	for key, value := range serviceSection {
		Config.Services[key] = Service{Config: strings.Split(value, ",")}
	}
}

// 用反射来填充到数据结构中数据，mysql section
func getMysqlSection(sectionStruct *MysqlConfig, confMap map[string]string) {
	mysqlStructReflectPointer := reflect.ValueOf(sectionStruct)
	mysqlStructTypeReflectElem := mysqlStructReflectPointer.Elem()

	for i := 0; i < mysqlStructTypeReflectElem.NumField(); i++ {
		tagName := mysqlStructTypeReflectElem.Type().Field(i).Tag.Get("confName")
		confFieldValue := confMap[tagName]
		mysqlField := mysqlStructTypeReflectElem.Field(i)
		if mysqlField.IsValid() && mysqlField.CanSet() {
			switch mysqlField.Kind() {
			case reflect.String:
				mysqlField.SetString(removeComment(confFieldValue))
			case reflect.Int:
				valueInt, _ := String2Int64(removeComment(confFieldValue))
				mysqlField.SetInt(valueInt)
			case reflect.Uint16:
				valueInt, _ := String2Int64(removeComment(confFieldValue))
				mysqlField.SetUint(uint64(valueInt))
			case reflect.Bool:
				valueBool, _ := String2Int64(removeComment(confFieldValue))
				mysqlField.SetBool(valueBool == 1)
			case reflect.Int64:
				if tagName == "maxLifetime" {
					valueInt, _ := String2Int64(removeComment(confFieldValue))
					mysqlField.SetInt(valueInt)
				} else {
					valueInt, _ := String2Int64(removeComment(confFieldValue))
					mysqlField.SetInt(valueInt)
				}
			}
		}
	}
}

// 用反射来填充到数据结构中数据，cluster section
func getClusterSection(sectionStruct *ClusterConfig, confMap map[string]string) {
	clusterStructReflectPointer := reflect.ValueOf(sectionStruct)
	clusterStructTypeReflectElem := clusterStructReflectPointer.Elem()

	for i := 0; i < clusterStructTypeReflectElem.NumField(); i++ {
		tagName := clusterStructTypeReflectElem.Type().Field(i).Tag.Get("confName")
		confFieldValue := confMap[tagName]
		clusterField := clusterStructTypeReflectElem.Field(i)
		if clusterField.IsValid() && clusterField.CanSet() {
			switch clusterField.Kind() {
			case reflect.String:
				clusterField.SetString(removeComment(confFieldValue))
			case reflect.Bool:
				valueBool, _ := String2Int64(removeComment(confFieldValue))
				clusterField.SetBool(valueBool == 1)
			}
		}
	}
}

// ReplaceSessionPathInPhpIni 将php.ini文件中的%SESSION_PATH%替换为实际的SessionSavePath路径
func ReplaceSessionPathInPhpIni() error {
	phpIniPath := GetRuningDir() + "/php.ini"
	phpIniContent, err := os.ReadFile(phpIniPath)
	if err != nil {
		return err
	}

	sessionPath := Config.SessionSavePath
	if sessionPath == "" {
		sessionPath = GetRuningDir() + "/session/"
	}
	if err := os.MkdirAll(sessionPath, 0755); err != nil {
		return fmt.Errorf("create session dir %s: %w", sessionPath, err)
	}
	ioncubePath := GetRuningDir() + "/php"

	newContent := strings.ReplaceAll(string(phpIniContent), "%SESSION_PATH%", sessionPath)
	newContent = strings.ReplaceAll(newContent, "%IONCUBE_PATH%", ioncubePath)

	err = os.WriteFile(phpIniPath, []byte(newContent), 0644)
	if err != nil {
		return err
	}

	return nil
}
