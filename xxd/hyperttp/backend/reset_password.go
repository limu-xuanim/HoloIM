package backend

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"xxd/util"

	"gorm.io/gorm"
)

const (
	resetPasswordMaxBytes       = 1 << 20
	resetPasswordTokenLifetime  = 3 * time.Minute
	resetPasswordVerifyLifetime = 10 * time.Minute
	resetPasswordFileError      = "File not found"
	resetPasswordExpiredError   = "Reset password expired"

	resetPasswordCodeMethodNotAllowed  = 4001 // 方法不允许
	resetPasswordCodeBadRequest        = 4002 // 请求错误
	resetPasswordCodeVerifyToken       = 4003 // 验证令牌错误
	resetPasswordCodeTokenCreateFailed = 4004 // 令牌创建失败
	resetPasswordCodeFile              = 4005 // 文件错误
	resetPasswordCodeAccountEmpty      = 4006 // 账号为空
	resetPasswordCodePasswordEmpty     = 4007 // 密码为空
	resetPasswordCodePasswordTooShort  = 4008 // 密码过短
	resetPasswordCodePasswordMismatch  = 4009 // 密码不匹配
	resetPasswordCodeDBNotInitialized  = 4010 // 数据库未初始化
	resetPasswordCodeUserNotFound      = 4011 // 用户不存在
	resetPasswordCodeUserQueryFailed   = 4012 // 用户查询失败
	resetPasswordCodeUpdateFailed      = 4013 // 更新失败
)

var (
	resetPasswordTokenRE = regexp.MustCompile(`^[a-f0-9]{32}$`)
	resetPasswordTokens  = make(map[string]*resetPasswordTokenState)
	resetPasswordTokensM sync.Mutex
)

type resetPasswordTokenState struct {
	Token       string
	FileName    string
	CreatedAt   time.Time
	Used        bool
	Verified    bool
	VerifyToken string
	VerifiedAt  time.Time
	ResetDone   bool
}

type resetPasswordTokenResponse struct {
	Result       string `json:"result"`
	Token        string `json:"token"`
	FileName     string `json:"fileName"`
	RelativePath string `json:"relativePath"`
}

type resetPasswordJSONResponse struct {
	Result  string `json:"result"`
	Message string `json:"message,omitempty"`
	Code    int    `json:"code,omitempty"`
}


type verifyResetPasswordRequest struct {
	Token string `json:"token"`
}

type verifyResetPasswordResponse struct {
	Result      string `json:"result"`
	VerifyToken string `json:"verifyToken,omitempty"`
	Message     string `json:"message,omitempty"`
}

type resetPasswordRequest struct {
	VerifyToken string `json:"verifyToken"`
	Account     string `json:"account"`
	Password    string `json:"password"`
	Password2   string `json:"password2"`
}

type resetPasswordUser struct {
	ID      int64  `gorm:"column:id"`
	Account string `gorm:"column:account"`
	Admin   string `gorm:"column:admin"`
}

// RegisterResetPasswordRoutes registers the guided admin password reset APIs.
func RegisterResetPasswordRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/resetPasswordToken", handleResetPasswordToken)
	mux.HandleFunc("/api/verifyResetPasswordToken", handleVerifyResetPasswordToken)
	mux.HandleFunc("/api/resetPassword", handleResetPassword)
}

func handleResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeResetPasswordJSON(w, "fail", "Method Not Allowed", resetPasswordCodeMethodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	token, err := randomHex(16)
	if err != nil {
		util.Log("warn", "reset password create token: %v", err)
		writeResetPasswordJSON(w, "fail", "Create token failed", resetPasswordCodeTokenCreateFailed, http.StatusInternalServerError)
		return
	}

	now := time.Now()
	state := &resetPasswordTokenState{
		Token:     token,
		FileName:  "reset_" + token + ".txt",
		CreatedAt: now,
	}

	resetPasswordTokensM.Lock()
	cleanupResetPasswordTokensLocked(now)
	resetPasswordTokens[token] = state
	resetPasswordTokensM.Unlock()

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(resetPasswordTokenResponse{
		Result:       "success",
		Token:        token,
		FileName:     state.FileName,
		RelativePath: filepath.ToSlash(state.FileName),
	})
}

func handleVerifyResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeResetPasswordJSON(w, "fail", "Method Not Allowed", resetPasswordCodeMethodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, resetPasswordMaxBytes)
	defer r.Body.Close()

	var req verifyResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeResetPasswordJSON(w, "fail", resetPasswordFileError, resetPasswordCodeFile, http.StatusBadRequest)
		return
	}

	token := strings.TrimSpace(req.Token)
	if !resetPasswordTokenRE.MatchString(token) {
		writeResetPasswordJSON(w, "fail", resetPasswordFileError, resetPasswordCodeFile, http.StatusOK)
		return
	}

	now := time.Now()
	resetPasswordTokensM.Lock()
	cleanupResetPasswordTokensLocked(now)
	state, ok := resetPasswordTokens[token]
	if !ok || state.Used || now.Sub(state.CreatedAt) > resetPasswordTokenLifetime {
		resetPasswordTokensM.Unlock()
		writeResetPasswordJSON(w, "fail", resetPasswordExpiredError, resetPasswordCodeVerifyToken, http.StatusOK)
		return
	}
	fileName := state.FileName
	resetPasswordTokensM.Unlock()

	guardPath, err := validateResetPasswordGuardFile(fileName)
	if err != nil {
		writeResetPasswordJSON(w, "fail", err.Error(), resetPasswordCodeFile, http.StatusOK)
		return
	}

	verifyToken, err := randomHex(16)
	if err != nil {
		util.Log("warn", "reset password create verify token: %v", err)
		writeResetPasswordJSON(w, "fail", "Verification failed", resetPasswordCodeTokenCreateFailed, http.StatusInternalServerError)
		return
	}

	resetPasswordTokensM.Lock()
	state, ok = resetPasswordTokens[token]
	if !ok || state.Used || time.Since(state.CreatedAt) > resetPasswordTokenLifetime {
		resetPasswordTokensM.Unlock()
		writeResetPasswordJSON(w, "fail", resetPasswordExpiredError, resetPasswordCodeVerifyToken, http.StatusOK)
		return
	}
	state.Used = true
	state.Verified = true
	state.VerifyToken = verifyToken
	state.VerifiedAt = now
	resetPasswordTokensM.Unlock()

	if err := os.Remove(guardPath); err != nil && !os.IsNotExist(err) {
		util.Log("warn", "reset password remove guard file %s: %v", guardPath, err)
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(verifyResetPasswordResponse{Result: "success", VerifyToken: verifyToken})
}

func validateResetPasswordGuardFile(fileName string) (string, error) {
	if filepath.Base(fileName) != fileName || !strings.HasPrefix(fileName, "reset_") || !strings.HasSuffix(fileName, ".txt") {
		return "", errors.New(resetPasswordFileError)
	}

	tmpDir := filepath.Join(util.GetRuningDir(), "tmp")
	guardPath := filepath.Join(tmpDir, fileName)
	guardAbs, err := filepath.Abs(guardPath)
	if err != nil {
		return "", errors.New(resetPasswordFileError)
	}
	tmpAbs, err := filepath.Abs(tmpDir)
	if err != nil {
		return "", errors.New(resetPasswordFileError)
	}
	if filepath.Dir(guardAbs) != tmpAbs {
		return "", errors.New(resetPasswordFileError)
	}

	info, err := os.Stat(guardAbs)
	if err != nil || info.IsDir() || info.Size() != 0 {
		return "", errors.New(resetPasswordFileError)
	}

	return guardAbs, nil
}

func cleanupResetPasswordTokensLocked(now time.Time) {
	for token, state := range resetPasswordTokens {
		if now.Sub(state.CreatedAt) > resetPasswordVerifyLifetime || state.ResetDone {
			delete(resetPasswordTokens, token)
		}
	}
}

