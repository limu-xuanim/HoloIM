/**
 * The sysrun file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"bufio"
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
)

const DevVersion = "XXDBuildVersion"
const Version = "XXDBuildVersion"
const Build = "XXDBuildInfo"
const MinClientVersion = "10.0"

var Run bool = true
var Token []byte
var DBConn *sql.DB
var Languages map[string]string
var Plats = []string{"desktop", "mobile", "zentaoweb"}

func InitSysRun() {
	InitLog()
	dir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
	DBConn = InitDB()

	// xxd 启动时根据时间生成token
	timeStr := Int642String(GetUnixTime())
	Token = []byte(GetMD5(timeStr))
	Languages = make(map[string]string)

	// Skip printing xxd information if controlling service.
	if len(ServiceFlag) > 0 {
		return
	}

	Log("info", GetLang("XXD %s %s ", "is running"), Version, Build)
	Log("info", GetLang("XXD ", "runs the directory", " %s"), dir)
	Log("info", GetLang("ProgramName", ": %s, ", "System", ": %s-%s"), GetProgramName(), runtime.GOOS, runtime.GOARCH)
	Log("info", "---------------------------------------- ")

	LogDetail(GetLang("[Config]", " ", "IP", ": ") + Config.Ip)
	LogDetail(GetLang("[Config]", " ", "ChatPort", ": ") + Config.ChatPort)
	LogDetail(GetLang("[Config]", " ", "CommonPort", ": ") + Config.CommonPort)
	LogDetail(GetLang("[Config]", " ", "IsHttps", ": ") + Config.IsHttps)
	LogDetail(GetLang("[Config]", " ", "Debug", ": ") + Int642String(Config.Debug))
	LogDetail(GetLang("[Config]", " ", "UploadPath", ": ") + Config.UploadPath)
	LogDetail(GetLang("[Config]", " ", "LogPath", ": ") + Config.LogPath)
	LogDetail(GetLang("[Config]", " ", "CrtPath", ": ") + Config.CrtPath)
	LogDetail(GetLang("[Config]", " ", "MaxOnlineUser", ": ") + Int642String(Config.MaxOnlineUser))
	LogDetail(GetLang("[Config]", " ", "Polling Interval", ": ") + Int642String(Config.PollingInterval) + " seconds")
	LogDetail(GetLang("[Config]", " ", "AES Enabled", ": ") + Int642String(Config.EnableAES))
	LogDetail(GetLang("[Config]", " ", "Client AES Enabled", ": ") + Int642String(Config.EnableClientAES))
	LogDetail(GetLang("[Config]", " ", "Compression Enabled", ": ") + Int642String(Config.EnableCompression))
	LogDetail(GetLang("[Config]", " ", "Thumbnail Enabled", ": ") + Int642String(Config.Thumbnail))
	LogDetail(GetLang("[Config]", " ", "Session save path", ": ") + Config.SessionSavePath)
	LogDetail(GetLang("[Config]", " ", "Lang", ": ") + Config.Lang)

	LogDetail(GetLang("[Config]", " ", "Mysql Host", ": ") + Config.Mysql.Host)
	LogDetail(GetLang("[Config]", " ", "Mysql Username", ": ") + Config.Mysql.Username)
	LogDetail(GetLang("[Config]", " ", "Mysql Password", ": ") + Config.Mysql.Password)
	LogDetail(GetLang("[Config]", " ", "Mysql DbPort", ": ") + Int642String(Config.Mysql.DbPort))
	LogDetail(GetLang("[Config]", " ", "Mysql Database", ": ") + Config.Mysql.Database)
	LogDetail(GetLang("[Config]", " ", "Mysql Charset", ": ") + Config.Mysql.Charset)
	LogDetail(GetLang("[Config]", " ", "Mysql TablePrefix", ": ") + Config.Mysql.TablePrefix)
	LogDetail(GetLang("[Config]", " ", "Mysql SysPrefix", ": ") + Config.Mysql.SysPrefix)
	LogDetail(GetLang("[Config]", " ", "Mysql MaxIdleConns", ": ") + Int642String(Config.Mysql.MaxIdleConns))
	LogDetail(GetLang("[Config]", " ", "Mysql MaxOpenConns", ": ") + Int642String(Config.Mysql.MaxOpenConns))
	LogDetail(GetLang("[Config]", " ", "Mysql MaxLifetime", ": ") + Int642String(int64(Config.Mysql.MaxLifetime.Seconds())))

	if fileServer := Config.GetFileServer(); fileServer != "" {
		LogDetail(GetLang("[Config]", " ", "Using FileServer", ": ") + fileServer)
	}

	LogDetail("")

	// 设置 cpu 使用
	runtime.GOMAXPROCS(runtime.NumCPU())
}

func GetNumGoroutine() int {
	return runtime.NumGoroutine()
}

// Exit 退出程序，支持可选的退出码参数
// 如果提供了退出码（int类型），则使用该退出码；否则默认使用 1（错误退出）
// 示例：Exit("错误信息") 或 Exit("成功信息", 0)
func Exit(v ...any) {
	var exitCode int = 1
	var messages []any

	// 检查最后一个参数是否是退出码（int类型）
	if len(v) > 0 {
		if code, ok := v[len(v)-1].(int); ok {
			exitCode = code
			messages = v[:len(v)-1]
		} else {
			messages = v
		}
	}

	if len(messages) > 0 {
		Println(messages...)
	}

	if !Interactive() {
		if DBConn != nil {
			DBConn.Close()
		}
		os.Exit(exitCode)
	}

	if exitCode == 1 {
		os.Exit(1)
	}

	Println(GetLang("Press Ctrl+C to exit this program"))
	for {
		consoleReader := bufio.NewReaderSize(os.Stdin, 1)
		input, _ := consoleReader.ReadByte()
		ascii := input

		// ESC = 27 and Ctrl-C = 3
		if ascii == 27 || ascii == 3 {
			if DBConn != nil {
				DBConn.Close()
			}
			os.Exit(0)
		}
	}
}
