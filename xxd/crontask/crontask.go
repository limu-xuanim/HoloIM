/**
 * The crontask file of crontask current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     crontask
 * @link        https://www.xuanim.com
 */
package crontask

import (
	"time"
	"xxd/service/im"
	"xxd/service/sys"
	"xxd/util"

	"github.com/robfig/cron/v3"
)

var c *cron.Cron

func startLastPollLoop() {
	sysService := sys.NewSysService()

	go func() {
		updateInterval := time.Duration(util.Config.PollingInterval) * time.Second
		updateTicker := time.NewTicker(updateInterval)

		defer func() {
			updateTicker.Stop()
		}()

		for len(util.Languages) == 0 {
			select {
			case <-updateTicker.C:
				sysService.UpdateLastPoll()
			}
		}
	}()
}

// AddCronFunc adds func to crontab.
func AddCronFunc(spec string, function func()) (cron.EntryID, error) {
	return c.AddFunc(spec, function)
}

// StartCron starts the crontab scheduler.
func StartCron() {
	c.Start()
}

// StopCron stops the crontab scheduler.
func StopCron() {
	c.Stop()
}

// runMaintenanceJob runs maintenance job on all xxb servers.
func runMaintenanceJob() {
	for serverName := range util.Config.RanzhiServer {
		util.Log("info", util.GetLang("[runMaintenanceJob]", " ", "running maintenance job on server", " %s"), serverName)
		imService := im.NewImService()
		err := imService.Maintenance()
		if err != nil {
			util.Errorf(util.GetLang("[runMaintenanceJob]", " ", "error occurred on server", " %s: %s"), serverName, err)
		}
		util.Log("info", util.GetLang("[runMaintenanceJob]", " ", "finished maintenance job on server", " %s"), serverName)
	}
}
