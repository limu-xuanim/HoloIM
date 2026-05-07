/**
 * The clientapi file of api current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     api
 * @link        https://www.xuanim.com
 */
package api

import (
	"strconv"
	"xxd/util"
)

// 踢除用户的数据包对象
type kickoffPack struct {
	Module string `json:"module"`
	Method string `json:"method"`
	Reason int    `json:"reason"`
}

// 创建踢除用户数据包对象
func newKickoffPack(reason int) kickoffPack {
	pack := kickoffPack{}
	pack.Module = `im`
	pack.Method = `userkickoff`
	pack.Reason = reason
	return pack
}

// 踢除用户的理由编码
const (
	kickReasonRepeatLogin        int = 1
	kickReasonPasswordChange     int = 2
	kickReasonUserDeleted        int = 3
	kickReasonUserForbided       int = 4
	kickReasonSettingsChanged    int = 5
)

// 从客户端发来的登录请求，通过该函数转发到后台服务器进行登录验证
// func ChatLogin(clientData XxbResponse, clientIP string) ([]XxbResponse, error) {
// 	ranzhiServer, ok := RanzhiServer(string(clientData.Server))
// 	if !ok {
// 		return []XxbResponse{}, util.Errorf("%s %s", util.GetLang("[ChatLogin]", " ", "cannot found backend server"), string(clientData.Server))
// 	}

// 	// 到http服务器请求，返回加密的结果，可能包含多个数组, type []byte
// 	options := &hyperttp.RequestOptions{ClientIP: clientIP}

// 	var reqBody []byte
// 	if util.Config.EnableAES == 1 {
// 		reqBody = UnparseData(clientData, ranzhiServer.RanzhiToken)
// 	} else {
// 		reqBody = clientData.JSON
// 	}

// 	retMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, reqBody, options)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[ChatLogin]", " ", "hyperttp request info error", ":"), err)
// 		return []XxbResponse{}, err
// 	}

// 	//解密数据
// 	parseData, err := ParseBackendResponse(retMessage, ranzhiServer.RanzhiToken)
// 	if util.Config.Debug == 2 {
// 		for _, data := range parseData {
// 			util.LogDetail(util.GetLang("[ChatLogin]", " ", "backend response", ": ") + spew.Sdump(data))
// 		}
// 	}
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[ChatLogin]", " ", "request json data decrypt error", ":"), err)
// 		return parseData, err
// 	}
// 	return parseData, nil
// }

// 客户端退出
// func ChatLogout(serverName string, userID int64, lang string, normal bool) ([]XxbResponse, error) {
// 	ranzhiServer, ok := RanzhiServer(serverName)
// 	if !ok {
// 		return []XxbResponse{}, util.Errorf("%s %s", util.GetLang("[ChatLogout]", "cannot found backend server"), serverName)
// 	}

// 	message := []byte(`{"module":"im","method":"userLogout","lang":"` + lang + `","userID":` + util.Int642String(userID) + `,"params":[` + util.Bool2String(normal) + `]}`)

// 	if util.Config.EnableAES == 1 {
// 		encryptedMessage, err := AesEncrypt(message, ranzhiServer.RanzhiToken)
// 		if err != nil {
// 			util.Errorf("%s %s", util.GetLang("[ChatLogout]", " ", "AES encrypt error", ":"), err)
// 			return []XxbResponse{}, err
// 		}
// 		message = encryptedMessage
// 	}

// 	// 到http服务器请求usergetlist数据
// 	r2xMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, message, nil)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[ChatLogout]", " ", "hyperttp request info error", ":"), err)
// 		return []XxbResponse{}, err
// 	}

// 	parseData, err := ParseBackendResponse(r2xMessage, ranzhiServer.RanzhiToken)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[ChatLogout]", " ", "Parse response error", ":"), err)
// 		return []XxbResponse{}, err
// 	}

// 	return parseData, nil
// }

// 踢除用户
func kickoff(reason int) []byte {
	util.LogDetail(util.Sprintf("%s %d", util.GetLang("[Kickoff]", " ", "reason", ":"), reason))
	kickoffPack := newKickoffPack(reason)
	kickoffMessage, err := util.JSONMarshal(kickoffPack)

	var message []byte
	if util.Config.EnableClientAES == 1 {
		message, err = AesEncrypt(kickoffMessage, util.Token)
	} else {
		message = kickoffMessage
	}
	if err != nil {
		util.Log("error", "%s %s", util.GetLang("[Kickoff]", " ", "json data AES encrypt error", ":"), err)
		return nil
	}
	util.LogDetail(util.GetLang("[Kickoff]", " ", "json data", ": ") + string(kickoffMessage))
	return message
}

