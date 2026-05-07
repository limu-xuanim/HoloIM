/**
 * 将 /data 路径映射到 site/www/data 目录，用于提供静态资源（如图片）。
 * 例如：/data/image/xuanbot.png -> xxd/site/www/data/image/xuanbot.png
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 */
package backend

import (
	"net/http"
	"xxd/util"
)

// RegisterDataRoutes 注册 /data 路径的静态文件服务，映射到 {runDir}/site/www/data
func RegisterDataRoutes(mux *http.ServeMux) {
	dataDir := util.GetRuningDir() + "/site/www/data"
	dataHandler := http.StripPrefix("/data", http.FileServer(http.Dir(dataDir)))
	mux.Handle("/data/", dataHandler)
	mux.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/data" {
			http.Redirect(w, r, "/data/", http.StatusMovedPermanently)
			return
		}
		dataHandler.ServeHTTP(w, r)
	})
}
