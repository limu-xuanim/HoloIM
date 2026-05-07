package user

import (
	"fmt"
	"xxd/api"
	"xxd/util"
)

type RenewAuthTokenRequest struct {
	DeviceType string `json:"deviceType"`
	DeviceID   string `json:"deviceID"`
}

func (r *RenewAuthTokenRequest) toStruct(data []any) error {
	if len(data) < 2 {
		return fmt.Errorf("userrenewauthtoken invalid params")
	}

	var err error
	if r.DeviceType, err = util.AnyToString(data[0]); err != nil {
		return err
	}

	r.DeviceID, err = util.AnyToString(data[1])
	return err
}

func (u *UserService) RenewAuthToken(paramSlice []any, xxbResponse api.XxbResponse, userId int64, version string, device string) (responseList []api.XxbResponse, err error) {
	var params RenewAuthTokenRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	token, err := userDevice.RenewAuthToken(u.db, userId, params.DeviceType, params.DeviceID)
	if err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	var response map[string]any
	if token == "" {
		response = map[string]any{
			"result": api.ResultFail,
			"users":  []int64{userId},
			"data":   "",
		}
	} else {
		response = map[string]any{
			"result": api.ResultSuccess,
			"users":  []int64{userId},
			"data":   token,
		}
	}

	successResponse, err := api.Format(xxbResponse, response, "usergetauthtokenResponse")
	responseList = append(responseList, successResponse)
	return responseList, err
}
