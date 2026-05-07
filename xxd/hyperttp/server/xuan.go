package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"xxd/api"
	"xxd/model"
	"xxd/service/sys"
	"xxd/util"
	"xxd/wsocket"

	"github.com/davecgh/go-spew/spew"
	"github.com/minio/sio"
)

// routes that are handled by the xuan handlers
const (
	xuanDownload   = "/fileDownload"
	xuanUpload     = "/fileUpload"
	xuanServerInfo = "/serverInfo"
	xuanInvalidate = "/Invalid"
	xuanKickAll    = "/kickAll"
)

// SuccessResponse 结构体继承自 ServerInfoData 并添加了其他属性
type SuccessResponse struct {
	*sys.ServerInfoData
	Result          string  `json:"result"`
	Users           []int64 `json:"users"`
	UserID          int64   `json:"userID"`
	Method          string  `json:"method"`
	Device          string  `json:"device"`
	Lang            string  `json:"lang"`
	Version         string  `json:"version"`
	Token           string  `json:"token"`
	UploadFileSize  int64   `json:"uploadFileSize"`
	ChatPort        int     `json:"chatPort"`
	EnableClientAES int64   `json:"enableClientAES"`
	StunPort        string  `json:"stunPort"`
}

// 获取文件大小的接口
type Size interface {
	Size() int64
}

// 获取文件信息的接口
type Stat interface {
	Stat() (os.FileInfo, error)
}

