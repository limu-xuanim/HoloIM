package user

import (
	"fmt"
	"xxd/api"
	"xxd/model"
	"xxd/util"
)

type SetDeviceTokenRequest struct {
	DeviceToken string `json:"deviceToken"`
	DeviceType  string `json:"deviceType"`
}

func (r *SetDeviceTokenRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("usersetdevicetoken invalid params")
	}

	var err error
	if r.DeviceToken, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	r.DeviceType, err = util.AnyToString(data[1])
	return err
}

func (u *UserService) SetDeviceToken(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params SetDeviceTokenRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	var userModel model.User
	maskedDeviceToken := util.MaskSensitive(params.DeviceToken)
	util.Log("info", "[push] userSetDeviceToken request: userID=%d deviceType=%s deviceToken=%s", userId, params.DeviceType, maskedDeviceToken)
	result, setErr := userModel.SetDeviceToken(u.db, userId, params.DeviceToken, params.DeviceType)
	if setErr != nil {
		util.Log("error", "[push] userSetDeviceToken failed: userID=%d deviceType=%s deviceToken=%s err=%v", userId, params.DeviceType, maskedDeviceToken, setErr)
		return api.FailResponse(xxbResponse, setErr)
	}
	util.Log("info", "[push] userSetDeviceToken saved: userID=%d deviceType=%s result=%s", userId, params.DeviceType, result)

	response := map[string]any{
		"result": api.ResultSuccess,
		"users":  []any{userId},
	}

	successResponse, err := api.Format(xxbResponse, response, "usersetdevicetokenResponse")
	responseList = append(responseList, successResponse)

	return responseList, err
}
