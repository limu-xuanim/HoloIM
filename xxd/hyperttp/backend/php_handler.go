/**
 * The php_handler file of backend current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"context"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"xxd/util"

	"github.com/dunglas/frankenphp"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// PHPHandler PHP 请求处理器，每个实例对应一个独立的 documentRoot
type PHPHandler struct {
	documentRoot string
	// pathPrefix 是该 PHP 应用在 HTTP 路由层的 URL 前缀（如 "/xxb"）。
	// 不为空时，会将前缀注入 PHP 的 SCRIPT_NAME 与 PHP_SELF，
	// 使 PHP 框架能正确计算 $config->webRoot 并生成带前缀的 URL。
	pathPrefix string
}

var phpInitOnce sync.Once

// InitFrankenPHP 确保 FrankenPHP 全局只初始化一次，可安全重复调用
func InitFrankenPHP() {
	phpInitOnce.Do(func() {
		checkPHPIniScanDir()
		if err := frankenphp.Init(GetPHPOptions()...); err != nil {
			panic(err)
		}
	})
}

// NewPHPHandler 创建新的 PHP 处理器。
func NewPHPHandler(documentRoot string) *PHPHandler {
	InitFrankenPHP()
	if documentRoot == "" {
		documentRoot = defaultDocumentRoot()
	}
	return &PHPHandler{documentRoot: documentRoot}
}

// NewPHPHandlerWithPrefix 创建带 URL 前缀的 PHP 处理器。
// pathPrefix 为该应用在路由层的前缀（如 "/xxb"），会注入 PHP 的 SCRIPT_NAME 和 PHP_SELF，
func NewPHPHandlerWithPrefix(documentRoot, pathPrefix string) *PHPHandler {
	h := NewPHPHandler(documentRoot)
	h.pathPrefix = pathPrefix
	return h
}

func defaultDocumentRoot() string {
	runDir := util.GetRuningDir()
	return runDir + "/site/www/"
}

func buildFrankenPHPRequest(req *http.Request, documentRoot string, env map[string]string) (*http.Request, error) {
	options := []frankenphp.RequestOption{
		frankenphp.WithRequestDocumentRoot(documentRoot, false),
	}
	if len(env) > 0 {
		options = append(options, frankenphp.WithRequestEnv(env))
	}
	return frankenphp.NewRequestWithContext(req, options...)
}

// serveFrankenPHP 调用 FrankenPHP 处理 PHP 请求。
// pathPrefix 为 URL 路由前缀（如 "/xxb"）；不为空时会将前缀注入 SCRIPT_NAME 与 PHP_SELF，
func serveFrankenPHP(w http.ResponseWriter, req *http.Request, documentRoot string, pathPrefix string, env map[string]string) error {
	// 如果 env 中显式传递了 SCRIPT_NAME，需要更新 req.URL.Path
	if env != nil && env["SCRIPT_NAME"] != "" {
		// 当显式传递 SCRIPT_NAME 时，将 req.URL.Path 设置为 SCRIPT_NAME
		// 这样 FrankenPHP 就会执行正确的 PHP 文件
		util.LogDetail(fmt.Sprintf("serveFrankenPHP: Using explicit SCRIPT_NAME: %s, PATH_INFO: %s", env["SCRIPT_NAME"], env["PATH_INFO"]))
		req.URL.Path = env["SCRIPT_NAME"]
	} else if env == nil || env["PATH_INFO"] == "" {
		// 如果 env 中没有 PATH_INFO，则自动处理 pathinfo
		requestedPath := strings.TrimPrefix(req.URL.Path, "/")
		isPHP := strings.HasSuffix(req.URL.Path, ".php")

		// 检查请求的文件是否存在
		fullPath := filepath.Join(documentRoot, requestedPath)
		fileInfo, err := os.Stat(fullPath)
		fileExist := (err == nil && !fileInfo.IsDir())

		// 如果不是直接访问 PHP 文件或文件不存在，则设置 PATH_INFO
		if !isPHP || !fileExist {
			pathInfo := req.URL.Path
			req.URL.Path = findDefaultFile(documentRoot, "/")
			util.LogDetail(fmt.Sprintf("serveFrankenPHP: Auto pathInfo: %s, SCRIPT_NAME: %s", pathInfo, req.URL.Path))

			if env == nil {
				env = make(map[string]string)
			}
			env["PATH_INFO"] = pathInfo
			env["SCRIPT_NAME"] = "/index.php"
		}
	}

	// 将 URL 前缀注入 PHP 的 SCRIPT_NAME 和 PHP_SELF。
	// FrankenPHP 执行时先用 addKnownVariablesToServer 写入自动计算的值，
	// 再用 addPreparedEnvToServer 写入 env，后者优先级更高会覆盖前者。
	// 这样 PHP 的 $_SERVER['SCRIPT_NAME'] 会包含前缀，
	if pathPrefix != "" {
		if env == nil {
			env = make(map[string]string)
		}
		var scriptName string
		if sn, ok := env["SCRIPT_NAME"]; ok {
			scriptName = sn
		} else {
			scriptName = req.URL.Path
		}
		env["SCRIPT_NAME"] = pathPrefix + scriptName
		env["PHP_SELF"] = pathPrefix + scriptName
	}

	frankenphpReq, err := buildFrankenPHPRequest(req, documentRoot, env)
	if err != nil {
		return err
	}
	return frankenphp.ServeHTTP(w, frankenphpReq)
}

// findDefaultFile 查找默认文件（从 PHPHandler.findDefaultFile 提取为独立函数）
func findDefaultFile(documentRoot string, path string) string {
	// If path is not root, return the original path
	if path != "/" {
		return path
	}

	// List of default files to try
	defaultFiles := []string{"index.php", "index.html", "index.htm", "default.php", "default.html"}

	for _, filename := range defaultFiles {
		fullPath := filepath.Join(documentRoot, filename)
		if _, err := os.Stat(fullPath); err == nil {
			return "/" + filename
		}
	}

	// If no default file found, return root path
	return "/"
}

// HandleRequest 处理 PHP 请求
func (h *PHPHandler) HandleRequest(w http.ResponseWriter, r *http.Request) {
	// 检查请求路径对应的文件是否存在，如果存在则直接返回该文件
	requestedPath := strings.TrimPrefix(r.URL.Path, "/")
	originalPath := r.URL.Path // 保存原始路径，用于 PATH_INFO 处理

	if requestedPath == "" {
		r.URL.Path = "/index.php" // 默认文件
		requestedPath = "index.php"
	}

	isPHP := strings.HasSuffix(r.URL.Path, ".php")
	// Check if request is for static files (js, css, etc.)
	if !isPHP && !strings.HasSuffix(r.URL.Path, ".html") {
		// 先检查实际文件是否存在
		fullPath := filepath.Join(h.documentRoot, requestedPath)
		fileInfo, err := os.Stat(fullPath)
		fileExist := (err == nil && !fileInfo.IsDir())

		// 如果文件不存在，则作为 PATH_INFO 处理（转发给 PHP）
		if !fileExist {
			// 恢复原始路径，以便作为 PATH_INFO 处理
			r.URL.Path = originalPath
			// 作为 PATH_INFO 处理，继续执行后续的 serveFrankenPHP
		} else {
			// 文件存在，作为静态文件处理
			fs := http.FileServer(http.Dir(h.documentRoot))
			fs.ServeHTTP(w, r)
			return
		}
	}

	// pathinfo 处理逻辑已经移到 serveFrankenPHP 中
	// 直接调用 serveFrankenPHP，传递 nil 让它自动处理 pathinfo
	if err := serveFrankenPHP(w, r, h.documentRoot, h.pathPrefix, nil); err != nil {
		panic(err)
	}
}

// GetPHPOptions 获取 PHP 配置选项
func GetPHPOptions() []frankenphp.Option {
	// 确保 session 目录存在
	if util.Config.SessionSavePath != "" {
		if err := os.MkdirAll(util.Config.SessionSavePath, 0755); err != nil {
			log.Printf("Can not create directory %s: %v", util.Config.SessionSavePath, err)
		}
	}

	numThreads := 12

	// 创建自定义 logger
	customLogger := createCustomLogger()

	opts := []frankenphp.Option{
		frankenphp.WithNumThreads(numThreads),
		frankenphp.WithLogger(customLogger),
	}

	return opts
}

// createCustomLogger 创建自定义 logger
func createCustomLogger() *zap.Logger {
	// 创建日志文件
	logFile, err := createLogFile()
	if err != nil {
		util.Log("error", util.GetLang("Failed to create log file, using stdout: %v"), err)
		// 回退到标准输出
		return zap.NewExample()
	}

	// 使用文件输出创建 zap logger
	fileWriter := zapcore.AddSync(logFile)

	// 创建 encoder 配置
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	// 创建 core
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		fileWriter,
		zap.DebugLevel,
	)

	// 创建并返回 logger
	logger := zap.New(core)
	return logger
}

// createLogFile 创建日志文件
func createLogFile() (*os.File, error) {
	logDir := util.GetRuningDir() + "/log"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, err
	}

	today := time.Now().Format(time.DateOnly)
	logPath := logDir + "/frankenphp" + today + ".log"
	return os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
}

// customHandler 自定义 slog.Handler 实现
type customHandler struct {
	output io.Writer
}

func (h *customHandler) Enabled(ctx context.Context, level slog.Level) bool {
	// 根据配置控制日志级别
	// 可以在这里添加更复杂的级别控制逻辑
	return level >= slog.LevelInfo
}

func (h *customHandler) Handle(ctx context.Context, record slog.Record) error {
	// 格式化日志输出
	level := record.Level.String()
	message := record.Message

	// 处理附加属性
	var extra = ""
	var attrs []string
	record.Attrs(func(attr slog.Attr) bool {
		attrs = append(attrs, fmt.Sprintf("%s=%v", attr.Key, attr.Value.Any()))
		return true
	})
	if len(attrs) > 0 {
		extra += strings.Join(attrs, ", ")
	}

	log := fmt.Sprintf("%s [%s]", message, extra)

	util.Log(strings.ToLower(level), log)

	_, err := h.output.Write([]byte(log))
	return err
}

func (h *customHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	// 返回新的 handler 实例，包含额外的属性
	// 这里简化实现，实际使用时可以根据需要处理属性
	return h
}

func (h *customHandler) WithGroup(name string) slog.Handler {
	// 返回新的 handler 实例，包含分组
	// 这里简化实现，实际使用时可以根据需要处理分组
	return h
}

func checkPHPIniScanDir() {
	phpIniScanDir := os.Getenv("PHP_INI_SCAN_DIR")

	// 如果环境变量未设置，使用运行目录作为默认值
	if phpIniScanDir == "" {
		runDir := util.GetRuningDir()

		// 如果运行目录下已经存在 php.ini，通常会作为主配置文件被加载；
		// 如果此时再将运行目录设置为 PHP_INI_SCAN_DIR，会导致同一个 php.ini
		// 被扫描两次，从而出现 ionCube Loader 等扩展重复加载的情况。
		if _, err := os.Stat(filepath.Join(runDir, "php.ini")); err == nil {
			// 检测到 php.ini，保持 PHP_INI_SCAN_DIR 为空，避免重复加载
			util.Log("info", util.GetLang("Found php.ini in run directory, skip setting PHP_INI_SCAN_DIR"))
			return
		}

		// 未发现 php.ini，仍然使用运行目录作为 PHP_INI_SCAN_DIR，兼容老行为
		phpIniScanDir = runDir

		// 导出到环境变量，以便 frankenphp 能够读取
		if err := os.Setenv("PHP_INI_SCAN_DIR", phpIniScanDir); err != nil {
			util.Log("warn", util.GetLang("Failed to set PHP_INI_SCAN_DIR environment variable: %v"), err)
		} else {
			util.Log("info", util.GetLang("PHP_INI_SCAN_DIR environment variable not set, using default: %s"), phpIniScanDir)
		}
	} else {
		util.Log("info", util.GetLang("PHP_INI_SCAN_DIR environment variable is set: %s"), phpIniScanDir)
		// 检查目录是否存在
		if info, err := os.Stat(phpIniScanDir); err == nil {
			if info.IsDir() {
				util.Log("info", util.GetLang("PHP_INI_SCAN_DIR directory exists and is accessible"))
			} else {
				util.Log("warn", util.GetLang("PHP_INI_SCAN_DIR is set but is not a directory: %s"), phpIniScanDir)
			}
		} else {
			util.Log("warn", util.GetLang("PHP_INI_SCAN_DIR is set but directory does not exist or is not accessible: %s, error: %v"), phpIniScanDir, err)
		}
	}

}
