package main

import (
	"xxd/crontask"
	"xxd/hyperttp/server"
	"xxd/wsocket"
)

func startBackgroundServices() {
	crontask.CronTask()
	go server.InitHttp()
	go wsocket.InitWs()
}
