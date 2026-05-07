package backend

import (
	"net/http"
	"strings"
	"xxd/util"
)

const adminPath = "/xxb"

// RegisterAdminRoutes 将 /xxb 前缀的访问转发给 {runDir}/site/www 目录下的 PHP 应用。
// 例如：/xxb/index.php 实际从 {runDir}/site/www/index.php 解析。
func RegisterAdminRoutes(mux *http.ServeMux) {
	h := NewPHPHandlerWithPrefix(util.GetRuningDir()+"/site/www", adminPath)

	mux.Handle(adminPath+"/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 去掉 /xxb 前缀，得到在 documentRoot 下的相对路径
		path := strings.TrimPrefix(r.URL.Path, adminPath)
		if path == "" {
			path = "/"
		}
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}

		orig := r.URL.Path
		r.URL.Path = path
		defer func() { r.URL.Path = orig }()

		// 用 prefixResponseWriter 拦截 PHP 返回的裸路径 Location 跳转，
		// 自动加上 /xxb 前缀，防止浏览器被重定向到前缀之外。
		h.HandleRequest(&prefixResponseWriter{ResponseWriter: w, prefix: adminPath}, r)
	}))
}

// prefixResponseWriter 包装 http.ResponseWriter，
// 拦截 PHP 写出的 Location 响应头：若值是以 "/" 开头的裸路径（不含前缀），
// 则自动在前面插入 prefix，保证浏览器的后续跳转仍落在 /xxb 路由范围内。
type prefixResponseWriter struct {
	http.ResponseWriter
	prefix      string
	wroteHeader bool
}

func (w *prefixResponseWriter) WriteHeader(code int) {
	if !w.wroteHeader {
		w.rewriteLocation()
		w.wroteHeader = true
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *prefixResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.rewriteLocation()
		w.wroteHeader = true
	}
	return w.ResponseWriter.Write(b)
}

// rewriteLocation 将裸绝对路径（/foo）改写为带前缀路径（/xxb/foo）。
// 以 http:// 或 https:// 开头的外部 URL 保持不变。
func (w *prefixResponseWriter) rewriteLocation() {
	loc := w.Header().Get("Location")
	if loc == "" {
		return
	}
	// 只处理以 "/" 开头但不以前缀开头的绝对路径
	if strings.HasPrefix(loc, "/") &&
		!strings.HasPrefix(loc, w.prefix+"/") &&
		loc != w.prefix {
		w.Header().Set("Location", w.prefix+loc)
	}
}
