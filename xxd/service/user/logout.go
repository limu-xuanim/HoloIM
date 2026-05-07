package user

import (
	"fmt"
	"xxd/api"
	"xxd/util"

	"gorm.io/gorm"
)

type LoginOutService struct {
	db *gorm.DB
}

func NewLogOutService() *LoginOutService {
	return &LoginOutService{
		db: util.MysqlDB,
	}
}

func (s *LoginOutService) UserLoginOutService(userId int64, normal bool, clientIP string, device string, version string) (responseList []api.XxbResponse, err error) {
	xxbResponse := api.XxbResponse{
		Users:  []int64{userId},
		UserID: userId,
		Result: []byte("success"),
		Method: []byte("userlogout"),
		Device: []byte(device),
		Lang:   []byte("zh-cn"),
		RID:    []byte(fmt.Sprintf("logout_desktop_%d", userId)),
	}
	userInfo, _ := user.GetAccountByID(s.db, userId)
	if userInfo.ClientStatus == "offline" {
		userMap, _ := userInfo.ToMap()
		response := map[string]any{
			"result": api.ResultFail,
			"users":  []int64{userId},
			"data":   userMap,
		}

		failResponse, err := api.Format(xxbResponse, response, "userlogoutResponse")
		return []api.XxbResponse{failResponse}, err
	}

	// 关闭会议
	conferenceResponse := s.closeConference(xxbResponse, userId)

	userData := map[string]any{
		"clientStatus": "offline",
	}
	err = user.UpdateUserInfo(s.db, &userInfo, userData, "userlogout", false)
	if err != nil {
		return responseList, err
	}
	userInfo.ClientStatus = "offline"
	userInfo.Status = userInfo.ClientStatus

	actionType := "disconnectXuanxuan"
	if normal {
		actionType = "logoutXuanxuan"
	}

	user.AddAction(s.db, userInfo, actionType, "success", "", false, clientIP)
	userDevice.UpdateDevice(s.db, userId, device, "logout", version)

	onlineUserIdList := user.GetOnlineUsers(s.db, []int64{})
	userMap, _ := userInfo.ToMap()

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  onlineUserIdList,
		"data":   userMap,
	}
	successResponse, err := api.Format(xxbResponse, response, "userlogoutResponse")
	responseList = append(responseList, successResponse)
	if len(conferenceResponse) > 0 {
		responseList = append(responseList, conferenceResponse...)
	}
	return responseList, err
}