// 重复登录时踢除用户
func RepeatLogin() []byte {
	return kickoff(kickReasonRepeatLogin)
}

// 更改密码后踢除用户
func PasswordChanged() []byte {
	return kickoff(kickReasonPasswordChange)
}

// 用户在后台被删除后踢除用户
func UserDeleted() []byte {
	return kickoff(kickReasonUserDeleted)
}

// 用户在后台被禁用后踢除用户
func UserForbided() []byte {
	return kickoff(kickReasonUserForbided)
}

// 后台设置变更后踢除用户
func SettingsChanged() []byte {
	return kickoff(kickReasonSettingsChanged)
}

// 禁止登录
func BlockLogin() []byte {
	blockLogin := []byte(`{"module":"im","method":"blockLogin","message":"Online users exceed system limits."}`)

	util.LogDetail(util.GetLang("[BlockLogin]", " ", "json data", ": ") + string(blockLogin))
	message, err := AesEncrypt(blockLogin, util.Token)
	if err != nil {
		util.Log("error", "%s %s", util.GetLang("[BlockLogin]", " ", "json data AES encrypt error", ":"), err)
		return nil
	}

	return message
}

// 测试登录
func TestLogin() []byte {
	loginData := []byte(`{"result":"success","data":{"id":12,"account":"demo8","realname":"\u6210\u7a0b\u7a0b","avatar":"","role":"hr","dept":0,"status":"online","admin":"no","gender":"f","email":"ccc@demo.com","mobile":"","site":"","phone":""},"sid":"18025976a786ec78194e491e7b790731","module":"im","method":"userLogin"}`)

	message, err := AesEncrypt(loginData, util.Token)
	if err != nil {
		util.Log("error", "%s %s", util.GetLang("[TestLogin]", " ", "json data AES encrypt error", ":"), err)
		return nil
	}

	return message
}

// 用户文件SessionID 作用于文件下载 为适配web版客户端
func UserFileSessionID(serverName string, userID int64, lang string) ([]byte, string, error) {
	sessionID := util.GetMD5(serverName + util.Int642String(userID) + util.Int642String(util.GetUnixTime()))
	sessionData := []byte(`["syssessionidResponse",["",1,1,"",null,0,null,"` + sessionID + `"]]`)

	var err error
	if util.Config.EnableClientAES == 1 {
		sessionData, err = AesEncrypt(sessionData, util.Token)
	}
	if err != nil {
		util.Log("error", "%s %s", util.GetLang("[UserFileSessionID]", " ", "Session data AES encrypt error", ":"), err)
		return nil, "", err
	}

	return sessionData, sessionID, nil
}

// func ReportAndGetNotify(server string, lang string) (map[int64][]byte, error) {
// 	ranzhiServer, ok := RanzhiServer(server)
// 	if !ok {
// 		return nil, util.Errorf("%s %s", util.GetLang("[CheckUserChange]", " ", "cannot found backend server"), server)
// 	}
// 	//get offline data and sendfail message id from SQLite.
// 	sendFail, _ := util.DBSelectSendfail(server)

// 	//create json map for xxb
// 	trunk := make(map[string]any)
// 	params := make(map[string]any)

// 	params["offline"] = nil
// 	params["sendfail"] = sendFail

// 	trunk["module"] = "im"
// 	trunk["method"] = "syncnotifications"
// 	trunk["lang"] = lang
// 	trunk["params"] = params

// 	jsonData, err := util.JSONMarshal(trunk)
// 	if err != nil {
// 		util.Log("error", "[ReportNotify] Marshal error: %v", err)
// 		return nil, err
// 	}
// 	parseData := NewParseData()
// 	parseData.JSON = jsonData

// 	var reqBody []byte
// 	if util.Config.EnableAES == 1 {
// 		reqBody = UnparseData(parseData, ranzhiServer.RanzhiToken)
// 	} else {
// 		reqBody = parseData.JSON
// 	}

// 	//send message to xxb and get notify data
// 	retMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, reqBody, nil)
// 	if err != nil {
// 		util.Log("error", "[ReportAndGetNotify] hyperttp request info error: %s", err)
// 		return nil, err
// 	}

