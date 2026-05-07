/**
 * The install_handler file of backend current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
	"xxd/util"
)

// installDone 由 handleInstallRun 在安装成功完成后写入 nil，
// RunWebInstaller 收到信号后关闭安装 HTTP Server 并返回。
var installDone = make(chan error, 1)

// installSuccessOnce 确保只向 installDone 发送一次信号
var installSuccessOnce sync.Once

// RunWebInstaller 启动安装模式 HTTP 服务，阻塞直到用户完成安装后返回。
// 应当在检测到无配置文件（全新安装场景）时由 main goroutine 调用。
func RunWebInstaller() error {
	if util.IsAlreadyInstalled() {
		return nil
	}
	if err := util.ReplaceSessionPathInPhpIni(); err != nil {
		util.Log("warn", "[install] replace php.ini placeholders: %v (php.ini may not exist)", err)
	}
	InitFrankenPHP()

	mux := http.NewServeMux()
	RegisterInstallAPIRoutes(mux)
	RegisterInstallPageRoutes(mux)

	listener, err := net.Listen("tcp", ":9080")
	if err != nil {
		util.Log("warn", "[install] 端口 9080 已被占用，由系统自动分配可用端口")
		listener, err = net.Listen("tcp", ":0")
		if err != nil {
			return fmt.Errorf("安装服务器监听失败: %w", err)
		}
	}
	installPort := strconv.Itoa(listener.Addr().(*net.TCPAddr).Port)

	srv := &http.Server{
		Addr:    ":" + installPort,
		Handler: RedirectMiddlewareWithState(mux, StateNotInstalled),
	}

	go func() {
		if err := srv.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			util.Log("error", "[install] server error: %v", err)
		}
	}()

	printInstallURLs(installPort)

	// 阻塞等待安装完成信号
	installErr := <-installDone

	// 优雅关闭安装 HTTP Server，释放端口供正式服务使用
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)

	return installErr
}

// printInstallURLs 打印安装页面的访问地址
func printInstallURLs(port string) {
	ips := util.GetLocalIPs()
	util.Println("==========================================")
	util.Println("喧喧消息转发服务器 Web 安装向导已启动")
	util.Println("Xuan Daemon Web Installer is running")
	util.Println("==========================================")
	util.Println("")
	util.Println("请在浏览器中访问以下地址完成安装：")
	util.Println("Please open one of the following URLs in your browser:")
	util.Println("")
	if len(ips) == 0 {
		util.Printf("  http://127.0.0.1:%s/install.php\n", port)
	}
	for _, ip := range ips {
		util.Printf("  http://%s:%s/install.php\n", ip, port)
	}
	util.Println("")
}

// RegisterInstallPageRoutes 注册安装页面路由，将 pages/ 目录下的 PHP 文件
// 通过 FrankenPHP 提供给浏览器，根路径默认重定向到 /install.php。
func RegisterInstallPageRoutes(mux *http.ServeMux) {
	runDir := util.GetRuningDir()
	h := NewPHPHandler(filepath.Join(runDir, "pages"))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		h.HandleRequest(w, r)
	})
}

// RegisterInstallAPIRoutes 注册 /api/install/* 下的安装 API 路由
func RegisterInstallAPIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/install/sysinfo", handleInstallSysInfo)
	mux.HandleFunc("/api/install/checkdb", handleInstallCheckDB)
	mux.HandleFunc("/api/install/run", handleInstallRun)
}

// ── sysinfo ──────────────────────────────────────────────────────────────────

type installSysInfoResponse struct {
	LocalIPs     []string          `json:"localIPs"`
	DefaultPorts map[string]string `json:"defaultPorts"`
	Version      string            `json:"version"`
}

func handleInstallSysInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	resp := installSysInfoResponse{
		LocalIPs: util.GetLocalIPs(),
		DefaultPorts: map[string]string{
			"common": "11443",
			"chat":   "11444",
			"admin":  "9080",
			"stun":   "3478",
		},
		Version: util.Version,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// ── checkdb ───────────────────────────────────────────────────────────────────

type installCheckDBRequest struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
}

func handleInstallCheckDB(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req installCheckDBRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	port, _ := strconv.ParseInt(req.Port, 10, 64)
	if port <= 0 {
		port = 3306
	}

	host := req.Host
	if host == "" {
		host = "127.0.0.1"
	}

	err := util.TestMysqlConnection(host, port, req.User, req.Password)

	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
}

// ── run (SSE) ─────────────────────────────────────────────────────────────────

type installRunRequest struct {
	DB struct {
		Host     string `json:"host"`
		Port     string `json:"port"`
		User     string `json:"user"`
		Password string `json:"password"`
		Database string `json:"database"`
	} `json:"db"`
	Server struct {
		CommonPort string `json:"commonPort"`
		ChatPort   string `json:"chatPort"`
		AdminPort  string `json:"adminPort"`
		StunPort   string `json:"stunPort"`
		Https      string `json:"https"`
		ServerHost string `json:"serverHost"`
	} `json:"server"`
	Options struct {
		ImportDemo    bool   `json:"importDemo"`
		AdminUser     string `json:"adminUser"`
		AdminPassword string `json:"adminPassword"`
	} `json:"options"`
}

func handleInstallRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req installRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// SSE 头部
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	doSend := func(eventType, msg string) {
		data, _ := json.Marshal(map[string]string{
			"type": eventType,
			"msg":  msg,
		})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	// 安装日志写入运行目录下的 install.[date].log
	var sendEvent func(eventType, msg string)
	runDir := util.GetRuningDir()
	logName := fmt.Sprintf("install_%s.log", time.Now().Format(time.DateOnly))
	logPath := filepath.Join(runDir, logName)
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		util.Log("warn", "[install] open log file %s: %v", logPath, err)
		sendEvent = doSend
	} else {
		defer logFile.Close()
		ts := time.Now().Format(time.DateTime)
		fmt.Fprintf(logFile, "\n[%s] [start] === Web 安装开始 ===\n", ts)
		sendEvent = func(eventType, msg string) {
			doSend(eventType, msg)
			ts := time.Now().Format(time.DateTime)
			if _, e := fmt.Fprintf(logFile, "[%s] [%s] %s\n", ts, eventType, msg); e != nil {
				util.Log("warn", "[install] write log: %v", e)
			}
		}
	}

	params := util.InstallParams{
		DbHost:        req.DB.Host,
		DbPort:        req.DB.Port,
		DbUser:        req.DB.User,
		DbPassword:    req.DB.Password,
		DbName:        req.DB.Database,
		CommonPort:    req.Server.CommonPort,
		ChatPort:      req.Server.ChatPort,
		AdminPort:     req.Server.AdminPort,
		StunPort:      req.Server.StunPort,
		Https:         req.Server.Https,
		ServerHost:    req.Server.ServerHost,
		ImportDemo:    req.Options.ImportDemo,
		AdminUser:     req.Options.AdminUser,
		AdminPassword: req.Options.AdminPassword,
	}

	installer := util.NewInstaller()
	err = installer.RunWithParams(params, func(msg string) {
		sendEvent("log", msg)
	})

	if err != nil {
		util.Log("error", "[install] installation failed: %v", err)
		sendEvent("error", err.Error())
		// 不关闭服务器，允许用户排错后重试
		return
	}

	sendEvent("done", "安装成功！服务正在启动，请稍候...")

	// 通知 RunWebInstaller 安装已完成，可以关闭安装服务器
	installSuccessOnce.Do(func() {
		installDone <- nil
	})
}
