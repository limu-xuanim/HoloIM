/**
 * The color file of util current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"os"
	"regexp"
	"runtime"
	"strings"
)

// ANSI 颜色代码常量
const (
	// 前景色
	ColorReset   = "\033[0m"
	ColorBlack   = "\033[30m"
	ColorRed     = "\033[31m"
	ColorGreen   = "\033[32m"
	ColorYellow  = "\033[33m"
	ColorBlue    = "\033[34m"
	ColorMagenta = "\033[35m"
	ColorCyan    = "\033[36m"
	ColorWhite   = "\033[37m"

	// 浅色版本
	ColorLightBlack   = "\033[90m"
	ColorLightRed     = "\033[91m"
	ColorLightGreen   = "\033[92m"
	ColorLightYellow  = "\033[93m"
	ColorLightBlue    = "\033[94m"
	ColorLightMagenta = "\033[95m"
	ColorLightCyan    = "\033[96m"
	ColorLightWhite   = "\033[97m"

	// 背景色
	ColorBgBlack   = "\033[40m"
	ColorBgRed     = "\033[41m"
	ColorBgGreen   = "\033[42m"
	ColorBgYellow  = "\033[43m"
	ColorBgBlue    = "\033[44m"
	ColorBgMagenta = "\033[45m"
	ColorBgCyan    = "\033[46m"
	ColorBgWhite   = "\033[47m"

	// 样式
	ColorBold      = "\033[1m"
	ColorDim       = "\033[2m"
	ColorUnderline = "\033[4m"
)

// 颜色支持检测
var colorSupported bool

func InitColor() {
	colorSupported = isColorSupported()
}

// isColorSupported 检测终端是否支持颜色输出
func isColorSupported() bool {
	// Windows 系统检测
	if runtime.GOOS == "windows" {
		// 检查是否有 ANSICON 环境变量或者是新版 Windows Terminal
		if os.Getenv("ANSICON") != "" {
			return true
		}
		// Windows 10 版本 1607 及以上支持 ANSI 转义序列
		return os.Getenv("WT_SESSION") != "" || os.Getenv("ConEmuANSI") == "ON"
	}

	// Unix/Linux 系统检测
	term := os.Getenv("TERM")
	if term == "" {
		return false
	}

	// 检查是否为已知支持颜色的终端
	colorTerms := []string{
		"xterm", "xterm-256color", "xterm-color", "screen", "screen-256color",
		"tmux", "tmux-256color", "rxvt", "ansi", "vt100", "vt102", "vt220", "vt320",
	}

	for _, colorTerm := range colorTerms {
		if strings.Contains(term, colorTerm) {
			return true
		}
	}

	// 检查 COLORTERM 环境变量
	return os.Getenv("COLORTERM") != ""
}

// Colorize 给文本添加颜色
func Colorize(text, color string) string {
	if !colorSupported || Config.Debug == 0 {
		return text
	}
	return color + text + ColorReset
}

// ColorizeGreen 添加绿色
func ColorizeGreen(text string) string {
	return Colorize(text, ColorGreen)
}

// ColorizeLightGreen 添加浅绿色
func ColorizeLightGreen(text string) string {
	return Colorize(text, ColorLightGreen)
}

// ColorizeRed 添加红色
func ColorizeRed(text string) string {
	return Colorize(text, ColorRed)
}

// ColorizeYellow 添加黄色
func ColorizeYellow(text string) string {
	return Colorize(text, ColorYellow)
}

// ColorizeBold 添加粗体
func ColorizeBold(text string) string {
	return Colorize(text, ColorBold)
}

// RemoveColors 移除文本中的颜色代码（用于写入文件）
func RemoveColors(text string) string {
	// ANSI 颜色代码的正则表达式
	re := regexp.MustCompile(`\033\[[0-9;]*m`)
	return re.ReplaceAllString(text, "")
}

// GetColorSupported 获取颜色支持状态
func GetColorSupported() bool {
	return colorSupported
}

// SetColorSupported 设置颜色支持状态（主要用于测试）
func SetColorSupported(supported bool) {
	colorSupported = supported
}