// 	responseData, err := ParseJSON(retMessage, ranzhiServer.RanzhiToken)
// 	if err != nil {
// 		return nil, err
// 	}
// 	if responseData["result"] == nil || responseData["result"].(string) != "success" {
// 		return nil, err
// 	}

// 	messageList := make(map[int64][]byte)
// 	switch responseData["data"].(type) {
// 	case map[string]any:
// 		data := responseData["data"].(map[string]any)
// 		for userID, messages := range data {
// 			if messages != nil && messages != "" {
// 				userNotify := make(map[string]any)
// 				userNotify["module"] = "im"
// 				userNotify["method"] = "syncnotifications"
// 				userNotify["result"] = "success"
// 				userNotify["data"] = messages
// 				uid, _ := util.String2Int64(userID)
// 				parseData := NewParseData()
// 				jsonData, err := util.JSONMarshal(userNotify)
// 				if err != nil {
// 					util.Log("error", "[ReportNotify] Marshal error: %v", err)
// 					return nil, err
// 				}
// 				parseData.JSON = jsonData
// 				messageList[uid] = UnparseData(parseData, util.Token)
// 			}
// 		}
// 	}

// 	go util.DBDeleteSendfail(server, sendFail)
// 	return messageList, nil
// }

// func CheckUserChange(serverName string, lang string) (map[int64][]byte, error) {
// 	ranzhiServer, ok := RanzhiServer(serverName)
// 	if !ok {
// 		return nil, util.Errorf("%s %s", util.GetLang("[CheckUserChange", " ", "cannot found backend server"), serverName)
// 	}

// 	// 固定的json格式
// 	request := []byte(`{"module":"im","method":"syncusers","lang":"` + lang + `","params":[""]}`)
// 	util.LogDetail(util.GetLang("[CheckUserChange]", " ", "json data", ": ") + string(request))
// 	if util.Config.EnableAES == 1 {
// 		var err error
// 		request, err = AesEncrypt(request, ranzhiServer.RanzhiToken)
// 		if err != nil {
// 			util.Log("error", "%s %s", util.GetLang("[CheckUserChange]", " ", "json data AES encrypt error", ":"), err)
// 			return nil, err
// 		}
// 	}

// 	// 到http服务器请求user get list数据
// 	retMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, request, nil)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[CheckUserChange]", "hyperttp request info error", ":"), err)
// 		return nil, err
// 	}

// 	responseData, err := ParseJSON(retMessage, ranzhiServer.RanzhiToken)
// 	if err != nil {
// 		return nil, err
// 	}
// 	if responseData["result"] == nil || responseData["result"].(string) != "success" {
// 		util.Log("error", "%s %s", util.GetLang("[CheckUserChange]", " ", "request info status", ":"), responseData["result"])
// 		return nil, err
// 	}

// 	memberUpdates := make(map[int64][]byte)
// 	if len(responseData["data"].([]any)) > 0 {
// 		for _, member := range responseData["data"].([]any) {
// 			memberID := member.(map[string]any)["id"]
// 			memberUpdate := make(map[string]any)
// 			memberUpdate["rid"] = ""
// 			memberUpdate["module"] = "im"
// 			memberUpdate["method"] = "usergetlist"
// 			memberUpdate["data"] = member
// 			memberUpdate["result"] = "success"
// 			memberUpdate["message"] = ""
// 			jsonData, err := util.JSONMarshal(memberUpdate)
// 			if err != nil {
// 				util.Log("error", "[CheckUserChange] Marshal error: %v", err)
// 				return nil, err
// 			}
// 			memberUpdates[int64(memberID.(float64))] = jsonData
// 		}
// 		return memberUpdates, nil
// 	}

// 	return nil, nil
// }

// func CheckDeptChange(serverName string, lang string) (string, error) {
// 	ranzhiServer, ok := RanzhiServer(serverName)
// 	if !ok {
// 		return "", util.Errorf("%s %s", util.GetLang("[CheckDeptChange]", " ", "cannot found backend server"), serverName)
// 	}

// 	request := []byte(`{"module":"im","method":"syncdepts","lang":"` + lang + `","params":[""]}`)
// 	util.LogDetail(util.GetLang("[CheckDeptChange]", " ", "json data", ": ") + string(request))
// 	if util.Config.EnableAES == 1 {
// 		var err error
// 		request, err = AesEncrypt(request, ranzhiServer.RanzhiToken)
// 		if err != nil {
// 			util.Log("error", "%s %s", util.GetLang("[CheckDeptChange]", " ", "json data AES encrypt error", ":"), err)
// 			return "", err
// 		}
// 	}

