/**
 * The health_check file of backend current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"net/http"
	"time"
	"xxd/util"
)

// IsFrankenPHPReady 检查 FrankenPHP 服务是否就绪
func IsFrankenPHPReady() bool {
	// 尝试连接到 FrankenPHP 的管理端口
	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	// 检查 FrankenPHP 是否响应健康检查
	healthURL := "http://localhost:" + util.Config.AdminPort + "/"
	resp, err := client.Get(healthURL)
	if err != nil {
		util.LogDetail(util.GetLang("[IsFrankenPHPReady]", " ", "FrankenPHP not ready yet", ": ") + err.Error())
		return false
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode >= 200 && resp.StatusCode < 500 {
		util.LogDetail(util.GetLang("[IsFrankenPHPReady]", " ", "FrankenPHP is ready", ", status: ") + util.Sprintf("%d", resp.StatusCode))
		return true
	}

	util.LogDetail(util.GetLang("[IsFrankenPHPReady]", " ", "FrankenPHP responded with status", ": ") + util.Sprintf("%d", resp.StatusCode))
	return false
}

// WaitForFrankenPHP 等待 FrankenPHP 服务就绪
func WaitForFrankenPHP(maxWaitTime time.Duration, checkInterval time.Duration) bool {
	util.Log("info", util.GetLang("[WaitForFrankenPHP]", " ", "Waiting for FrankenPHP to be ready", "..."))

	startTime := time.Now()
	for time.Since(startTime) < maxWaitTime {
		if IsFrankenPHPReady() {
			util.Log("info", util.GetLang("[WaitForFrankenPHP]", " ", "FrankenPHP is ready after", " %v"), time.Since(startTime))
			return true
		}

		// 等待一段时间再检查
		time.Sleep(checkInterval)
	}

	util.Log("error", util.GetLang("[WaitForFrankenPHP]", " ", "FrankenPHP did not become ready within", " %v"), maxWaitTime)
	return false
}