func randomHex(bytesLen int) (string, error) {
	b := make([]byte, bytesLen)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func writeResetPasswordJSON(w http.ResponseWriter, result string, message string, code int, statusCode int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(resetPasswordJSONResponse{Result: result, Message: message, Code: code})
}

func handleResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeResetPasswordJSON(w, "fail", "Method Not Allowed", resetPasswordCodeMethodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, resetPasswordMaxBytes)
	defer r.Body.Close()

	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeResetPasswordJSON(w, "fail", err.Error(), resetPasswordCodeBadRequest, http.StatusBadRequest)
		return
	}

	req.VerifyToken = strings.TrimSpace(req.VerifyToken)
	req.Account = strings.TrimSpace(req.Account)
	if req.VerifyToken == "" {
		writeResetPasswordJSON(w, "fail", resetPasswordExpiredError, resetPasswordCodeVerifyToken, http.StatusOK)
		return
	}
	if req.Account == "" {
		writeResetPasswordJSON(w, "fail", "Account is empty", resetPasswordCodeAccountEmpty, http.StatusOK)
		return
	}
	if req.Password == "" || req.Password2 == "" {
		writeResetPasswordJSON(w, "fail", "Password is empty", resetPasswordCodePasswordEmpty, http.StatusOK)
		return
	}
	if len(req.Password) < 6 {
		writeResetPasswordJSON(w, "fail", "Password is too short", resetPasswordCodePasswordTooShort, http.StatusOK)
		return
	}
	if req.Password != req.Password2 {
		writeResetPasswordJSON(w, "fail", "Password mismatch", resetPasswordCodePasswordMismatch, http.StatusOK)
		return
	}

	state := findResetPasswordStateByVerifyToken(req.VerifyToken, time.Now())
	if state == nil {
		writeResetPasswordJSON(w, "fail", resetPasswordExpiredError, resetPasswordCodeVerifyToken, http.StatusOK)
		return
	}

	if util.MysqlDB == nil {
		writeResetPasswordJSON(w, "fail", "Database not initialized", resetPasswordCodeDBNotInitialized, http.StatusInternalServerError)
		return
	}

	tableName := util.Config.Mysql.TablePrefix + "user"
	var user resetPasswordUser
	err := util.MysqlDB.Table(tableName).
		Select("id, account, admin").
		Where("account = ? AND deleted = ?", req.Account, "0").
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeResetPasswordJSON(w, "fail", "Information verification failed", resetPasswordCodeUserNotFound, http.StatusOK)
		return
	}
	if err != nil {
		util.Log("warn", "reset password query user: %v", err)
		writeResetPasswordJSON(w, "fail", "Information verification failed", resetPasswordCodeUserQueryFailed, http.StatusInternalServerError)
		return
	}

	password := util.MD5(util.MD5(req.Password) + req.Account)
	err = util.MysqlDB.Table(tableName).
		Where("id = ?", user.ID).
		Updates(map[string]any{"password": password, "fails": 0, "locked": nil}).Error
	if err != nil {
		util.Log("warn", "reset password update user: %v", err)
		writeResetPasswordJSON(w, "fail", "Update failed", resetPasswordCodeUpdateFailed, http.StatusInternalServerError)
		return
	}

	resetPasswordTokensM.Lock()
	if current, ok := resetPasswordTokens[state.Token]; ok {
		current.ResetDone = true
	}
	resetPasswordTokensM.Unlock()

	if err := addResetPasswordActionLog(r, user); err != nil {
		util.Log("warn", "reset password create action log: %v", err)
	}

	util.InvalidateUserCache(user.ID)
	writeResetPasswordJSON(w, "success", "Reset password success", 0, http.StatusOK)
}

func findResetPasswordStateByVerifyToken(verifyToken string, now time.Time) *resetPasswordTokenState {
	resetPasswordTokensM.Lock()
	defer resetPasswordTokensM.Unlock()
	cleanupResetPasswordTokensLocked(now)

	for _, state := range resetPasswordTokens {
		if state.VerifyToken != verifyToken || !state.Verified || state.ResetDone {
			continue
		}
		if now.Sub(state.VerifiedAt) > resetPasswordVerifyLifetime {
			return nil
		}
		return state
	}
	return nil
}

func addResetPasswordActionLog(r *http.Request, user resetPasswordUser) error {
	actionTableName := util.Config.Mysql.TablePrefix + "action"
	return util.MysqlDB.Table(actionTableName).Create(map[string]any{
		"objectType": "user",
		"objectID":   user.ID,
		"ip":         util.GetClientIP(r),
		"actor":      user.Account,
		"action":     "resetpassword",
		"result":     "success",
		"date":       time.Now(),
		"comment":    "",
		"extra":      "",
	}).Error
}
