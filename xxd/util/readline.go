/**
 * 从标准输入读取一行，在 TTY 下支持退格等编辑（跨平台）
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     util
 * @link        https://www.xuanim.com
 */
package util

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"runtime"
	"unicode/utf8"

	"golang.org/x/term"
)

// ReadLine 从 stdin 读取一行。当 stdin 为 TTY 时（仅 Unix）使用终端原始模式以支持退格等编辑；
// Windows 或非 TTY（管道、重定向）时使用普通行读取，由系统控制台处理回显与编辑。返回内容不包含结尾的 \n。
func ReadLine() (string, error) {
	fd := int(os.Stdin.Fd())
	// Windows 下不使用 raw 模式，避免控制台回显、光标、IME 等表现异常；直接用按行读取。
	if runtime.GOOS == "windows" || !term.IsTerminal(fd) {
		reader := bufio.NewReader(os.Stdin)
		s, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		return trimLine(s), nil
	}
	oldState, err := term.MakeRaw(fd)
	if err != nil {
		reader := bufio.NewReader(os.Stdin)
		s, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		return trimLine(s), nil
	}
	defer term.Restore(fd, oldState)

	var buf bytes.Buffer
	var inputBytes []byte // 用于收集多字节字符
	
	for {
		b := make([]byte, 1)
		n, err := os.Stdin.Read(b)
		if err != nil || n == 0 {
			break
		}
		c := b[0]
		
		switch c {
		case '\n', '\r':
			// 处理回车/换行：直接返回，不等待后续字符
			_, _ = fmt.Print("\r\n")
			return buf.String(), nil
			
		case 0x7f, 0x08: // 退格：Unix DEL / Windows BS
			if buf.Len() > 0 {
				// 按 UTF-8 字符删除
				s := buf.String()
				if r, size := utf8.DecodeLastRuneInString(s); r != utf8.RuneError {
					buf.Truncate(buf.Len() - size)
					// 删除显示：对于宽字符（如中文）需要删除两个位置
					if runeWidth(r) == 2 {
						_, _ = fmt.Print("\b\b  \b\b")
					} else {
						_, _ = fmt.Print("\b \b")
					}
				}
			}
			inputBytes = inputBytes[:0] // 清空多字节缓冲
			
		case 0x03: // Ctrl+C
			_, _ = fmt.Print("^C\n")
			term.Restore(fd, oldState)
			os.Exit(130)
			
		case 0x04: // Ctrl+D (EOF)
			if buf.Len() == 0 {
				_, _ = fmt.Print("\n")
				term.Restore(fd, oldState)
				return "", fmt.Errorf("EOF")
			}
			
		case 0x1b: // ESC - 可能是方向键等 ANSI 转义序列
			// 尝试读取并丢弃转义序列
			if discardEscapeSequence() {
				inputBytes = inputBytes[:0]
				continue
			}
			// 如果不是转义序列，按普通字符处理
			fallthrough
			
		default:
			// 收集字节以构建完整的 UTF-8 字符
			if c >= 32 || c == 9 { // 可打印字符或 Tab
				inputBytes = append(inputBytes, c)
				// 检查是否是完整的 UTF-8 字符
				if utf8.FullRune(inputBytes) {
					r, _ := utf8.DecodeRune(inputBytes)
					buf.WriteRune(r)
					_, _ = fmt.Print(string(r))
					inputBytes = inputBytes[:0]
				}
			} else {
				// 忽略其他控制字符
				inputBytes = inputBytes[:0]
			}
		}
	}
	return buf.String(), nil
}

func trimLine(s string) string {
	for len(s) > 0 && (s[len(s)-1] == '\n' || s[len(s)-1] == '\r') {
		s = s[:len(s)-1]
	}
	return s
}

// runeWidth 返回字符的显示宽度（1 或 2）
func runeWidth(r rune) int {
	// 简化版：CJK 字符和全角字符占 2 个位置
	if r >= 0x1100 && (r <= 0x115F || r >= 0x2E80 && r <= 0x9FFF ||
		r >= 0xAC00 && r <= 0xD7AF || r >= 0xF900 && r <= 0xFAFF ||
		r >= 0xFE10 && r <= 0xFE19 || r >= 0xFE30 && r <= 0xFE6F ||
		r >= 0xFF00 && r <= 0xFF60 || r >= 0xFFE0 && r <= 0xFFE6 ||
		r >= 0x20000 && r <= 0x2FFFD || r >= 0x30000 && r <= 0x3FFFD) {
		return 2
	}
	return 1
}

// discardEscapeSequence 尝试丢弃 ANSI 转义序列（如方向键）
// 返回 true 表示成功丢弃了转义序列
func discardEscapeSequence() bool {
	// ESC 后通常跟 [ 然后是参数和命令字符
	// 例如：ESC [ A (上箭头), ESC [ B (下箭头) 等
	b := make([]byte, 1)
	
	// 尝试非阻塞读取下一个字符
	// 注意：这里简化处理，实际可能需要设置读取超时
	if n, _ := os.Stdin.Read(b); n > 0 {
		if b[0] == '[' || b[0] == 'O' {
			// 继续读取直到命令字符 (通常是 A-Z, a-z)
			for {
				if n, _ := os.Stdin.Read(b); n > 0 {
					c := b[0]
					// 命令字符范围
					if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '~' {
						return true
					}
					// 如果不是参数字符（数字、分号），可能不是标准转义序列
					if !((c >= '0' && c <= '9') || c == ';') {
						return false
					}
				} else {
					return false
				}
			}
		}
	}
	return false
}
