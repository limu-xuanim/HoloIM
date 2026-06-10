package util

import (
	"net"
	"net/http"
	"strings"
)

// GetClientIP returns the TCP peer IP. Forwarded headers are intentionally ignored
// because they can be spoofed by clients when no trusted proxy layer is enforced.
func GetClientIP(r *http.Request) string {
	// 优先使用 RemoteAddr，这是TCP连接的真实IP，无法被客户端伪造
	remoteAddr := strings.TrimSpace(r.RemoteAddr)
	if remoteAddr == "" {
		return ""
	}

	// 解析IP地址（格式通常是 "IP:PORT"）
	ip, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		// 如果没有端口，可能是Unix socket或其他格式，尝试直接使用
		ip = remoteAddr
	}
	if len(ip) > 15 {
		return ip[:15]
	}
	return ip
}