// 	retMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, request, nil)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[CheckDeptChange]", " ", "hyperttp request info error", ":"), err)
// 		return "", err
// 	}

// 	responseData, err := ParseJSON(retMessage, ranzhiServer.RanzhiToken)
// 	if err != nil {
// 		return "", err
// 	}
// 	if responseData["result"] == nil || responseData["result"].(string) != "success" {
// 		util.Log("error", "%s %s", util.GetLang("[CheckDeptChange]", " ", "request info status", ":"), responseData["result"])
// 		return "", err
// 	}

// 	return responseData["data"].(string), nil
// }

// UnicastMessage 单播消息
type UnicastMessage struct {
	UserIds []int64 // 接收者id
	Msg     []byte  // 消息内容
}

// extractUserIds 提取用户id
func extractUserIds(message map[string]any) (ids []int64) {
	if userIds, ok := message["users"].([]any); ok {
		for _, userId := range userIds {
			userId, ok := userId.(string)
			if !ok {
				continue
			}
			id, err := strconv.Atoi(userId)
			if err != nil {
				continue
			}
			ids = append(ids, int64(id))
		}
	} else if userIds, ok := message["users"].(map[string]any); ok {
		for _, userId := range userIds {
			userId, ok := userId.(string)
			if !ok {
				continue
			}
			id, err := strconv.Atoi(userId)
			if err != nil {
				continue
			}
			ids = append(ids, int64(id))
		}
	}

	return
}

// GeneralPoll 通用轮询
// func GeneralPoll(serverName string, lang string) ([]XxbResponse, error) {
// 	ranzhiServer, ok := RanzhiServer(serverName)
// 	if !ok {
// 		return []XxbResponse{}, util.Errorf("%s %s", util.GetLang("[GeneralPoll]", " ", "cannot found backend server"), serverName)
// 	}

// 	request := []byte(`{"module":"im","method":"generalpoll","lang":"` + lang + `","params":[""]}`)
// 	util.LogDetail(util.GetLang("[GeneralPoll]", " ", "json data", ": ") + string(request))
// 	if util.Config.EnableAES == 1 {
// 		var err error
// 		request, err = AesEncrypt(request, ranzhiServer.RanzhiToken)
// 		if err != nil {
// 			util.Log("error", "%s %s", util.GetLang("[GeneralPoll]", " ", "json data AES encrypt error", ":"), err)
// 			return []XxbResponse{}, err
// 		}
// 	}

// 	retMessage, _, err := hyperttp.RequestInfo(ranzhiServer.RanzhiAddr, request, nil)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[GeneralPoll]", " ", "hyperttp request info error", ":"), err)
// 		return []XxbResponse{}, err
// 	}

// 	if len(retMessage) == 0 {
// 		return []XxbResponse{}, nil
// 	}

// 	responses, err := ParseBackendResponse(retMessage, ranzhiServer.RanzhiToken)
// 	if err != nil {
// 		util.Log("error", "%s %s", util.GetLang("[GeneralPoll]", " ", "request json data decrypt error", ":"), err)
// 		return []XxbResponse{}, err
// 	}
// 	if util.Config.Debug == 2 {
// 		for _, data := range responses {
// 			util.LogDetail(util.GetLang("[GeneralPoll]", " ", "backend response", ": ") + spew.Sdump(data))
// 		}
// 	}

// 	return responses, nil
// }

// 与客户端间的错误通知
func RetErrorMsg(errCode, errMsg, reqRid string) ([]byte, error) {
	errApi := `["syserrorResponse",["` + reqRid + `",0,"syserror",0,0,1,null,0,"` + errMsg + `",` + errCode + `]]`
	message, err := AesEncrypt([]byte(errApi), util.Token)
	if err != nil {
		util.Log("error", "%s %s", util.GetLang("[RetErrorMsg]", " ", "json data AES encrypt error", ":"), err)
		return nil, err
	}

	return message, nil
}

// 获取然之服务器名称
func RanzhiServer(serverName string) (util.RanzhiServer, bool) {
	if serverName == "" {
		info, ok := util.Config.RanzhiServer[util.Config.DefaultServer]
		return info, ok
	}

	info, ok := util.Config.RanzhiServer[serverName]
	return info, ok
}

func GetServerName(jsonData util.JSONData) (serverName string) {
	params, ok := jsonData["params"]
	if !ok {
		return
	}
	// api中server name在数组固定位置为0
	serverName = params.([]any)[0].(string)
	return
}
