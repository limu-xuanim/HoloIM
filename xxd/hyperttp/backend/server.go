/**
 * The server file of backend current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"crypto/tls"
	"errors"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"xxd/util"
)

func serveAdminAsync(listener net.Listener, handler http.Handler) {
	go serveAdmin(listener, handler)
}

func serveAdmin(listener net.Listener, handler http.Handler) {
	if util.Config.IsHttps != "1" {
		if err := http.Serve(listener, handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
			util.Log("error", err.Error())
		}
		return
	}

	crt, key, err := util.CreateSignedCertKey()
	if err != nil {
		util.Log("error", util.GetLang("[InitAdmin]", " HTTPS SSL ", "config err", ": %s"), err)
		return
	}

	cert, err := tls.LoadX509KeyPair(crt, key)
	if err != nil {
		util.Log("error", util.GetLang("[InitAdmin]", " HTTPS SSL ", "config err", ": %s"), err)
		return
	}

	cfg := util.SecureServerTLSConfig()
	cfg.Certificates = []tls.Certificate{cert}
	if err := http.Serve(tls.NewListener(listener, cfg), handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
		util.Log("error", util.GetLang("[InitAdmin]", " HTTPS ", "server listen error", ": %s"), err)
	}
}

func initAdminListener() (net.Listener, error) {
	addr := ":" + util.Config.AdminPort
	return net.Listen("tcp", addr)
}

// RegisterIndexRoutes 注册根路径落地页路由。
func RegisterIndexRoutes(mux *http.ServeMux) {
	runDir := util.GetRuningDir()
	h := NewPHPHandler(runDir + "/pages")

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		indexPath := filepath.Join(runDir, "pages", "index.php")
		if _, err := os.Stat(indexPath); err != nil {
			http.Error(w, "index.php not found", http.StatusInternalServerError)
			return
		}

		cloned := r.Clone(r.Context())
		if r.URL.Path == "/" {
			cloned.URL.Path = "/index.php"
		}
		h.HandleRequest(w, cloned)
	})
}

func logAdminHealthCheck() {
	go func() {
		time.Sleep(500 * time.Millisecond)

		// 使用配置中的 ServerHost 进行健康检查，保证与实际访问入口一致
		testURL := util.Config.ServerHost + "xxb/"
		client := &http.Client{
			Timeout: 5 * time.Second,
		}
		// 如果是 HTTPS，自签证书可能没有 IP SAN，这里仅用于本地健康检查，允许跳过证书校验
		if strings.HasPrefix(strings.ToLower(testURL), "https://") {
			client.Transport = &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // 只用于内部健康检查
				},
			}
		}

		resp, err := client.Get(testURL)
		if err != nil {
			util.Log("warn", "[InitAdmin] Admin health check failed: %v", err)
			return
		}
		resp.Body.Close()

		util.Log("info", "[InitAdmin] Admin health check success, status: %d", resp.StatusCode)
	}()
}
