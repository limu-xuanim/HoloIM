package user

import (
	"fmt"
	"strings"
	"time"
	"xxd/api"
	xxdLang "xxd/lang"
	"xxd/model"
	"xxd/util"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/gorm"
)

type LoginService struct {
	db *gorm.DB
}

func NewLoginService() *LoginService {
	return &LoginService{
		db: util.MysqlDB,
	}
}

type LoginOptions struct {
	Status  string `json:"status"`
	Simple  bool   `json:"simple"`
	Oidc    bool   `json:"oidc"`
	Lang    string `json:"lang"`
	Version string `json:"version"`
	Device  string `json:"device"`
}

type LoginRequest struct {
	Account  string `json:"account"`
	Password string `json:"password"`
	Options  LoginOptions
}

func (r *LoginRequest) toStruct(data []any) error {
	if len(data) < 4 {
		return fmt.Errorf("userlogin invalid params")
	}

	var err error
	if r.Account, err = util.AnyToString(data[1]); err != nil {
		return err
	}

	if r.Password, err = util.AnyToString(data[2]); err != nil {
		return err
	}

	options, ok := data[3].(map[string]any)
	if !ok {
		return fmt.Errorf("userlogin invalid params")
	}

	if status, ok := options["status"].(string); ok {
		r.Options.Status = status
	}
	if simple, ok := options["simple"].(bool); ok {
		r.Options.Simple = simple
	}
	if oidc, ok := options["oidc"].(bool); ok {
		r.Options.Oidc = oidc
	}
	if lang, ok := options["lang"].(string); ok {
		r.Options.Lang = lang
	}
	if version, ok := options["version"].(string); ok {
		r.Options.Version = version
	}
	if device, ok := options["device"].(string); ok {
		r.Options.Device = device
	}
	return nil
}

func (s *LoginService) LoginService(paramSlice []any, xxbResponse api.XxbResponse, clientIP string) (responseList []api.XxbResponse, err error) {
	var params LoginRequest
	if err := params.toStruct(paramSlice); err != nil {
		return api.FailResponse(xxbResponse, err)
	}

	device := string(xxbResponse.Device)
	clientIP = strings.Split(clientIP, ":")[0]

	response := map[string]any{
		"result": api.ResultSuccess,
	}

	user, err := s.UserIdentify(params.Account, params.Password, clientIP, device)
	if err != nil {
		response["result"] = api.ResultFail
		response["message"] = err.Error()
		failResponse, err := api.Format(xxbResponse, response, "messageResponsePack")
		responseList = append(responseList, failResponse)
		return responseList, err
	}

	userId := int64(user.ID)
	response["users"] = []int64{userId}
	xxbResponse.UserID = userId

	oidc := params.Options.Oidc
	if oidc {
		if user.ID == 0 {
			response["result"] = api.ResultFail
			failResponse, err := api.Format(xxbResponse, response, "messageResponsePack")
			responseList = append(responseList, failResponse)
			return responseList, err
		}
		response["data"] = map[string]any{
			"id":       user.ID,
			"account":  user.Account,
			"realname": user.RealName,
			"email":    user.Email,
		}
		successResponse, err := api.Format(xxbResponse, response, "messageResponsePack")
		responseList = append(responseList, successResponse)
		return responseList, err
	}

	if user.ID == 0 {
		response["result"] = api.ResultFail
		response["message"] = xxdLang.Get("service.user.notExist")
		failResponse, err := api.Format(xxbResponse, response, "messageResponsePack")
		responseList = append(responseList, failResponse)
		return responseList, err
	}

	lang := params.Options.Lang
	if lang == "" {
		lang = "zh-cn"
	}

	status := params.Options.Status
	if status == "" {
		status = "online"
	}

	now := time.Now()
	userData := map[string]any{
		"clientStatus": status,
		"clientLang":   lang,
		"ip":           clientIP,
		"last":         now,
		"ping":         now,
		"fails":        0,
		"visits":       user.Visits + 1,
	}
	err = user.UpdateUserInfo(s.db, user, userData, "userlogin", false)
	if err != nil {
		return responseList, err
	}

	user.Status = status
	user.ClientStatus = status
	user.ClientLang = lang

	simple := params.Options.Simple
	actionStr := "loginXuanxuan"
	if simple {
		actionStr = "reconnectXuanxuan"
	}
	action.AddUserAction(s.db, user.Account, actionStr, userId, string(xxbResponse.Method), "success", "", xxbResponse.Ip)

	version := params.Options.Version
	if version == "" {
		version = xxbResponse.Version
	}

	chatList, _ := imChat.GetChats(util.MysqlDB, user, 90, model.IsSystemGroupEnable(util.MysqlDB))
	hasBotChat := imChat.HasBotChat(chatList)
	if !hasBotChat {
		botChat, _, err := imChat.Create(util.MysqlDB, fmt.Sprintf("%d&xuanbot", userId), xxdLang.Get("service.common.xuanbot"), "bot", []int64{userId}, 0, false, userId)
		if err != nil {
			return api.FailResponse(xxbResponse, fmt.Errorf("create bot chat error: %s", err.Error()))
		}
		welcomeMsg, err := imMessage.CreateXuanbotWelcomeNotify(util.MysqlDB, userId)
		if err != nil {
			return api.FailResponse(xxbResponse, fmt.Errorf("create xuanbot welcome notify error: %s", err.Error()))
		}
		if botChat != nil {
			if welcomeMsg != nil {
				botChat.LastMessage = welcomeMsg.ID
				botChat.LastMessageIndex = welcomeMsg.Index
			}
			chatList = append(chatList, *botChat)
		}
	}
	chatResponseJson := map[string]interface{}{
		"result": api.ResultSuccess,
		"method": "chatgetlist",
		"users":  []int64{userId},
		"data":   model.ConvertChatsSlice(chatList),
	}

	chatResponse, _ := api.Format(xxbResponse, chatResponseJson, "chatgetlistResponse")

	err = userDevice.UpdateDevice(s.db, user.ID, device, "login", version)
	if err != nil {
		if util.Config.Debug == 2 {
			fmt.Printf(util.GetLang("Login", " ", "update device failed: %v"), err)
		}
	}

	userMap, _ := user.ToMap()
	loginResponseJson := map[string]any{
		"result": api.ResultSuccess,
		"method": "userlogin",
		"users":  []int64{userId},
		"userID": userId,
		"device": device,
		"lang":   lang,
		"data":   userMap,
	}
	loginResponse, _ := api.Format(xxbResponse, loginResponseJson, "userloginResponse")
	responseList = append(responseList, loginResponse)
	responseList = append(responseList, chatResponse)

	responseList, err = s.appendConferenceInviteResponses(responseList, xxbResponse, userId)
	return responseList, err
}
