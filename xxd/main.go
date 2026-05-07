/**
 * The main file of main current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     main
 * @link        https://www.xuanim.com
 */
package main

import (
	"xxd/hyperttp/backend"
	"xxd/util"

	_ "time/tzdata" // 嵌入时区数据库，确保在所有 Windows 版本上都能正确识别 Asia/Shanghai 等时区
)

func main() {
	util.Init()
	if util.CheckUpgradeFlag {
		util.RunCheckUpgradeAndExit()
	}
	util.WebInstallFn = backend.RunWebInstaller

	if runAdminerPasswdMode() {
		return
	}

	runService()
}
