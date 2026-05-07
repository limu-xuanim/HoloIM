package util

import (
	"net"
)

// 检查监听 IP 配置项
func CheckIp(ip string) error {
	configIp := net.ParseIP(ip)
	if net.IP.IsUnspecified(configIp) {
		return nil
	}
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return err
	}
	for _, addr := range addrs {
		parsedIP, _, _ := net.ParseCIDR(addr.String())
		if parsedIP.Equal(configIp) {
			return nil
		}
	}
	return Errorf(GetLang("IP address", " %s ", "is not on any network interface"), ip)
}

func CheckResponse(response []byte, status int) error {
	if Config.EnableAES == 0 {
		LogDetail(GetLang("backend server response", ": ") + string(response))
	}
	LogDetail(Sprintf(GetLang("backend server status", ": %d"), status))
	return nil
}
