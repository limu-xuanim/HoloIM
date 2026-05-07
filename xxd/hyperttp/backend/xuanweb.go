/**
 * The xuanweb file of backend current module of xxd.
 * Handles static file serving for /xuan path (React SPA).
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        http://www.xuanim.com
 */
package backend

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"xxd/util"
)

// RegisterXuanRoutes 注册 /xuan 路径的静态文件服务路由
func RegisterXuanRoutes(mux *http.ServeMux) {
	xuanDir := util.GetRuningDir() + "/xuan"
	xuanHandler := http.StripPrefix("/xuan", serveXuanStatic(xuanDir))

	mux.Handle("/xuan/", xuanHandler)
	mux.HandleFunc("/xuan", func(w http.ResponseWriter, r *http.Request) {
		// 重定向 /xuan 到 /xuan/
		if r.URL.Path == "/xuan" {
			http.Redirect(w, r, "/xuan/", http.StatusMovedPermanently)
			return
		}
		xuanHandler.ServeHTTP(w, r)
	})

	util.Log("info", "Xuan static files directory: %s", xuanDir)
}

// serveXuanStatic 提供 /xuan 路径的静态文件服务
// 支持 React SPA 路由：如果文件不存在，返回 index.html
// 使用 http.FileServer 处理静态文件，标准库会自动处理 MIME 类型（参考 php_handler.go 的实现）
func serveXuanStatic(rootDir string) http.Handler {
	// 使用标准库的 FileServer，它会自动处理 MIME 类型
	// 参考 php_handler.go 中第 157 行的实现方式
	fileServer := http.FileServer(http.Dir(rootDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 获取请求路径（已经通过 StripPrefix 去掉了 /xuan 前缀）
		path := r.URL.Path
		if path == "" || path == "/" {
			path = "/index.html"
		}

		// 构建完整文件路径
		fullPath := filepath.Join(rootDir, path)

		// 规范化路径，防止路径遍历攻击
		fullPath = filepath.Clean(fullPath)
		cleanRootDir := filepath.Clean(rootDir)
		if !strings.HasPrefix(fullPath, cleanRootDir) {
			http.NotFound(w, r)
			return
		}

		// 检查文件是否存在
		info, err := os.Stat(fullPath)
		if err == nil && !info.IsDir() {
			// 文件存在，使用标准库的 FileServer 提供文件（自动处理 MIME 类型）
			fileServer.ServeHTTP(w, r)
			return
		}

		// 文件不存在，对于 React SPA，返回 index.html
		// 但排除对静态资源（如 .js, .css, .png 等）的请求
		ext := filepath.Ext(path)
		if ext != "" && ext != ".html" {
			// 静态资源文件不存在，返回 404
			util.Log("warn", "Static file not found: %s (full path: %s)", path, fullPath)
			http.NotFound(w, r)
			return
		}

		// 对于 HTML 路由，返回 index.html（支持 React Router）
		indexPath := filepath.Join(rootDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			// 修改请求路径为 index.html，让 FileServer 处理（自动设置 MIME 类型）
			r.URL.Path = "/index.html"
			fileServer.ServeHTTP(w, r)
			return
		}

		// index.html 也不存在，返回 404
		util.Log("warn", "index.html not found in: %s", rootDir)
		http.NotFound(w, r)
	})
}
