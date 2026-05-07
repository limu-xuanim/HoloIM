/**
 * The install file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Unknwon/goconfig"
)

// IsAlreadyInstalled 检查是否已完成安装（xxd.conf 存在且 [server] installed=1）。
func IsAlreadyInstalled() bool {
	configPath := GetRuningDir() + "/config/xxd.conf"
	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		return false
	}
	v, err := config.GetValue("server", "installed")
	if err != nil {
		return false
	}
	return strings.TrimSpace(v) == "1"
}

// checkConfigFiles 检查配置文件是否存在
// 返回: (xxd.conf存在, my.php存在, 错误)
func checkConfigFiles() (bool, bool, error) {
	configPath := GetRuningDir() + "/config/xxd.conf"
	myPHPPath := GetRuningDir() + "/site/config/my.php"

	xxdConfExists := false
	myPHPExists := false

	if info, err := os.Stat(configPath); err == nil && !info.IsDir() {
		xxdConfExists = true
	}

	if info, err := os.Stat(myPHPPath); err == nil && !info.IsDir() {
		myPHPExists = true
	}

	return xxdConfExists, myPHPExists, nil
}

// Installer 安装器结构体
type Installer struct {
	Quiet bool // 静默安装模式

	// 静默安装配置参数（可选，如果为空则使用默认值）
	CommonPort string
	ChatPort   string
	AdminPort  string
	StunPort   string
	Https      string
	ServerHost string
	DbPort     string
	DbPassword string
}

// NewInstaller 创建新的安装器实例
func NewInstaller() *Installer {
	return &Installer{Quiet: false}
}

// NewQuietInstaller 创建静默安装器实例
func NewQuietInstaller() *Installer {
	return &Installer{
		Quiet: true,
		// 从全局变量获取配置参数（如果通过命令行传入）
		CommonPort: QuietInstallCommonPort,
		ChatPort:   QuietInstallChatPort,
		AdminPort:  QuietInstallAdminPort,
		StunPort:   QuietInstallStunPort,
		Https:      QuietInstallHttps,
		ServerHost: QuietInstallServerHost,
		DbPort:     QuietInstallDbPort,
		DbPassword: QuietInstallDbPassword,
	}
}

var WebInstallFn func() error

// InstallParams Web 安装向导提交的安装参数
type InstallParams struct {
	// 数据库
	DbHost     string
	DbPort     string
	DbUser     string
	DbPassword string
	DbName     string

	// 服务器
	CommonPort string
	ChatPort   string
	AdminPort  string
	StunPort   string
	Https      string // "on" | "off"
	ServerHost string // 完整 URL，形如 http://127.0.0.1:9080/xxb/

	// 可选
	ImportDemo    bool
	AdminUser     string
	AdminPassword string
}

// GetLocalIPs 获取本机的所有非回环 IPv4 地址（供外部包调用）
func GetLocalIPs() []string { return getLocalIPs() }

// getLocalIPs 获取本机的所有非回环IP地址
func getLocalIPs() []string {
	var ips []string
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ips
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok {
			continue
		}
		ip := ipNet.IP
		// 跳过回环地址和IPv6地址
		if ip.IsLoopback() || ip.To4() == nil {
			continue
		}
		ips = append(ips, ip.String())
	}
	return ips
}

// isPortInUse 检查端口是否被占用（同时检查 TCP 和 UDP）
func isPortInUse(port string) bool {
	addr := ":" + port

	// 检查 TCP 端口
	tcpListener, err := net.Listen("tcp", addr)
	if err != nil {
		return true // TCP 端口被占用
	}
	tcpListener.Close()

	// 检查 UDP 端口
	udpConn, err := net.ListenPacket("udp", addr)
	if err != nil {
		return true // UDP 端口被占用
	}
	udpConn.Close()

	return false // TCP 和 UDP 端口都可用
}

// getPortWithCheck 检查端口是否被占用，如果被占用则询问用户，否则直接使用默认值
func getPortWithCheck(portName, defaultPort string) string {
	// 先检查默认端口是否被占用
	if !isPortInUse(defaultPort) {
		// 端口未被占用，直接使用默认值
		return defaultPort
	}

	// 端口被占用，提示用户并询问
	fmt.Printf("端口 %s (默认: %s) 已被占用。\n", portName, defaultPort)
	fmt.Printf("Port %s (default: %s) is already in use.\n", portName, defaultPort)
	fmt.Printf("请设置其他端口 (Please set another port) [%s]: ", defaultPort)
	port, _ := ReadLine()
	port = strings.TrimSpace(port)
	if port == "" {
		port = defaultPort
	}

	// 递归询问，直到用户输入一个可用的端口
	return getPortWithCheck(portName, port)
}

// getServerHostInteractively 交互式获取服务器主机地址
// scheme: 协议类型 ("http" 或 "https")
// adminPort: 管理端口号
// 返回: 完整的服务器主机地址（包含协议、主机、端口和末尾斜杠）
func getServerHostInteractively(scheme, adminPort string) (string, error) {
	defaultHost := fmt.Sprintf("%s://127.0.0.1", scheme)

	// 获取本机IP地址列表
	localIPs := getLocalIPs()
	var serverHost string

	if len(localIPs) > 0 {
		fmt.Println()
		fmt.Println("检测到以下IP地址，请选择服务器主机地址 (Detected IP addresses, please select server host):")
		for i, ip := range localIPs {
			fmt.Printf("%d. %s://%s\n", i+1, scheme, ip)
		}
		fmt.Printf("%d. 手动输入域名或IP地址 (Manual input domain or IP)\n", len(localIPs)+1)
		fmt.Print("请选择 (Please select) [1]: ")
		choice, _ := ReadLine()
		choice = strings.TrimSpace(choice)

		if choice == "" {
			choice = "1"
		}

		choiceNum, err := strconv.Atoi(choice)
		if err != nil || choiceNum <= 0 || choiceNum > len(localIPs)+1 {
			serverHost = fmt.Sprintf("%s://%s", scheme, localIPs[0])
		} else if choiceNum == len(localIPs)+1 {
			// 手动输入
			fmt.Printf("请输入服务器主机地址 (Please enter server host) [%s://]: ", scheme)
			hostInput, _ := ReadLine()
			hostInput = strings.TrimSpace(hostInput)
			if hostInput == "" {
				serverHost = defaultHost
			} else {
				// 如果用户输入包含协议，直接使用；否则添加协议前缀
				if strings.HasPrefix(hostInput, "http://") || strings.HasPrefix(hostInput, "https://") {
					serverHost = hostInput
				} else {
					serverHost = fmt.Sprintf("%s://%s", scheme, hostInput)
				}
			}
		} else {
			serverHost = fmt.Sprintf("%s://%s", scheme, localIPs[choiceNum-1])
		}
	} else {
		// 如果没有检测到IP地址，使用默认值
		fmt.Printf("服务器主机地址 (Server Host) [%s]: ", defaultHost)
		serverHostInput, _ := ReadLine()
		serverHostInput = strings.TrimSpace(serverHostInput)
		if serverHostInput == "" {
			serverHost = defaultHost
		} else {
			// 如果用户输入包含协议，直接使用；否则添加协议前缀
			if strings.HasPrefix(serverHostInput, "http://") || strings.HasPrefix(serverHostInput, "https://") {
				serverHost = serverHostInput
			} else {
				serverHost = fmt.Sprintf("%s://%s", scheme, serverHostInput)
			}
		}
	}

	// 解析 URL，补齐端口和路径，规范成 http(s)://host:port/xxb/ 形式
	parsedURL, err := url.Parse(serverHost)
	if err == nil && parsedURL.Host != "" {
		// 检查 Host 中是否已包含端口号
		host, port, errPort := net.SplitHostPort(parsedURL.Host)
		if errPort != nil {
			// 没有端口号时追加 Admin Port
			parsedURL.Host = parsedURL.Host + ":" + adminPort
		} else if host != "" && port == "" {
			// 理论上不会出现，仅防御：有 host 无 port 时仍补充端口
			parsedURL.Host = host + ":" + adminPort
		}

		// 无论用户输入什么路径，这里统一规范为 /xxb/
		parsedURL.Path = "/xxb/"
		parsedURL.RawPath = ""

		serverHost = parsedURL.String()
	} else {
		// 解析失败时的保底处理：简单拼接 /xxb/，避免出现无前缀的配置
		if !strings.HasSuffix(serverHost, "/") {
			serverHost += "/"
		}
		serverHost += "xxb/"
	}

	return serverHost, nil
}

// RunInstallation 运行安装流程
func (i *Installer) RunInstallation() error {
	if !i.Quiet {
		fmt.Println("==========================================")
		fmt.Println("欢迎使用喧喧消息转发服务器安装程序")
		fmt.Println("Welcome to Xuan Daemon Installation")
		fmt.Println("==========================================")
		fmt.Println()

		// 全新安装场景
		fmt.Println("系统将指导完成MySQL配置。")
		fmt.Println("The installation will help you set up MySQL.")
	}

	if err := i.configureDatabase(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "configure database failed: %v"), err)
	}
	// 全新安装时需要配置服务器
	if err := i.configureServer(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "configure server failed: %v"), err)
	}

	if err := i.executeSql(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "execute sql failed: %v"), err)
	}

	// 标记为已安装
	Config.Installed = 1

	// 保存配置
	if err := i.saveConfig(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "save config failed: %v"), err)
	}

	if !i.Quiet {
		fmt.Println()
		fmt.Println("==========================================")
		fmt.Println("安装完成！Installation completed!")
		fmt.Println("请重启服务以使配置生效：")
		fmt.Println("Please restart the service to make the configuration take effect:")
		fmt.Println("==========================================")
		fmt.Println()
	}
	Exit(1)
	return nil
}

func (i *Installer) configureServer() error {
	if !i.Quiet {
		fmt.Println()
		fmt.Println("开始配置服务器...")
		fmt.Println("Configuring server...")
		fmt.Println()
	}

	var commonPort, chatPort, apiPort, adminPort, stunPort, https, serverHost string

	if i.Quiet {
		// 静默模式：优先使用传入的参数，如果为空则使用默认值
		if i.CommonPort != "" {
			commonPort = i.CommonPort
		} else {
			commonPort = "11443"
		}

		if i.ChatPort != "" {
			chatPort = i.ChatPort
		} else {
			chatPort = "11444"
		}

		apiPort = "9090"

		if i.AdminPort != "" {
			adminPort = i.AdminPort
		} else {
			adminPort = "9080"
		}

		if i.StunPort != "" {
			stunPort = i.StunPort
		} else {
			stunPort = "3478"
		}

		if i.Https != "" {
			https = i.Https
		} else {
			https = "off"
		}

		// 处理 serverHost
		if i.ServerHost != "" {
			serverHost = i.ServerHost
			// 确保末尾有斜杠
			if !strings.HasSuffix(serverHost, "/") {
				serverHost = serverHost + "/"
			}
		} else {
			// IP 地址使用 127.0.0.1
			serverHost = fmt.Sprintf("http://127.0.0.1:%s/", adminPort)
		}
	} else {
		// 检查并获取端口，如果未被占用则直接使用默认值，被占用则询问用户
		commonPort = getPortWithCheck("登录和附件上传端口 (Common Port)", "11443")
		chatPort = getPortWithCheck("聊天消息通讯端口 (Chat Port)", "11444")
		apiPort = getPortWithCheck("后台API端口 (API Port)", "9090")
		adminPort = getPortWithCheck("后台管理端口 (Admin Port)", "9080")
		stunPort = getPortWithCheck("点对点传输时的 NAT 穿越服务端口 (STUN Port)", "3478")

		fmt.Print("是否启用HTTPS (HTTPS) (on|off) [off]: ")
		https, _ = ReadLine()
		https = strings.TrimSpace(https)
		if https == "" || (https != "on" && https != "off") {
			https = "off"
		}

		// 根据HTTPS设置确定协议
		scheme := "http"
		if https == "on" {
			scheme = "https"
		}

		// 使用公共函数交互获取服务器主机地址
		var err error
		serverHost, err = getServerHostInteractively(scheme, adminPort)
		if err != nil {
			return fmt.Errorf("get server host interactively failed: %w", err)
		}
	}

	Config.CommonPort = commonPort
	Config.ChatPort = chatPort
	Config.ApiPort = apiPort
	Config.AdminPort = adminPort
	Config.IsHttps = "0"
	if https == "on" {
		Config.IsHttps = "1"
	}
	Config.StunPort = stunPort
	Config.Debug = 0

	Config.Ip = "0.0.0.0"
	Config.UploadPath = "files/"
	Config.LogPath = "log/"
	Config.CrtPath = "cert/"
	Config.SessionSavePath = "session/"

	Config.PollingInterval = 15
	Config.MaxOnlineUser = 0
	Config.EnableAES = 1
	Config.EnableClientAES = 1
	Config.EnableCompression = 1
	Config.Thumbnail = 1

	Config.Lang = "zh-cn"
	Config.ServerHost = serverHost
	Config.RequestType = "GET"
	Config.BackendUrl = serverHost
	Config.BackendType = "xxb"

	return nil
}

// configureDatabase 配置数据库
func (i *Installer) configureDatabase() error {
	if !i.Quiet {
		fmt.Println()
		fmt.Println("开始配置MySQL数据库...")
		fmt.Println("Configuring MySQL database...")
		fmt.Println()
	}

	var host, portStr, username, password, database string

	if i.Quiet {
		// 静默模式：使用默认值（zbox 内置数据库）
		host = "127.0.0.1"
		if i.DbPort != "" {
			portStr = i.DbPort
		} else {
			portStr = "3306"
		}
		username = "root"
		if i.DbPassword != "" {
			password = i.DbPassword
		} else {
			password = "123456"
		}
		database = "xxb"
	} else {
		// 获取数据库主机
		fmt.Print("数据库主机地址 (Database Host) [127.0.0.1]: ")
		host, _ = ReadLine()
		host = strings.TrimSpace(host)
		if host == "" {
			host = "127.0.0.1"
		}

		// 获取数据库端口
		fmt.Print("数据库端口 (Database Port) [3306]: ")
		portStr, _ = ReadLine()
		portStr = strings.TrimSpace(portStr)
		if portStr == "" {
			portStr = "3306"
		}

		// 获取用户名
		fmt.Print("数据库用户名 (Database Username) [root]: ")
		username, _ = ReadLine()
		username = strings.TrimSpace(username)
		if username == "" {
			username = "root"
		}

		// 获取密码
		fmt.Print("数据库密码 (Database Password) [123456]: ")
		password, _ = ReadLine()
		password = strings.TrimSpace(password)
		if password == "" {
			password = "123456"
		}

		// 获取数据库名
		fmt.Print("数据库名称 (Database Name) [xxb]: ")
		database, _ = ReadLine()
		database = strings.TrimSpace(database)
		if database == "" {
			database = "xxb"
		}
	}

	port, err := strconv.ParseUint(portStr, 10, 16)
	if err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "invalid port: %v"), err)
	}

	// 更新配置
	Config.Mysql.Enable = true
	Config.Mysql.Host = host
	Config.Mysql.Username = username
	Config.Mysql.Password = password
	Config.Mysql.DbPort = int64(port)
	Config.Mysql.Database = database
	Config.Mysql.TablePrefix = "xxb_"
	Config.Mysql.SysPrefix = "xxb_"

	// 默认配置
	Config.Mysql.Charset = "utf8mb4"
	Config.Mysql.MaxIdleConns = 10
	Config.Mysql.MaxOpenConns = 100
	Config.Mysql.MaxLifetime = time.Hour
	Config.Mysql.LogLevel = 1
	Config.Mysql.PrintSql = false

	return nil
}

func (i *Installer) executeSql() error {
	var importDemo string

	if i.Quiet {
		// 静默模式：不导入演示数据
		importDemo = "n"
	} else {
		// 询问是否导入演示数据
		fmt.Println()
		fmt.Print("是否导入演示数据？(Do you want to import demo data?) [y/N]: ")
		importDemo, _ = ReadLine()
		importDemo = strings.TrimSpace(strings.ToLower(importDemo))
	}

	username, password := i.setAdminAccount()

	if !i.Quiet {
		fmt.Println()
		fmt.Println("正在初始化数据库...")
		fmt.Println("Initializing database...")
	}

	// 测试数据库连接
	if err := i.initDatabase(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "initializing database failed: %v"), err)
	}

	if importDemo == "y" || importDemo == "yes" {
		if err := i.importDemoData(); err != nil {
			return fmt.Errorf(GetLang("[Install] ", " ", "importing demo data failed: %v"), err)
		}
		if !i.Quiet {
			fmt.Println("演示数据导入成功！")
			fmt.Println("Demo data imported successfully!")
		}
	} else {
		if !i.Quiet {
			fmt.Println("已跳过演示数据导入。")
			fmt.Println("Demo data import skipped.")
		}
	}

	if err := updateVersion(Version); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "updating version failed: %v"), err)
	}

	// 创建管理员账号
	err := i.createAdminAccount(username, password)
	if err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "setting admin account failed: %v"), err)
	}

	if err := i.saveMyPHP(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "saving my.php file failed: %v"), err)
	}

	return nil
}

func (i *Installer) setAdminAccount() (string, string) {
	if !i.Quiet {
		fmt.Println()
		fmt.Println("开始设置管理员账号...")
		fmt.Println("Setting admin account...")
		fmt.Println()
	}

	var username, password string

	if i.Quiet {
		// 静默模式：使用默认值
		username = "admin"
		password = "123456"
	} else {
		fmt.Print("管理员账号 (Admin Username) [admin]: ")
		username, _ = ReadLine()
		username = strings.TrimSpace(username)
		if username == "" {
			username = "admin"
		}

		fmt.Print("管理员密码 (Admin Password) [123456]: ")
		password, _ = ReadLine()
		password = strings.TrimSpace(password)
		if password == "" {
			password = "123456"
		}
	}

	return username, password
}

func (i *Installer) saveMyPHP() error {
	myPHPPath := GetRuningDir() + "/site/config/my.php"
	// 判断文件是否存在，如果存在则删除
	if _, err := os.Stat(myPHPPath); !os.IsNotExist(err) {
		os.Remove(myPHPPath)
	}
	// 逐行写入
	lines := []string{
		"<?php",
		"$config->installed    = true;",
		"$config->debug        = false;",
		"$config->requestType  = '" + Config.RequestType + "';",
		"$config->db->host     = '" + Config.Mysql.Host + "';",
		"$config->db->port     = '" + strconv.Itoa(int(Config.Mysql.DbPort)) + "';",
		"$config->db->name     = '" + Config.Mysql.Database + "';",
		"$config->db->user     = '" + Config.Mysql.Username + "';",
		"$config->db->password = '" + Config.Mysql.Password + "';",
		"$config->db->prefix   = '" + Config.Mysql.TablePrefix + "';",
	}
	myPHPContent := strings.Join(lines, "\n")
	err := os.WriteFile(myPHPPath, []byte(myPHPContent), 0644)
	if err != nil {
		return err
	}
	return nil
}

// RunWithParams 以 Web 参数模式运行安装流程，不使用 CLI 交互。
func (i *Installer) RunWithParams(params InstallParams, logFn func(string)) error {
	// 安装期间抑制 SQL 语句输出到 stdout
	origQuiet := QuietInstallFlag
	QuietInstallFlag = true
	defer func() { QuietInstallFlag = origQuiet }()

	logFn("正在应用数据库配置...")
	i.applyDatabaseParams(params)

	logFn("正在应用服务器配置...")
	i.applyServerParams(params)

	if err := i.initDatabaseWithLog(logFn); err != nil {
		return fmt.Errorf("初始化数据库失败: %w", err)
	}

	if params.ImportDemo {
		logFn("正在导入演示数据...")
		if err := i.importDemoData(); err != nil {
			return fmt.Errorf("导入演示数据失败: %w", err)
		}
		logFn("演示数据导入完成")
	}

	logFn("正在写入版本号...")
	if err := updateVersion(Version); err != nil {
		return fmt.Errorf("写入版本号失败: %w", err)
	}

	adminUser := params.AdminUser
	if adminUser == "" {
		adminUser = "admin"
	}
	adminPassword := params.AdminPassword
	if adminPassword == "" {
		adminPassword = "123456"
	}
	logFn("正在创建管理员账号 " + adminUser + "...")
	if err := i.createAdminAccount(adminUser, adminPassword); err != nil {
		return fmt.Errorf("创建管理员账号失败: %w", err)
	}

	logFn("正在保存 my.php 配置...")
	if err := i.saveMyPHP(); err != nil {
		return fmt.Errorf("保存 my.php 失败: %w", err)
	}

	Config.Installed = 1
	logFn("正在保存 xxd.conf 配置文件...")
	if err := i.saveConfig(); err != nil {
		return fmt.Errorf("保存配置文件失败: %w", err)
	}

	logFn("安装完成！")
	return nil
}

// applyDatabaseParams 将 InstallParams 中的数据库参数写入全局 Config
func (i *Installer) applyDatabaseParams(params InstallParams) {
	host := params.DbHost
	if host == "" {
		host = "127.0.0.1"
	}
	portStr := params.DbPort
	if portStr == "" {
		portStr = "3306"
	}
	username := params.DbUser
	if username == "" {
		username = "root"
	}
	password := params.DbPassword
	if password == "" {
		password = "123456"
	}
	database := params.DbName
	if database == "" {
		database = "xxb"
	}

	port, err := strconv.ParseUint(portStr, 10, 16)
	if err != nil {
		port = 3306
	}

	Config.Mysql.Enable = true
	Config.Mysql.Host = host
	Config.Mysql.Username = username
	Config.Mysql.Password = password
	Config.Mysql.DbPort = int64(port)
	Config.Mysql.Database = database
	Config.Mysql.TablePrefix = "xxb_"
	Config.Mysql.SysPrefix = "xxb_"
	Config.Mysql.Charset = "utf8mb4"
	Config.Mysql.MaxIdleConns = 10
	Config.Mysql.MaxOpenConns = 100
	Config.Mysql.MaxLifetime = time.Hour
	Config.Mysql.LogLevel = 1
	Config.Mysql.PrintSql = false
}

// applyServerParams 将 InstallParams 中的服务器参数写入全局 Config
func (i *Installer) applyServerParams(params InstallParams) {
	commonPort := params.CommonPort
	if commonPort == "" {
		commonPort = "11443"
	}
	chatPort := params.ChatPort
	if chatPort == "" {
		chatPort = "11444"
	}
	adminPort := params.AdminPort
	if adminPort == "" {
		adminPort = "9080"
	}
	stunPort := params.StunPort
	if stunPort == "" {
		stunPort = "3478"
	}
	https := params.Https
	if https == "" {
		https = "off"
	}
	serverHost := params.ServerHost
	if serverHost == "" {
		serverHost = fmt.Sprintf("http://127.0.0.1:%s/xxb/", adminPort)
	} else if !strings.HasSuffix(serverHost, "/") {
		serverHost += "/"
	}

	Config.CommonPort = commonPort
	Config.ChatPort = chatPort
	Config.ApiPort = "9090"
	Config.AdminPort = adminPort
	Config.IsHttps = "0"
	if https == "on" {
		Config.IsHttps = "1"
	}
	Config.StunPort = stunPort
	Config.Debug = 0
	Config.Ip = "0.0.0.0"
	Config.UploadPath = "files/"
	Config.LogPath = "log/"
	Config.CrtPath = "cert/"
	Config.SessionSavePath = "session/"
	Config.PollingInterval = 15
	Config.MaxOnlineUser = 0
	Config.EnableAES = 1
	Config.EnableClientAES = 1
	Config.EnableCompression = 1
	Config.Thumbnail = 1
	Config.Lang = "zh-cn"
	Config.ServerHost = serverHost
	Config.RequestType = "GET"
	Config.BackendUrl = serverHost
	Config.BackendType = "xxb"
}

// initDatabaseWithLog 初始化数据库并通过 logFn 输出进度
func (i *Installer) initDatabaseWithLog(logFn func(string)) error {
	logFn("正在创建数据库...")
	if err := CreateDatabase(); err != nil {
		return fmt.Errorf("创建数据库失败: %w", err)
	}

	logFn("正在导入表结构 (xxb.sql)...")
	if err := ExecSQLFile("xxb.sql"); err != nil {
		return fmt.Errorf("执行 xxb.sql 失败: %w", err)
	}

	logFn("正在导入喧喧基础配置 (xuanxuan.sql)...")
	if err := ExecSQLFile("xuanxuan.sql"); err != nil {
		return fmt.Errorf("执行 xuanxuan.sql 失败: %w", err)
	}

	logFn("数据库初始化完成")
	return nil
}

// 初始化数据库
func (i *Installer) initDatabase() error {
	fmt.Println()
	fmt.Println("开始创建数据库...")
	fmt.Println("Creating database...")
	fmt.Println()

	if err := CreateDatabase(); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "creating database failed: %v"), err)
	}
	if err := ExecSQLFile("xxb.sql"); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "executing xxb.sql file failed: %v"), err)
	}
	if err := ExecSQLFile("xuanxuan.sql"); err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "executing xuanxuan.sql file failed: %v"), err)
	}
	// if err := ExecSQLFile("strict.sql"); err != nil {
	// 	return fmt.Errorf(GetLang("[Install] ", " ", "executing strict.sql file failed: %v"), err)
	// }

	fmt.Println("数据库创建完成！")
	fmt.Println("Database creation completed!")
	return nil
}

type AdminUserCreateFields struct {
	Dept        int64      `json:"dept" gorm:"column:dept"`
	Account     string     `json:"account" gorm:"column:account"`
	Password    string     `json:"password" gorm:"column:password"`
	Realname    string     `json:"realname" gorm:"column:realname"`
	Pinyin      string     `json:"pinyin" gorm:"column:pinyin"`
	Role        string     `json:"role" gorm:"column:role"`
	DeviceToken string     `json:"deviceToken" gorm:"column:deviceToken"`
	DeviceType  string     `json:"deviceType" gorm:"column:deviceType"`
	Nickname    string     `json:"nickname" gorm:"column:nickname"`
	Admin       string     `json:"admin" gorm:"column:admin"`
	Avatar      string     `json:"avatar" gorm:"column:avatar"`
	Birthday    *time.Time `json:"birthday" gorm:"column:birthday"`
	Gender      string     `json:"gender" gorm:"column:gender"`
	Email       string     `json:"email" gorm:"column:email"`
	Skype       string     `json:"skype" gorm:"column:skype"`
	QQ          string     `json:"qq" gorm:"column:qq"`
	Weixin      string     `json:"weixin" gorm:"column:weixin"`
	Yahoo       string     `json:"yahoo" gorm:"column:yahoo"`
	Gtalk       string     `json:"gtalk" gorm:"column:gtalk"`
	Wangwang    string     `json:"wangwang" gorm:"column:wangwang"`
	Site        string     `json:"site" gorm:"column:site"`
	Mobile      string     `json:"mobile" gorm:"column:mobile"`
	Phone       string     `json:"phone" gorm:"column:phone"`
	Address     string     `json:"address" gorm:"column:address"`
	Zipcode     string     `json:"zipcode" gorm:"column:zipcode"`
	Visits      int64      `json:"visits" gorm:"column:visits"`
	IP          string     `json:"ip" gorm:"column:ip"`
	Last        *time.Time `json:"last" gorm:"column:last;type:datetime"`
	Ping        *time.Time `json:"ping" gorm:"column:ping;type:datetime"`
	Fails       int64      `json:"fails" gorm:"column:fails"`
	Join        *time.Time `json:"join" gorm:"column:join;type:datetime"`
	Locked      *time.Time `json:"locked" gorm:"column:locked;type:datetime"`
	Deleted     string     `json:"deleted" gorm:"column:deleted"`
}

func (i *Installer) createAdminAccount(account, password string) error {
	password = MD5(MD5(password) + account)
	now := time.Now()
	admin := AdminUserCreateFields{
		Dept:        0,
		Account:     account,
		Password:    password,
		Realname:    account,
		Pinyin:      "",
		Role:        "",
		DeviceToken: "",
		DeviceType:  "",
		Nickname:    "",
		Admin:       "super",
		Avatar:      "",
		Birthday:    nil,
		Gender:      "u",
		Email:       "",
		Skype:       "",
		QQ:          "",
		Weixin:      "",
		Yahoo:       "",
		Gtalk:       "",
		Wangwang:    "",
		Site:        "",
		Mobile:      "",
		Phone:       "",
		Address:     "",
		Zipcode:     "",
		Visits:      0,
		IP:          "",
		Last:        &now,
		Ping:        &now,
		Fails:       0,
		Join:        &now,
		Locked:      nil,
		Deleted:     "0",
	}

	err := MysqlDB.Table(Config.Mysql.TablePrefix + "user").Create(admin).Error
	if err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "create admin account failed: %v"), err)
	}

	return nil
}

func (i *Installer) importDemoData() error {
	if !i.Quiet {
		fmt.Println()
		fmt.Println("开始导入演示数据...")
		fmt.Println("Importing demo data...")
		fmt.Println()
	}

	err := ExecSQLFile("demo.zh-cn.sql")
	if err != nil {
		return fmt.Errorf(GetLang("[Install] ", " ", "importing demo data failed: %v"), err)
	}
	return nil
}

// saveConfigInternal 将当前内存中的 Config 写回到 xxd.conf，并按需更新数据库中的 xuanxuan 配置。
// updateXuanxuanConfig 为 true 时会写入 config 表中的默认 xuanxuan 配置；为 false 时仅更新 xxd.conf。
func saveConfigInternal(updateXuanxuanConfig bool) error {

	configPath := GetRuningDir() + "/config/xxd.conf"

	// 读取现有配置文件
	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		// 如果配置文件不存在，创建一个新的空配置文件
		// 先创建一个临时文件
		tempFile, err := os.Create(configPath)
		if err != nil {
			return fmt.Errorf(GetLang("[Install] ", " ", "create config file failed: %v"), err)
		}
		tempFile.Close()

		// 再次尝试加载
		config, err = goconfig.LoadConfigFile(configPath)
		if err != nil {
			return fmt.Errorf(GetLang("[Install] ", " ", "load config file failed: %v"), err)
		}
	}

	// 更新server section
	config.SetValue("server", "installed", "1")
	config.SetValue("server", "ip", Config.Ip)
	config.SetValue("server", "commonPort", Config.CommonPort)
	config.SetValue("server", "chatPort", Config.ChatPort)
	config.SetValue("server", "apiPort", Config.ApiPort)
	config.SetValue("server", "adminPort", Config.AdminPort)
	https := "on"
	if Config.IsHttps == "0" {
		https = "off"
	}
	config.SetValue("server", "https", https)
	config.SetValue("server", "stunPort", Config.StunPort)
	config.SetValue("server", "uploadPath", Config.UploadPath)
	config.SetValue("server", "logPath", Config.LogPath)
	config.SetValue("server", "certPath", Config.CrtPath)
	config.SetValue("server", "sessionSavePath", Config.SessionSavePath)
	config.SetValue("server", "pollingInterval", fmt.Sprintf("%d", Config.PollingInterval))
	config.SetValue("server", "maxOnlineUser", fmt.Sprintf("%d", Config.MaxOnlineUser))
	config.SetValue("server", "debug", fmt.Sprintf("%d", Config.Debug))
	config.SetValue("server", "enableAES", fmt.Sprintf("%d", Config.EnableAES))
	config.SetValue("server", "enableClientAES", fmt.Sprintf("%d", Config.EnableClientAES))
	config.SetValue("server", "enableCompression", fmt.Sprintf("%d", Config.EnableCompression))
	config.SetValue("server", "thumbnail", fmt.Sprintf("%d", Config.Thumbnail))
	config.SetValue("server", "lang", Config.Lang)
	config.SetValue("server", "serverHost", Config.ServerHost)
	config.SetValue("server", "requestType", Config.RequestType)
	config.SetValue("server", "backendType", Config.BackendType)

	// 更新mysql section
	config.SetValue("mysql", "enable", "1")
	config.SetValue("mysql", "host", Config.Mysql.Host)
	config.SetValue("mysql", "username", Config.Mysql.Username)
	config.SetValue("mysql", "password", Config.Mysql.Password)
	config.SetValue("mysql", "dbPort", fmt.Sprintf("%d", Config.Mysql.DbPort))
	config.SetValue("mysql", "database", Config.Mysql.Database)
	config.SetValue("mysql", "charset", Config.Mysql.Charset)
	config.SetValue("mysql", "tablePrefix", Config.Mysql.TablePrefix)
	config.SetValue("mysql", "maxIdleConns", fmt.Sprintf("%d", Config.Mysql.MaxIdleConns))
	config.SetValue("mysql", "maxOpenConns", fmt.Sprintf("%d", Config.Mysql.MaxOpenConns))
	config.SetValue("mysql", "maxLifetime", fmt.Sprintf("%d", int64(Config.Mysql.MaxLifetime.Seconds())))
	config.SetValue("mysql", "logLevel", fmt.Sprintf("%d", Config.Mysql.LogLevel))
	if Config.Mysql.PrintSql {
		config.SetValue("mysql", "printSql", "1")
	} else {
		config.SetValue("mysql", "printSql", "0")
	}

	token, err := GenerateRandomHex(16)
	if err != nil {
		// 回退：保持长度为 32 的固定字符串（仅在极端失败情况下使用）
		token = "s5ikwai6grmttvbdox88z5nc2ne5he2s"
	}

	if updateXuanxuanConfig {
		// 向数据库插入默认配置
		createDefaultConfig("key", token)
		createDefaultConfig("backendLang", "zh-cn")
		createDefaultConfig("server", fmt.Sprintf("http://127.0.0.1:%s", Config.AdminPort))
		createDefaultConfig("iceServers", "")
		createDefaultConfig("pollingInterval", "15")
		createDefaultConfig("ip", Config.Ip)
		createDefaultConfig("chatPort", Config.ChatPort)
		createDefaultConfig("commonPort", Config.CommonPort)
		createDefaultConfig("uploadFileSize", "32")
		createDefaultConfig("fileEncrypt", "off")
		createDefaultConfig("messageEncrypt", "off")
		createDefaultConfig("tokenLifetime", "30")
		createDefaultConfig("tokenAuthWindow", "20")
		createDefaultConfig("aes", "on")
		createDefaultConfig("https", https)
		createDefaultConfig("sslcrt", "")
		createDefaultConfig("sslkey", "")
		createDefaultConfig("mobileClient", "on")
		createDefaultConfig("debug", fmt.Sprintf("%d", Config.Debug))
		createDefaultConfig("logLevel", fmt.Sprintf("%d", Config.Mysql.LogLevel))

		config.SetValue("backend", "default", fmt.Sprintf("http://127.0.0.1:%s/x.php,%s", Config.AdminPort, token))
	}

	// 保存配置文件
	return goconfig.SaveConfigFile(config, configPath)
}

// saveConfig 保存配置到文件并更新数据库中的 xuanxuan 配置（安装场景使用）。
func (i *Installer) saveConfig() error {
	return saveConfigInternal(true)
}

// SaveConfig 保存当前 Config 到 xxd.conf。
// updateXuanxuanConfig 为 true 时同步更新数据库中的 xuanxuan 配置，否则仅更新配置文件。
func SaveConfig(updateXuanxuanConfig bool) error {
	return saveConfigInternal(updateXuanxuanConfig)
}

// RunInstallationIfNeeded 如果需要则运行安装或升级
func RunInstallationIfNeeded() error {
	return RunInstallationIfNeededWithQuiet(false)
}

// newInstaller 根据 quiet 参数创建对应的安装器
func newInstaller(quiet bool) *Installer {
	if quiet {
		return NewQuietInstaller()
	}
	return NewInstaller()
}

// hasQuietInstallParams 检查是否传入了任何静默安装配置参数
func hasQuietInstallParams() bool {
	return QuietInstallCommonPort != "" ||
		QuietInstallChatPort != "" ||
		QuietInstallAdminPort != "" ||
		QuietInstallStunPort != "" ||
		QuietInstallHttps != "" ||
		QuietInstallServerHost != "" ||
		QuietInstallDbPort != "" ||
		QuietInstallDbPassword != ""
}

// updateConfigWithQuietParams 根据传入的静默安装参数更新 xxd.conf 配置文件
func updateConfigWithQuietParams() error {
	configPath := GetRuningDir() + "/config/xxd.conf"

	// 读取现有配置文件
	config, err := goconfig.LoadConfigFile(configPath)
	if err != nil {
		return fmt.Errorf("load config file failed: %w", err)
	}

	// 只更新传入的非空参数
	if QuietInstallCommonPort != "" {
		config.SetValue("server", "commonPort", QuietInstallCommonPort)
	}
	if QuietInstallChatPort != "" {
		config.SetValue("server", "chatPort", QuietInstallChatPort)
	}
	if QuietInstallAdminPort != "" {
		config.SetValue("server", "adminPort", QuietInstallAdminPort)
	}
	if QuietInstallStunPort != "" {
		config.SetValue("server", "stunPort", QuietInstallStunPort)
	}
	if QuietInstallHttps != "" {
		config.SetValue("server", "https", QuietInstallHttps)
	}
	if QuietInstallServerHost != "" {
		config.SetValue("server", "serverHost", QuietInstallServerHost)
	}
	if QuietInstallDbPort != "" {
		config.SetValue("mysql", "dbPort", QuietInstallDbPort)
	}
	if QuietInstallDbPassword != "" {
		config.SetValue("mysql", "password", QuietInstallDbPassword)
	}

	// 保存配置文件
	if err := goconfig.SaveConfigFile(config, configPath); err != nil {
		return err
	}

	// 更新内存中的数据库配置，便于全量重写 my.php
	if QuietInstallDbPort != "" {
		if port, err := strconv.ParseUint(QuietInstallDbPort, 10, 16); err == nil {
			Config.Mysql.DbPort = int64(port)
		}
	}
	if QuietInstallDbPassword != "" {
		Config.Mysql.Password = QuietInstallDbPassword
	}

	// 通过 saveMyPHP 全量重写 my.php
	installer := &Installer{Quiet: true}
	if err := installer.saveMyPHP(); err != nil {
		return fmt.Errorf("save my.php failed: %w", err)
	}

	return nil
}

// autoCorrectServerHost 根据 https 配置自动修正 Config.ServerHost 的协议前缀。
// 若 https=on（IsHttps=="1"），确保 ServerHost 使用 https:// 协议；
// 若 https=off，确保使用 http:// 协议。协议不一致时自动修正并保存到 xxd.conf。
func autoCorrectServerHost() {
	serverHost := strings.TrimSpace(Config.ServerHost)
	if serverHost == "" {
		return
	}

	u, err := url.Parse(serverHost)
	if err != nil || u.Host == "" {
		return
	}

	expectedScheme := "http"
	if Config.IsHttps == "1" {
		expectedScheme = "https"
	}

	if u.Scheme == expectedScheme {
		return
	}

	u.Scheme = expectedScheme
	newHost := u.String()
	fmt.Printf("[Config] serverHost corrected: %s -> %s\n", serverHost, newHost)
	if Config.BackendUrl == Config.ServerHost {
		Config.BackendUrl = newHost
	}
	Config.ServerHost = newHost
	if err := SaveConfig(false); err != nil {
		fmt.Printf("Warning: failed to save config after correcting serverHost: %v\n", err)
	}
}

// syncConfigToDatabase 将 xxd.conf 中的关键配置同步更新到数据库 config 表，
// 确保每次启动时数据库中的 xuanxuan 配置与 xxd.conf 保持一致。
func syncConfigToDatabase() {
	if MysqlDB == nil {
		InitMysql()
	}
	if MysqlDB == nil {
		return
	}

	https := "off"
	if Config.IsHttps == "1" {
		https = "on"
	}

	pairs := []struct{ key, value string }{
		{"ip", Config.Ip},
		{"chatPort", Config.ChatPort},
		{"commonPort", Config.CommonPort},
		{"https", https},
	}

	for _, p := range pairs {
		if err := updateOrCreateConfig(p.key, p.value); err != nil {
			fmt.Printf("Warning: failed to sync config key %q to database: %v\n", p.key, err)
		}
	}
}

// RunInstallationIfNeededWithQuiet 安装升级流程总入口。
func RunInstallationIfNeededWithQuiet(quiet bool) error {
	if Config.Installed == 1 {
		autoCorrectServerHost()
		if quiet {
			if hasQuietInstallParams() {
				if err := updateConfigWithQuietParams(); err != nil {
					fmt.Printf("Warning: failed to update config with quiet install params: %v\n", err)
				}
			}
			syncConfigToDatabase()
			printUpgradeURLsIfPending()
			os.Exit(0)
		}
		printUpgradeURLsIfPending()
		syncConfigToDatabase()
		return nil
	}

	xxdConfExists, myPHPExists, err := checkConfigFiles()
	if err != nil {
		return fmt.Errorf("check config files failed: %w", err)
	}

	if !xxdConfExists && !myPHPExists {
		if quiet {
			return newInstaller(true).RunInstallation()
		}
		if WebInstallFn != nil {
			return WebInstallFn()
		}
		return newInstaller(false).RunInstallation()
	}

	if myPHPExists {
		if Config.Installed != 1 {
			Config.Installed = 1
		}
		if err := loadDatabaseConfigFromMyPHP(); err != nil {
			fmt.Println("Warning: failed to load database config from my.php:", err)
		} else {
			if err := SaveConfig(false); err != nil {
				fmt.Println("Warning: failed to save config after loading my.php:", err)
			}
		}
	}

	printUpgradeURLsIfPending()

	return nil
}

// getServerHostFromBackendSection 从内存中的 Config.RanzhiServer / Config.DefaultServer 推导 xxb 的访问地址。
// 返回形如 http(s)://host:port/xxb/ 的规范化地址，失败时返回空字符串。
func getServerHostFromBackendSection() string {
	// DefaultServer 与 RanzhiServer 在 InitConfig 阶段由 getRanzhi 填充。
	// 对于升级场景，如果能取到有效的 DefaultServer，就直接用它的地址部分。
	if strings.TrimSpace(Config.DefaultServer) == "" {
		return ""
	}
	rs, ok := Config.RanzhiServer[Config.DefaultServer]
	if !ok {
		return ""
	}
	backendURL := strings.TrimSpace(rs.RanzhiAddr)
	if backendURL == "" {
		return ""
	}

	u, err := url.Parse(backendURL)
	if err != nil || u.Host == "" {
		return ""
	}

	scheme := u.Scheme
	if scheme == "" {
		scheme = "http"
	}

	host := u.Host
	// 如果 Host 中没有端口，则补上 adminPort
	if _, _, err := net.SplitHostPort(host); err != nil {
		adminPort := Config.AdminPort
		if strings.TrimSpace(adminPort) == "" {
			adminPort = "9080"
		}
		host = net.JoinHostPort(u.Hostname(), adminPort)
	}

	serverHost := fmt.Sprintf("%s://%s/xxb/", scheme, host)
	return serverHost
}

// InitServerHostForUpgrade 在检测到需要升级时，根据版本规则初始化 Config.ServerHost。
//   - 10.0 及以上：使用配置文件中的 serverHost，若缺少 /xxb 后缀则补上。
//   - 9.6 及以下：通过 getServerHostFromBackendSection 重算，取不到则用 127.0.0.1:adminPort/xxb/。
func InitServerHostForUpgrade() {
	dbVersion, err := GetDatabaseVersion()
	if err != nil {
		return
	}
	db := strings.TrimSpace(strings.TrimPrefix(dbVersion, "v"))
	if !IsValidVersion(db) {
		return
	}

	adminPort := Config.AdminPort
	if strings.TrimSpace(adminPort) == "" {
		adminPort = "9080"
	}

	var serverHost string
	if VersionCompare(db, "10.0", ">=") {
		serverHost = strings.TrimSpace(Config.ServerHost)
		if serverHost != "" {
			base := strings.TrimRight(serverHost, "/")
			if !strings.HasSuffix(base, "/xxb") {
				serverHost = base + "/xxb/"
			}
		}
	} else {
		serverHost = getServerHostFromBackendSection()
		if serverHost == "" {
			serverHost = fmt.Sprintf("http://127.0.0.1:%s/xxb/", adminPort)
		}
	}

	if serverHost != "" {
		Config.ServerHost = serverHost
		Config.BackendUrl = serverHost
		_ = SaveConfig(false)
	}
}

// printUpgradeURLsIfPending 在检测到“需要升级”（程序版本高于数据库版本）时，
// 在 CLI 中打印访问 /xxb/upgrade.php 的引导信息。
func printUpgradeURLsIfPending() {
	// 初始化数据库连接（若尚未初始化）
	if MysqlDB == nil {
		InitMysql()
	}

	dbVersion, err := GetDatabaseVersion()
	if err != nil || strings.TrimSpace(dbVersion) == "" {
		return
	}

	db := strings.TrimSpace(strings.TrimPrefix(dbVersion, "v"))
	if !IsValidVersion(db) {
		return
	}
	current := strings.TrimPrefix(Version, "v")
	// 只有当程序版本高于数据库版本时，才认为需要升级
	if !VersionCompare(current, db, ">") {
		return
	}

	InitServerHostForUpgrade()

	fmt.Println("==========================================")
	fmt.Println("检测到需要升级，将进入喧喧（xxb）的数据库升级流程")
	fmt.Println("An upgrade is required; the xxb web-based upgrade wizard will be used.")
	fmt.Println("==========================================")
	fmt.Println()
	fmt.Println("请在浏览器中访问以下地址完成升级：")
	fmt.Println("Please open the following URL in your browser to complete the upgrade:")
	fmt.Println()

	serverHost := strings.TrimSpace(Config.ServerHost)
	if serverHost == "" {
		serverHost = fmt.Sprintf("http://127.0.0.1:%s/xxb/", Config.AdminPort)
	}
	base := strings.TrimRight(serverHost, "/")
	fmt.Printf("  %s/upgrade.php\n", base)
	fmt.Println()

	if QuietInstallFlag {
		os.Exit(0)
	}
}

// RunCheckUpgradeAndExit 用于 -check-upgrade：需要升级时与启动流程相同，直接调用 printUpgradeURLsIfPending。
// 退出码：0 未打印升级提醒；1 已打印（需要升级）；2 异常（如数据库连接 panic）。
func RunCheckUpgradeAndExit() {
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintf(os.Stderr, "check-upgrade: %v\n", r)
			os.Exit(2)
		}
	}()
	printUpgradeURLsIfPending()
	os.Exit(0)
}
