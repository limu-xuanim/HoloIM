/**
 * 路由重定向逻辑：根据安装状态、授权状态、升级状态统一处理页面重定向。
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 */
package backend

import (
	"net/http"
	"strings"
	"xxd/util"
)

// 路径类型
const (
	PathTypeInstall = "install"
	PathTypeIndex   = "index"
	PathTypeAdmin   = "admin"
	PathTypeAdminer = "adminer"
	PathTypeOther   = ""
)

// 生效状态（按优先级从高到低）
const (
	StateNotInstalled = iota
	StatePendingUpgrade
	StateInstalled
)

const (
	InstallPath = "/install.php"
	IndexPath   = "/"
	AdminPath   = "/xxb"
	AdminerPath = "/adminer.php"
)

func getRedirectRules() map[int]map[string]string {
	rules := map[int]map[string]string{
		StateNotInstalled: {
		PathTypeIndex:   InstallPath,
		PathTypeAdmin:   InstallPath,
		PathTypeAdminer: InstallPath,
		},
		StatePendingUpgrade: {
		// 待升级状态下，不再通过 /upgrade.php 中转，直接访问 xxb 自身的 /xxb/upgrade.php。
		// 保持原有 Index/Install 路径行为：不进行额外重定向。
		},
		StateInstalled: {
		PathTypeInstall: IndexPath,
		},
	}
	mergeLicenseRedirectRules(rules)
	return rules
}

// GetEffectiveState 根据当前配置返回生效状态。
// 优先级：未安装 > 授权无效 > 待升级 > 已安装
func GetEffectiveState() int {
	if util.Config.Installed != 1 {
		return StateNotInstalled
	}
	if state, ok := licenseEffectiveState(); ok {
		return state
	}
	if isPendingUpgrade() {
		return StatePendingUpgrade
	}
	return StateInstalled
}

// isPendingUpgrade 检测是否需要升级（启动时比较 util.Version 与数据库版本）。
// 当程序版本高于数据库版本时返回 true，表示待升级。
func isPendingUpgrade() bool {
	dbVersion, err := util.GetDatabaseVersion()
	if err != nil || dbVersion == "" {
		return false
	}
	dbVersion = strings.TrimSpace(strings.TrimPrefix(dbVersion, "v"))
	if !util.IsValidVersion(dbVersion) {
		return false
	}
	currentVersion := strings.TrimPrefix(util.Version, "v")
	return util.VersionCompare(currentVersion, dbVersion, ">")
}

// ClassifyPath 将请求路径分类为路径类型。
// 仅对需要参与重定向判断的路径做显式分类，其余返回 PathTypeOther 表示不重定向。
func ClassifyPath(path string) string {
	if path == "" {
		path = "/"
	}
	switch {
	case path == "/install.php" || strings.HasPrefix(path, "/install.php?"):
		return PathTypeInstall
	case path == "/" || path == "/index.php" || strings.HasPrefix(path, "/index.php?"):
		return PathTypeIndex
	case path == "/xxb" || path == "/xxb/" || strings.HasPrefix(path, "/xxb/"):
		return PathTypeAdmin
	case path == "/adminer.php" || strings.HasPrefix(path, "/adminer.php?"):
		return PathTypeAdminer
	default:
		return classifyLicensePath(path)
	}
}

// ShouldRedirect 判断给定路径是否需要重定向，若需要则返回 (true, targetPath)。
// stateOverride 可选，若传入则使用该状态而非 GetEffectiveState()，用于 install 模式强制 StateNotInstalled。
func ShouldRedirect(path string, stateOverride ...int) (bool, string) {
	pathType := ClassifyPath(path)
	if pathType == PathTypeOther {
		return false, ""
	}

	var state int
	if len(stateOverride) > 0 {
		state = stateOverride[0]
	} else {
		state = GetEffectiveState()
	}

	rules, ok := getRedirectRules()[state]
	if !ok {
		return false, ""
	}
	target, ok := rules[pathType]
	if !ok || target == "" {
		return false, ""
	}
	return true, target
}

// DoRedirect 若需要重定向则执行并返回 true，否则返回 false。
func DoRedirect(w http.ResponseWriter, r *http.Request, path string, stateOverride ...int) bool {
	ok, target := ShouldRedirect(path, stateOverride...)
	if !ok {
		return false
	}
	http.Redirect(w, r, target, http.StatusFound)
	return true
}

// RedirectMiddleware 返回一个 http.Handler，在请求进入下游前统一执行重定向判断。
// 使用 GetEffectiveState() 获取当前生效状态。
func RedirectMiddleware(next http.Handler) http.Handler {
	return RedirectMiddlewareWithState(next, -1)
}

// RedirectMiddlewareWithState 与 RedirectMiddleware 类似，但使用指定的 state 而非 GetEffectiveState()。
// stateOverride 为 -1 时使用 GetEffectiveState()，用于 install 模式传入 StateNotInstalled。
func RedirectMiddlewareWithState(next http.Handler, stateOverride int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var override []int
		if stateOverride >= 0 {
			override = []int{stateOverride}
		}
		if DoRedirect(w, r, r.URL.Path, override...) {
			return
		}
		next.ServeHTTP(w, r)
	})
}
