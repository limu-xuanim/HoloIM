package util

import (
	"os"
	"log"
	"io"
	"time"
	"fmt"
	"runtime"
)

var logHandle *log.Logger

func init() {
	dir, _ := os.Getwd()
	if runtime.GOOS != "windows" {
		dir = "/tmp"
	}
	logFile, err := os.OpenFile(dir + "/updater_" + time.Now().Format("20060102") + ".log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, os.ModePerm)
	if err != nil {
		log.Fatalln("打开日志文件失败：", err)
	}
	logHandle = log.New(io.MultiWriter(os.Stderr, logFile), "", log.Ldate|log.Ltime|log.Lshortfile)
}

func Log() *log.Logger {
	return logHandle
}

func Println(v ...interface{}) {
	fmt.Println(v...)
}