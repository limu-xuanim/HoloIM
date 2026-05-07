package sys

import (
	"errors"
	"xxd/util"
)

func (sys *SysService) StartXXD() error {
	// 检查后端服务器配置
	if len(util.Config.RanzhiServer) == 0 {
		return errors.New(util.GetLang("[StartXXD]", " E_NO_SERVER: ", "No backend server configured", ", ", "please edit the configuration file", ".\n", "Visit https://www.xuanim.com/book/xuanxuanserver/238.html#E_NO_SERVER for troubleshooting hints"))
	}

	// Stop trying on failure if not running as a service.
	oneShot := util.Interactive()

	connected := false
	for !connected {
		var err error
		for serverName, serverInfo := range util.Config.RanzhiServer {
			// 如果是本地服务器，等待 FrankenPHP 服务就绪
			// if backend.IsLocalServer(serverInfo.RanzhiAddr) {
			// 	// 等待 FrankenPHP 服务就绪，最多等待30秒，每2秒检查一次
			// 	if !backend.WaitForFrankenPHP(30*time.Second, 2*time.Second) {
			// 		util.Log("error", util.GetLang("[StartXXD]", " ", "FrankenPHP service did not become ready in time for server", " [%s]"), serverName)
			// 		break
			// 	}
			// }

			// 调用本地 SysServerStart 替代 HTTP 请求
			sys.SysServerStart()

			util.Log("info", util.GetLang("Backend server name: %s"), serverName)

			// 处理响应数据，类似原始 StartXXD 中的逻辑
			// util.Log("info", util.GetLang("Backend server version: %s"), output.Version)
			// if output.FileKey != nil {
			// 	if util.ServersideConfig == nil {
			// 		util.ServersideConfig = make(map[string]map[string]any)
			// 	}
			// 	util.ServersideConfig[serverName] = map[string]any{}
			// 	util.ServersideConfig[serverName]["fileKey"] = []byte(*output.FileKey)
			// 	util.Log("info", util.GetLang("[StartXXD]", " ", "FileKey set for server", " [%s]"), serverName)
			// }

			connected = true

			util.Log(util.GetLang("Backend server address: %s"), serverInfo.RanzhiAddr)
			util.Log(util.GetLang("Backend server token: %s"), string(serverInfo.RanzhiToken))
		}
		if oneShot {
			return err
		}
	}

	return nil
}
