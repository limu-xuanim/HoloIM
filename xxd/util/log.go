/**
 * The log file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/davecgh/go-spew/spew"
)

const saveLogTime int64 = 60 * 60 * 24 * 7

var (
	mu        sync.RWMutex
	fd        *os.File
	logHandle *log.Logger

	dedupBuffer      []string      // Deduplication buffer
	dedupBufferLines int      = 15 // Deduplication buffer size (lines)
)

func InitLog() {
	if err := newLog(); err != nil {
		Exit(fmt.Sprintf(GetLang("create log error", " %s\n"), err))
	}
}

func newLog() error {
	dir := GetAbsPath(Config.LogPath)
	mu.Lock()
	defer mu.Unlock()

	if err := Mkdir(dir); err != nil {
		fmt.Printf(GetLang("mkdir error", " %s\n"), err)
		return err
	}

	if fd != nil {
		fd.Close()
	}

	fileName := fmt.Sprintf("%s_%s.log", dir+"/"+GetProgramName(), GetYmd())
	fd, err := os.OpenFile(fileName, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if err != nil {
		fmt.Printf(GetLang("create file error", " %s\n"), err)
		return err
	}

	logHandle = log.New(fd, "", log.Ldate|log.Ltime)

	return nil
}

func LogInfo() *log.Logger {
	logHandle.SetPrefix("[I] ")
	return logHandle
}

func LogWarning() *log.Logger {
	logHandle.SetPrefix("[W] ")
	return logHandle
}

func LogError() *log.Logger {
	logHandle.SetPrefix("[E] ")
	return logHandle
}

// 字符串被包装成了 error 类型
func Errorf(format string, v ...any) error {
	Log("error", format, v...)
	return fmt.Errorf(format, v...)
}

func Println(v ...any) {
	if !Interactive() {
		return
	}
	fmt.Println(v...)
}

func Printf(format string, v ...any) {
	if !Interactive() {
		return
	}
	fmt.Printf(format, v...)
}

func Sprintf(format string, v ...any) string {
	return fmt.Sprintf(format, v...)
}

// 给定时任务调用的函数，管理日常记录的日志
func CheckLog() {
	logPath := GetAbsPath(Config.LogPath)
	fileName := fmt.Sprintf("%s_%s.log", logPath+GetProgramName(), GetYmd())
	if !Exists(fileName) {
		if err := newLog(); err != nil {
			fmt.Printf(GetLang("create log error", " %s\n"), err)
		}
	}

	if err := filepath.Walk(logPath, walkFunc); err != nil {
		Log("error", GetLang("filePath", " %s ", "walk error", ": %s"), logPath, err)
	}
}

func walkFunc(path string, info os.FileInfo, err error) error {
	if err != nil {
		return err
	}

	if info.IsDir() || !StringHasPrefix(info.Name(), fmt.Sprintf("%s_", GetProgramName())) || !StringHasSuffix(info.Name(), ".log") {
		return nil
	}

	if GetUnixTime()-info.ModTime().Unix() > saveLogTime {
		err := Rm(path)
		if err != nil {
			Log("error", GetLang("remove file", " [%s] ", "error", ": %s"), info.Name(), err)
			return err
		}
	}

	return nil
}

func Log(level string, format string, v ...any) {
	format = format + "\n"
	if Config.Debug > 0 {
		Printf(fmt.Sprintf("%s [I] %s", time.Now().Format(time.DateTime), format), v...)
	}

	if logHandle != nil {
		if Config.Debug != 0 || logUnique(fmt.Sprintf(format, v...)) {
			switch level {
			case "info":
				LogInfo().Printf(format, v...)
			case "warning":
				LogWarning().Printf(format, v...)
			default:
				LogError().Printf(format, v...)
			}
		}
	} else {
		Printf(format, v...)
	}
}

func LogDetail(detail string, color ...string) {
	if Config.Debug == 2 {
		// 如果提供了颜色参数，为终端输出添加颜色
		displayDetail := detail
		if len(color) > 0 && color[0] != "" {
			displayDetail = Colorize(detail, color[0])
		}

		Printf("%s [I] %s", time.Now().Format(time.DateTime), displayDetail+"\n")

		// 文件输出始终保持无颜色格式
		LogInfo().Println(detail)
	}
}

// logUnique logs an unique entry only once in a `dedupBufferLines` times.
func logUnique(entry string) bool {
	if len(dedupBuffer) >= dedupBufferLines {
		dedupBuffer = dedupBuffer[1:]
	}
	for _, e := range dedupBuffer {
		if e == entry {
			return false
		}
	}
	dedupBuffer = append(dedupBuffer, entry)
	return true
}

// VarDump is like var_dump in php.
func VarDump(a ...any) {
	spew.Dump(a...)
}

// WhereDump is VarDump, but with file and line.
func WhereDump(a ...any) {
	_, file, line, _ := runtime.Caller(1)
	fmt.Printf("file: %s, line: %d\n", file, line)
	VarDump(a...)
}
