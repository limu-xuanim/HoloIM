package sys

import (
	"time"

	"xxd/lang"
	"xxd/model"
	userService "xxd/service/user"
	"xxd/util"
)

// ServerInfoData 服务器信息数据
type ServerInfoData struct {
	ClientUpdate        any                         `json:"clientUpdate,omitempty"`
	Backend             string                      `json:"backend"`
	Permissions         any                         `json:"permissions,omitempty"`
	BackendURL          string                      `json:"backendURL"`
	DismissedGroupLife  int                         `json:"dismissedGroupLife"`
	RequestType         string                      `json:"requestType"`
	RequestFix          string                      `json:"requestFix"`
	IceServers          any                         `json:"iceServers,omitempty"`
	ApiScheme           any                         `json:"apiScheme,omitempty"`
	ServerTime          float64                     `json:"serverTime"`
	AuthToken           string                      `json:"authToken,omitempty"`
	AuthTokenLifetime   int64                       `json:"authTokenLifetime"`
	AuthTokenAuthWindow int64                       `json:"authTokenAuthWindow"`
	TokenNeedRenew      bool                        `json:"tokenNeedRenew,omitempty"`
	Integration         []string                    `json:"integration,omitempty"`
	Watermark           *model.WatermarkConfig      `json:"watermark,omitempty"`
	ReadStatus          string                      `json:"readStatus,omitempty"`
	DeptVisibility      *model.DeptVisibilityConfig `json:"deptVisibility,omitempty"`
}

// buildServerInfoBase 构建服务器信息的公共部分
func (sys *SysService) buildServerInfoBase(user *model.User, request SysGetServerInfoRequest, upgradeInfo any) *ServerInfoData {
	data := &ServerInfoData{
		ClientUpdate:        upgradeInfo,
		Backend:             sys.getBackendType(),
		BackendURL:          sys.getBackendURL(),
		DismissedGroupLife:  sys.getDismissedGroupLife(),
		RequestType:         sys.getRequestType(),
		RequestFix:          sys.getRequestFix(),
		ServerTime:          float64(time.Now().UnixNano()) / 1000000, // 微秒时间戳
		AuthTokenLifetime:   model.GetTokenLifeTime(sys.db),
		AuthTokenAuthWindow: model.GetTokenAuthWindow(sys.db),
	}

	// 设置ICE服务器配置
	if iceServers := sys.getIceServers(); iceServers != "" {
		data.IceServers = iceServers
	}

	// API架构信息
	if sys.needApiScheme(request.ApiVersion) {
		data.ApiScheme = sys.getApiScheme()
	}

	// 用户认证令牌信息
	if user.Token != "" {
		data.AuthToken = user.Token
	}
	if user.TokenNeedRenew {
		data.TokenNeedRenew = true
	}

	return data
}

func (sys *SysService) SysGetServerInfo(request SysGetServerInfoRequest, clientIP string) (*SysGetServerInfoResponse, error) {
	loginService := userService.NewLoginService()
	user, err := loginService.UserIdentify(request.Account, request.Password, clientIP, request.Device)
	if err != nil {
		user.AddAction(sys.db, request.Account, "loginXuanxuan", "fail", "", false, "")

		switch err {
		case model.ErrLocked:
			return sys.createFailResponse("locked", ""), nil
		case model.ErrBanned:
			return sys.createFailResponse("banned", ""), nil
		case model.ErrInvalidToken:
			return sys.createFailResponse("Invalid Token.", lang.Get("service.sys.tokenInvalid")), nil
		default:
			util.Log("error", "UserIdentify error: %v", err)
			return sys.createFailResponse("Illegal Request.", lang.Get("service.sys.loginFailed")), nil
		}
	}

	upgradeInfo, err := model.GetClientUpgrade(sys.db, request.Version)
	if err != nil {
		return sys.createFailResponse("Illegal Request.", err.Error()), nil
	}

	if err := sys.checkClientVersion(request.Version, upgradeInfo); err != nil {
		return sys.createFailResponse("Illegal Request.", err.Error()), nil
	}

	serverInfo := sys.buildServerInfoBase(user, request, upgradeInfo)

	response := &SysGetServerInfoResponse{
		Result:  "success",
		Users:   []int64{int64(user.ID)},
		UserID:  int64(user.ID),
		Method:  "sysgetserverinfo",
		Device:  request.Device,
		Lang:    sys.getLang(),
		Version: util.Version,
		Data:    serverInfo,
	}

	return response, nil
}
