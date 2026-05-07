/**
 * The httpserver file of hyperttp current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     server
 * @link        https://www.xuanim.com
 */
package server

import (
	"net"
	"net/http"
	"net/url"
	"strings"
	"xxd/model"
	"xxd/service/im"
	"xxd/util"
)

var (
	serveMux  *http.ServeMux
	imService *im.ImService
)

func InitServer() {
	// Sync ServeMux creation
	util.WaitGroupCreate(util.CommonServeMuxWaitGroupID)
	util.WaitGroupAdd(util.CommonServeMuxWaitGroupID, 1)
	model.InitConfigCache(util.MysqlDB)
	if err := model.InitMessageIndexCache(util.MysqlDB); err != nil {
		util.Log("error", util.GetLang("[InitServer]", " ", "Failed to initialize message index cache: %v"), err)
	}
}

// getServerAddresses 从 ServerHost 解析并构建服务器地址
// ServerHost 格式: http(s)://[ip]:[port]
// 返回聊天服务器地址和后台管理地址
func getServerAddresses() (string, string) {
	serverHost := util.Config.ServerHost
	if serverHost == "" {
		return "", ""
	}

	// 移除末尾的斜杠
	serverHost = strings.TrimSuffix(serverHost, "/")

	// 解析 URL
	parsedURL, err := url.Parse(serverHost)
	if err != nil {
		return "", ""
	}

	scheme := parsedURL.Scheme
	if scheme == "" {
		// 如果没有 scheme，根据 IsHttps 配置推断
		if util.Config.IsHttps == "1" || util.Config.IsHttps == "on" {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}

	host := parsedURL.Host
	if host == "" {
		// 如果没有 Host，尝试从 Path 获取
		host = parsedURL.Path
	}

	// 分离主机名和端口
	hostname, _, err := net.SplitHostPort(host)
	if err != nil {
		// 如果没有端口，host 就是 hostname
		hostname = host
	}

	if hostname == "" {
		return "", ""
	}

	// 构建聊天服务器地址（使用 CommonPort）
	chatServerURL := scheme + "://" + net.JoinHostPort(hostname, util.Config.CommonPort)

	// 构建后台管理地址（使用 AdminPort）
	adminServerURL := scheme + "://" + net.JoinHostPort(hostname, util.Config.AdminPort)

	return chatServerURL, adminServerURL
}