// 文件下载
func fileDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		fmt.Fprintln(w, util.GetLang("Not supported request"))
		return
	}

	r.ParseForm()
	reqFileName := r.FormValue("fileName")
	reqFileTime := r.FormValue("time")
	reqFileID := r.FormValue("id")
	reqPreview := r.FormValue("preview")

	serverName := r.FormValue("ServerName")
	if serverName == "" {
		serverName = util.Config.DefaultServer
	}

	//新增加验证方式
	reqGid := r.FormValue("gid")
	reqSid := r.FormValue("sid")
	if reqSid == "" {
		sid, error := r.Cookie("sid-" + reqGid)
		if error == nil {
			reqSid = sid.Value
		} else {
			sid, error := r.Cookie("sid")
			if error == nil {
				reqSid = sid.Value
			}
		}
	}
	userID, err := util.String2Int64(reqGid)
	if err != nil {
		fmt.Fprintln(w, util.GetLang("[fileDownload]", " ", "Get file sessionid error"))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	sessionIDs := wsocket.GetSessionIDs(serverName, userID)

	sessionMatched := false
	for _, sessionID := range sessionIDs {
		util.LogDetail(util.GetLang("[fileDownload]", " ", "File downloaded sessionid is", " ") + sessionID)
		if reqSid == string(util.GetMD5(reqGid+":"+sessionID)) || reqSid == string(util.GetMD5(sessionID+reqFileName)) {
			sessionMatched = true
		}
	}

	if !sessionMatched {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	fileTime, err := util.String2Int64(reqFileTime)
	util.LogDetail(util.GetLang("[fileDownload]", " ", "File downloaded fileTime is", " ") + reqFileTime)
	if err != nil {
		util.Log("error", util.GetLang("[fileDownload]", " ", "File download time undefined", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// new file name = md5(old filename + fileID + fileTime)
	fileName := util.Config.UploadPath + serverName + "/" + util.GetYmdPath(fileTime) + util.GetMD5(reqFileName+reqFileID+reqFileTime)
	if !util.Exists(fileName) || util.IsDir(fileName) {
		fileServer := util.Config.GetFileServer()
		if fileServer != "" {
			http.Redirect(w, r, fileServer+"fileDownload?"+r.URL.RawQuery, http.StatusPermanentRedirect)
			return
		} else {
			w.WriteHeader(http.StatusNotFound)
			return
		}
	}

	if reqPreview == "1" {
		w.Header().Add("Content-Type", util.FileContentType(reqFileName))
		w.Header().Add("content-disposition", "filename=\""+util.FileBaseName(reqFileName)+"\"")
	} else {
		w.Header().Add("Content-Type", "application/octet-stream")
		w.Header().Add("content-disposition", "attachment; filename=\""+util.FileBaseName(reqFileName)+"\"")
	}

	if fileKey, ok := util.ServersideConfig[serverName]["fileKey"]; ok {
		f, err := os.Open(fileName)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		decryptedFile, err := sio.DecryptReader(f, sio.Config{Key: fileKey.([]byte)})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		_, err = io.Copy(w, decryptedFile)
		if err == nil {
			return
		}
	}

	http.ServeFile(w, r, fileName)
}

func checkClientVersion(jsonString string) bool {
	jsonMap, err := util.JSONUnmarshal([]byte(jsonString))
	if err != nil {
		return false
	}

	device, ok := jsonMap.(map[string]interface{})["device"]
	if !ok {
		return false
	}

	if device.(string) != "desktop" {
		return true
	}

	version, ok := jsonMap.(map[string]interface{})["version"]
	if !ok {
		return false
	}

	vParts := strings.Split(version.(string), ".")
	if len(vParts) < 2 {
		return false
	}

	v1, err := strconv.Atoi(vParts[0])
	if err != nil {
		return false
	}

	v2, err := strconv.Atoi(vParts[1])
	if err != nil {
		return false
	}

	return v1 >= 9 && v2 >= 3
}

// 服务配置信息
func serverInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "POST,GET,OPTIONS,DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	w.Header().Add("Access-Control-Allow-Credentials", "true")

	if r.Method != "POST" {
		fmt.Fprintln(w, util.GetLang("[serverInfo]", " ", "POST request only", "."))
		return
	}

	// read raw body to handle complex password
	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var rawData util.JSONData
	if err := json.Unmarshal(body, &rawData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// oldClient := false
	// if util.StringContains(jsonString, "\"module\":\"chat\",") {
	// 	oldClient = true
	// 	jsonString = util.StringReplace(jsonString, "\"method\":\"login\",", "\"method\":\"sysgetserverinfo\",", 1)
	// 	jsonString = util.StringReplace(jsonString, "\"module\":\"chat\",", "", 1)
	// }

	// check if the request method is serverinfo, and only serverinfo
	// if !util.StringContains(jsonString, "\"method\":\"sysgetserverinfo\",") {
	// 	w.WriteHeader(http.StatusBadRequest)
	// 	fmt.Fprintln(w, util.GetLang("Illegal Request."))
	// 	return
	// }

	// 解析请求参数
	request, err := parseServerInfoRequest(rawData)
	if err != nil {
		util.Log("error", util.GetLang("[serverInfo]", " ", "Parse request error", ": %s"), err)
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, util.GetLang("Parse request error", ": ")+err.Error())
		return
	}

	// 获取客户端IP
	clientIP := strings.Split(r.RemoteAddr, ":")[0]

	util.LogDetail(util.GetLang("[ServerInfo]", " ", "ServerInfo request", ": "), util.ColorLightGreen)
	util.LogDetail(spew.Sdump(request))

	// 调用重构后的SysService处理sysGetServerInfo请求
	// 这完全替换了旧的api.VerifyLogin逻辑
	sysService := sys.NewSysService()
	response, err := sysService.SysGetServerInfo(*request, clientIP)
	if err != nil {
		util.Log("error", util.GetLang("[serverInfo]", " ", "SysGetServerInfo error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintln(w, util.GetLang("Internal server error"))
		return
	}

	if _, ok := response.Data.(*sys.ServerInfoData); !ok {
		util.LogDetail(util.GetLang("[ServerInfo]", " ", "ServerInfo response", ": "), util.ColorLightGreen)
		util.LogDetail(spew.Sdump(response))
	}

	// 根据业务逻辑结果设置HTTP状态码并构建响应
	if response.Result == "fail" {
		// 处理失败情况
		switch response.Data {
		case "locked":
			w.WriteHeader(http.StatusPaymentRequired)
		case "banned":
			w.WriteHeader(http.StatusForbidden)
		case "Illegal Request.":
			w.WriteHeader(http.StatusBadRequest)
		default:
			w.WriteHeader(http.StatusUnauthorized)
		}

		// 返回失败响应
		failResponse := map[string]any{
			"result":  response.Result,
			"data":    response.Data,
			"message": response.Message,
		}
		if response.Data == "Invalid Token." {
			failResponse["message"] = util.GetLang("Token invalid")
		}

		jsonData, err := util.JSONMarshal(failResponse)
		if err != nil {
			util.Log("error", util.GetLang("[serverInfo]", " ", "JSON marshal error", ": %s"), err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		fmt.Fprintln(w, string(jsonData))
		return
	}

	// 处理成功情况 - 添加xxd特有的配置信息
	chatPort, err := util.String2Int(util.Config.ChatPort)
	if err != nil {
		util.Log("error", util.GetLang("[serverInfo]", " ", "Convert chat port to number error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// use advertised port if is set
	advertiseChatPort, err := util.String2Int(util.Config.AdvertisePort)
	if err == nil && advertiseChatPort > 0 {
		chatPort = advertiseChatPort
	}

	// 将SysService的响应转换为完整的serverInfo响应格式
	uploadFileSize := model.GetUploadFileSize(util.MysqlDB)
	successResponse := &SuccessResponse{
		ServerInfoData:  response.Data.(*sys.ServerInfoData),
		Result:          response.Result,
		Users:           response.Users,
		UserID:          response.UserID,
		Method:          response.Method,
		Device:          response.Device,
		Lang:            response.Lang,
		Version:         response.Version,
		Token:           string(util.Token),
		UploadFileSize:  uploadFileSize,
		ChatPort:        chatPort,
		EnableClientAES: util.Config.EnableClientAES,
		StunPort:        util.Config.StunPort,
	}

	jsonData, err := util.JSONMarshal(successResponse)
	if err != nil {
		util.Log("error", util.GetLang("[serverInfo]", " ", "JSON marshal error", ": %s"), err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, string(jsonData))
}

// parseServerInfoRequest 解析serverInfo请求参数
func parseServerInfoRequest(rawData util.JSONData) (*sys.SysGetServerInfoRequest, error) {
	// 根据日志分析的实际JSON结构解析
	// 实际结构是: {"method":"sysgetserverinfo","params":["","admin","passwordhash",""],"version":"9.3","device":"desktop","lang":"zh-cn"}
	request := &sys.SysGetServerInfoRequest{}

	// 解析params数组
	if paramsInterface, ok := rawData["params"]; ok {
		if params, ok := paramsInterface.([]any); ok {
			if len(params) >= 4 {
				// 根据日志分析，params数组结构为: ["", "admin", "passwordhash", ""]
				// params[0]: 可能是预留字段或account前缀
				// params[1]: account/username
				// params[2]: password hash
				// params[3]: userID或预留字段

				if account, ok := params[1].(string); ok {
					request.Account = account
				}

				if password, ok := params[2].(string); ok {
					request.Password = password
				}

				// 如果params[3]不为空且可以转换为数字，则作为userID
				if len(params) > 3 && params[3] != "" {
					if userIDStr, ok := params[3].(string); ok && userIDStr != "" {
						if userIDFloat, err := strconv.ParseFloat(userIDStr, 64); err == nil {
							request.UserID = int64(userIDFloat)
						}
					} else if userIDFloat, ok := params[3].(float64); ok {
						request.UserID = int64(userIDFloat)
					}
				}
			} else {
				return nil, fmt.Errorf("params array length too short: %d", len(params))
			}
		} else {
			return nil, fmt.Errorf("params is not an array")
		}
	} else {
		return nil, fmt.Errorf("params not found in request")
	}

	// 从顶级字段解析version、device、lang等信息
	if version, ok := rawData["version"].(string); ok {
		request.Version = version
	}

	if device, ok := rawData["device"].(string); ok {
		request.Device = device
	}

	// 如果有lang字段，可以用作apiVersion或其他用途
	if lang, ok := rawData["lang"].(string); ok {
		if request.ApiVersion == "" {
			request.ApiVersion = lang
		}
	}

	return request, nil
}

// isLocalhostIP 检查IP是否为本地IP（127.0.0.1或::1）
func isLocalhostIP(ip string) bool {
	return ip == "127.0.0.1" || ip == "::1" || ip == "localhost"
}

// getClientIP 安全地获取客户端IP地址
func getClientIP(r *http.Request) string {
	// 优先使用 RemoteAddr，这是TCP连接的真实IP，无法被客户端伪造
	remoteAddr := r.RemoteAddr
	if remoteAddr == "" {
		return ""
	}

	// 解析IP地址（格式通常是 "IP:PORT"）
	ip, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		// 如果没有端口，可能是Unix socket或其他格式，尝试直接使用
		ip = remoteAddr
	}

	return ip
}

// handleInvalidateCache 处理缓存失效请求，只允许本机IP访问
func handleInvalidateCache(w http.ResponseWriter, r *http.Request) {
	// 获取客户端IP（使用安全的获取方式）
	ip := getClientIP(r)
	if ip == "" {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintln(w, util.GetLang("Access denied: unable to get client IP"))
		util.Log("warning", util.GetLang("[handleInvalidateCache]", " Access denied: unable to get client IP"))
		return
	}

	// 检查是否为本地IP
	// 注意：我们只检查 RemoteAddr，不检查 X-Forwarded-For，因为：
	// - RemoteAddr 是TCP连接的真实IP，客户端无法伪造
	// - X-Forwarded-For 可以被客户端伪造，存在安全风险
	if !isLocalhostIP(ip) {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintln(w, util.GetLang("Access denied: only localhost access allowed"))
		util.Log("warning", util.GetLang("[handleInvalidateCache]", " Access denied from IP: %s (RemoteAddr)"), ip)
		return
	}

	// 只支持POST方法
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintln(w, util.GetLang("Only POST method is allowed"))
		return
	}

	// 从请求体获取JSON数组
	var cacheKeys []string
	if err := json.NewDecoder(r.Body).Decode(&cacheKeys); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		response := map[string]interface{}{
			"result":  "fail",
			"message": util.GetLang("Invalid request body: expected JSON array of cache keys"),
			"error":   err.Error(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 检查缓存key数组是否为空
	if len(cacheKeys) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		response := map[string]interface{}{
			"result":  "fail",
			"message": util.GetLang("Cache keys array is required and cannot be empty"),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 遍历并失效每个缓存key
	invalidatedKeys := make([]string, 0, len(cacheKeys))
	for _, key := range cacheKeys {
		key = strings.TrimSpace(key) // 去除前后空格
		if key != "" {
			model.DeleteItemFromCache(key)
			invalidatedKeys = append(invalidatedKeys, key)
		}
	}

	// 检查是否有有效的key被处理
	if len(invalidatedKeys) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		response := map[string]interface{}{
			"result":  "fail",
			"message": util.GetLang("No valid cache keys provided (all keys were empty)"),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 返回成功响应
	response := map[string]interface{}{
		"result":  "success",
		"message": util.GetLang("Cache invalidated successfully"),
		"keys":    invalidatedKeys,
		"count":   len(invalidatedKeys),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	util.Log("info", util.GetLang("[handleInvalidateCache]", " Cache invalidated for %d key(s): %v from IP: %s"), len(invalidatedKeys), invalidatedKeys, ip)
}

// validateAdminToken 验证管理API的Authorization头，从xxb_config表读取当前AES密钥进行校验
func validateAdminToken(authHeader string) bool {
	if authHeader == "" {
		return false
	}
	// 从xxb_config读取当前密钥，始终与xxb保持一致（支持运行时修改）
	dbKey := model.GetItem(util.MysqlDB, "owner=system&module=common&section=xuanxuan&key=key", "config")
	if dbKey != "" && authHeader == dbKey {
		return true
	}
	// 回退：兼容xxd.conf中启动时加载的RanzhiToken
	for _, server := range util.Config.RanzhiServer {
		if authHeader == string(server.RanzhiToken) {
			return true
		}
	}
	return false
}

// handleKickAll 处理踢除所有在线用户的请求，仅允许本机IP访问且需携带后端token
func handleKickAll(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintln(w, util.GetLang("Only POST method is allowed"))
		return
	}

	ip := getClientIP(r)
	if ip == "" {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintln(w, util.GetLang("Access denied: unable to get client IP"))
		util.Log("warning", util.GetLang("[handleKickAll]", " Access denied: unable to get client IP"))
		return
	}

	if !isLocalhostIP(ip) {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintln(w, util.GetLang("Access denied: only localhost access allowed"))
		util.Log("warning", util.GetLang("[handleKickAll]", " Access denied from IP: %s"), ip)
		return
	}

	authorization := r.Header.Get("Authorization")
	if !validateAdminToken(authorization) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintln(w, util.GetLang("Unauthorized: invalid token"))
		util.Log("warning", util.GetLang("[handleKickAll]", " Unauthorized access attempt with invalid token from IP: %s"), ip)
		return
	}

	util.LogDetail(util.GetLang("[handleKickAll]", " Authorized access from IP: %s"), ip)

	// 解析可选参数 serverName，为空则踢除所有服务器的用户
	var requestBody struct {
		ServerName string `json:"serverName"`
	}
	serverName := ""
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err == nil {
		serverName = requestBody.ServerName
	}

	kickMsg := api.SettingsChanged()
	affectedServers := make([]string, 0)

	if serverName != "" {
		if _, ok := util.Config.RanzhiServer[serverName]; ok {
			wsocket.WSHub.Broadcast(serverName, kickMsg)
			affectedServers = append(affectedServers, serverName)
		} else {
			w.WriteHeader(http.StatusBadRequest)
			response := map[string]interface{}{
				"result":  "fail",
				"message": util.GetLang("Server not found: ") + serverName,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
	} else {
		for name := range util.Config.RanzhiServer {
			wsocket.WSHub.Broadcast(name, kickMsg)
			affectedServers = append(affectedServers, name)
		}
	}

	response := map[string]interface{}{
		"result":          "success",
		"message":         util.GetLang("All users kicked off successfully"),
		"affectedServers": affectedServers,
		"count":           len(affectedServers),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	util.Log("info", util.GetLang("[handleKickAll]", " All users kicked off for %d server(s): %v from IP: %s"), len(affectedServers), affectedServers, getClientIP(r))
}
