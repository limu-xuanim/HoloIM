package backend

import "net/http"

func InitAdmin() error {
	mux := http.NewServeMux()

	// 注册落地页路由
	RegisterIndexRoutes(mux)

	// 注册 /data 静态资源（如 site/www/data/image/xuanbot.png -> /data/image/xuanbot.png）
	RegisterDataRoutes(mux)

	// 注册网页客户端路由
	RegisterXuanRoutes(mux)

	// 注册 adminer 路由
	RegisterAdminerRoutes(mux)

	// 注册 xxb 路由
	RegisterAdminRoutes(mux)

	listener, err := initAdminListener()
	if err != nil {
		return err
	}

	// 重定向中间件统一处理：授权无效、未安装、待升级等状态下的路由重定向
	handler := RedirectMiddleware(mux)
	serveAdminAsync(listener, handler)
	logAdminHealthCheck()
	return nil
}
