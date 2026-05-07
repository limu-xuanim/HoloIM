package util

import (
	"crypto/tls"
)

// SecureServerTLSConfig 返回用于 HTTPS 服务端的安全 TLS 配置，修复 CVE-2016-2183 (SWEET32)。
// 仅使用 128/256 位块密码（如 AES），禁用 3DES/Blowfish 等 64 位块密码，并强制 TLS 1.2+。
func SecureServerTLSConfig() *tls.Config {
	// tls.CipherSuites() 仅包含安全套件，不含 3DES 等 64 位块密码
	suites := tls.CipherSuites()
	ids := make([]uint16, 0, len(suites))
	for _, s := range suites {
		ids = append(ids, s.ID)
	}
	return &tls.Config{
		MinVersion:   tls.VersionTLS12,
		CipherSuites: ids,
	}
}
