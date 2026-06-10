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
	resetPasswordFileError      = "未检测到指定文件，请确认文件路径和文件名是否正确。"
	resetPasswordExpiredError   = "当前重置请求已过期，请返回登录页重新发起。"

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

// RegisterResetPasswordRoutes registers the guided admin password reset APIs.
func RegisterResetPasswordRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/resetPasswordToken", handleResetPasswordToken)
	mux.HandleFunc("/api/verifyResetPasswordToken", handleVerifyResetPasswordToken)
}

func handleResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeResetPasswordJSON(w, "fail", "仅支持 GET", resetPasswordCodeMethodNotAllowed, http.StatusMethodNotAllowed)
		return
	}

	token, err := randomHex(16)
	if err != nil {
		util.Log("warn", "reset password create token: %v", err)
		writeResetPasswordJSON(w, "fail", "生成重置请求失败", resetPasswordCodeTokenCreateFailed, http.StatusInternalServerError)
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
		writeResetPasswordJSON(w, "fail", "仅支持 POST", resetPasswordCodeMethodNotAllowed, http.StatusMethodNotAllowed)
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
		writeResetPasswordJSON(w, "fail", "验证失败，请重试", resetPasswordCodeTokenCreateFailed, http.StatusInternalServerError)
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
