package sys

import (
	"encoding/json"
	"os"
	"xxd/lang"
	"xxd/model"
	"xxd/util"
)

// SysGetServerInfoRequest 请求参数
type SysGetServerInfoRequest struct {
	Account    string `json:"account"`
	Password   string `json:"password"`
	ApiVersion string `json:"apiVersion"`
	UserID     int64  `json:"userID"`
	Version    string `json:"version"`
	Device     string `json:"device"`
}

// SysGetServerInfoResponse 响应数据
type SysGetServerInfoResponse struct {
	Result  string  `json:"result"`
	Users   []int64 `json:"users"`
	UserID  int64   `json:"userID"`
	Method  string  `json:"method"`
	Device  string  `json:"device"`
	Lang    string  `json:"lang"`
	RID     string  `json:"rid,omitempty"`
	Version string  `json:"version"`
	Data    any     `json:"data"`
	Message string  `json:"message"`
}

// createFailResponse 创建失败响应
func (sys *SysService) createFailResponse(data, message string) *SysGetServerInfoResponse {
	return &SysGetServerInfoResponse{
		Result:  "fail",
		Data:    data,
		Message: message, // 根据需要添加message字段
	}
}

// 以下是辅助方法的实现
func (sys *SysService) getBackendType() string {
	return util.Config.BackendType
}

func (sys *SysService) getBackendURL() string {
	return util.Config.BackendUrl
}

func (sys *SysService) getDismissedGroupLife() int {
	return 90
}

func (sys *SysService) getRequestType() string {
	return util.Config.ConfigServer.RequestType
}

func (sys *SysService) getRequestFix() string {
	return ""
}

func (sys *SysService) getIceServers() string {
	iceServers := model.GetIceServers(sys.db)
	return iceServers
}

func (sys *SysService) needApiScheme(apiVersion string) bool {
	// 当需要API架构信息时返回 true
	return apiVersion != ""
}

func (sys *SysService) getApiScheme() any {
	// 读取文件内容
	data, err := os.ReadFile(util.GetRuningDir() + "/config/apischeme.json")
	if err != nil {
		util.Log("error", "Failed to read apischeme.json: %v", err)
		return nil
	}

	// 解析JSON内容
	var apiScheme any
	err = json.Unmarshal(data, &apiScheme)
	if err != nil {
		util.Log("error", "Failed to parse apischeme.json: %v", err)
		return nil
	}

	return apiScheme
}

func (sys *SysService) getLang() string {
	return "zh-cn"
}

func (sys *SysService) checkClientVersion(version string, upgradeInfo *model.UpgradeResponse) error {
	if (upgradeInfo == nil || upgradeInfo.Strategy == "optional") && util.VersionCompare(version, util.MinClientVersion, "<") {
		return lang.Errorf("service.sys.clientVersionNotSupport", version, util.MinClientVersion)
	}
	return nil
}
