/**
 * The hyperttp file of hyperttp current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     hyperttp
 * @link        https://www.xuanim.com
 */
package hyperttp

import (
	"bytes"
	"crypto/tls"
	"io"
	"net"
	"net/http"
	"time"
	"xxd/hyperttp/backend"
	"xxd/util"

	"github.com/sethgrid/pester"
)

const https = "https:"

var httpClient *pester.Client
var httpsClient *pester.Client

type RequestOptions struct {
	ClientIP string
	Timeout  time.Duration
	Referer  string
}

func InitHyperttp() {
	if httpClient != nil && httpsClient != nil {
		return
	}
	httpClient = httpRequest()
	httpsClient = httpsRequest()
}

// http 请求
func RequestInfo(addr string, postData []byte, options *RequestOptions) ([]byte, int, error) {
	InitHyperttp()
	util.LogDetail(util.GetLang("[RequestInfo]", " ", "addr", ": ") + addr)
	if util.Config.EnableAES == 0 {
		util.LogDetail(util.GetLang("[RequestInfo]", " ", "post data", ": ")+string(postData), util.ColorLightRed)
	}

	if postData == nil || addr == "" {
		return nil, 0, util.Errorf("%s", util.GetLang("post data or addr is null"))
	}

	// 检查是否为本地服务器，如果是则使用本地调用
	if backend.IsLocalServer(addr) {
		localOptions := &backend.LocalRequestOptions{}
		if options != nil {
			localOptions.ClientIP = options.ClientIP
			localOptions.Referer = options.Referer
			localOptions.Timeout = int(options.Timeout.Seconds())
		}

		// 获取服务器 token
		var ranzhiToken []byte
		if util.Config.EnableAES == 1 {
			// 从配置中获取对应的服务器 token
			for serverName, serverInfo := range util.Config.RanzhiServer {
				if serverInfo.RanzhiAddr == addr {
					ranzhiToken = serverInfo.RanzhiToken
					util.LogDetail(util.GetLang("[RequestInfo]", " ", "using local call for server", ": ") + serverName)
					break
				}
			}
		}

		return backend.LocalRequestInfo(postData, localOptions, ranzhiToken)
	}

	// 如果是远程服务器，继续使用原来的 HTTP 调用
	var client *pester.Client
	if addr[:6] != https {
		client = httpClient
	} else {
		client = httpsClient
	}

	var resp *http.Response

	req, err := http.NewRequest("POST", addr, bytes.NewReader(postData))
	if err != nil {
		util.Log("error", util.GetLang("HTTP new request error", ", ", "addr", " [%s] ", "error", ":%v"), addr, err)
	}

	req.Header.Set("Content-type", "text/plain")
	req.Header.Set("User-Agent", "easysoft/xuan.im")
	req.Header.Set("xxd-version", util.Version)

	if options != nil {
		if options.ClientIP != "" {
			clientIP, _, err := net.SplitHostPort(options.ClientIP)
			if err != nil {
				clientIP = ""
			}
			req.Header.Set("X-Forwarded-For", clientIP)
		}
		if options.Timeout != 0 {
			client.Timeout = options.Timeout
		}
		if options.Referer != "" {
			req.Header.Set("Referer", options.Referer)
		}
	}

	resp, err = client.Do(req)
	if err != nil {
		util.Log("error", util.GetLang("Do http request error", ":"), err)
		return nil, 0, err
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		util.Log("error", util.GetLang("Request body error", ":"), err)
		return nil, 0, err
	}
	status := resp.StatusCode

	if bytes.HasPrefix(body, []byte("<")) {
		resBytes, errText := util.BeheadErrorResponse(body)
		if errText != "" {
			util.Log("error", util.GetLang("Request body error (handled)", ":"), errText)
		}
		body = resBytes
	}

	return body, status, nil
}

// http
func httpRequest() *pester.Client {
	client := pester.New()
	client.Timeout = 60 * time.Second
	client.Backoff = pester.LinearBackoff
	client.MaxRetries = 5
	client.Transport = &http.Transport{
		DisableCompression: util.Config.EnableCompression == 0,
	}
	return client
}

// https
func httpsRequest() *pester.Client {
	client := pester.New()
	client.Timeout = 60 * time.Second
	client.Backoff = pester.LinearBackoff
	client.MaxRetries = 5
	client.Transport = &http.Transport{
		TLSClientConfig:    &tls.Config{InsecureSkipVerify: true},
		DisableCompression: util.Config.EnableCompression == 0,
	}
	return client
}
