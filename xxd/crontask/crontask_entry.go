package crontask

import (
	"xxd/util"

	"github.com/robfig/cron/v3"
)

// 定时任务
func CronTask() {
	c = cron.New()
	c.AddFunc("* * * * *", util.CheckLog)
	c.AddFunc("0 0 * * *", runMaintenanceJob)
	c.Start()

	startLastPollLoop()
}
