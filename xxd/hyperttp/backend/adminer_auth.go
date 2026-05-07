/**
 * Adminer 访问控制：类似 htpasswd 的账号密码校验（HTTP Basic Auth）
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"bufio"
	"encoding/base64"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"xxd/util"

	"golang.org/x/crypto/bcrypt"
)

const (
	adminerAuthRealm = "Adminer Database Admin"
)

var adminerPHPHandler *PHPHandler

func RegisterAdminerRoutes(mux *http.ServeMux) {
	// 使用默认 documentRoot（{runDir}/site/www/）
	adminerPHPHandler = NewPHPHandler("")
	mux.HandleFunc("/adminer.php", AdminerAuthHandler)
}

// loadAdminerPasswdFile 从配置的路径加载账号密码文件，格式与 htpasswd 兼容：每行 username:hash
// 仅支持 bcrypt 哈希（$2a$, $2y$, $2b$），与 htpasswd -B 生成格式兼容
func loadAdminerPasswdFile(path string) (map[string]string, error) {
	if path == "" {
		return nil, nil
	}
	absPath := path
	if !filepath.IsAbs(path) {
		absPath = filepath.Join(util.GetRuningDir(), path)
	}
	f, err := os.Open(absPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	users := make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.Index(line, ":")
		if idx <= 0 {
			continue
		}
		username := line[:idx]
		hash := strings.TrimSpace(line[idx+1:])
		if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2y$") || strings.HasPrefix(hash, "$2b$") {
			users[username] = hash
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

// defaultAdminerPasswdFile 当 Config.AdminerPasswdFile 未设置时（如首次安装
// Init 加载配置文件失败提前返回），回退到运行目录下的 users 文件。
const defaultAdminerPasswdFile = "users"

// getAdminerUsers 返回当前生效的账号→哈希表
func getAdminerUsers() (map[string]string, error) {
	path := util.Config.AdminerPasswdFile
	if path == "" {
		path = defaultAdminerPasswdFile
	}
	return loadAdminerPasswdFile(path)
}

// verifyAdminerBasicAuth 校验请求中的 HTTP Basic 认证，返回 true 表示通过
func verifyAdminerBasicAuth(r *http.Request) bool {
	users, err := getAdminerUsers()
	if err != nil || len(users) == 0 {
		return false
	}
	auth := r.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(strings.ToUpper(auth), "BASIC ") {
		return false
	}
	payload, err := base64.StdEncoding.DecodeString(strings.TrimSpace(auth[6:]))
	if err != nil {
		return false
	}
	parts := strings.SplitN(string(payload), ":", 2)
	if len(parts) != 2 {
		return false
	}
	username, password := strings.TrimSpace(parts[0]), parts[1]
	hash, ok := users[username]
	if !ok {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// requireAdminerBasic 未通过校验时写 401 并设置 WWW-Authenticate，返回 true 表示已写响应并应终止处理
func requireAdminerBasic(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Basic realm="`+adminerAuthRealm+`"`)
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte("Unauthorized"))
}

// AdminerAuthHandler 在通过 Basic 校验后，将请求转给 PHP 处理 adminer.php
func AdminerAuthHandler(w http.ResponseWriter, r *http.Request) {
	if !verifyAdminerBasicAuth(r) {
		requireAdminerBasic(w)
		return
	}
	adminerPHPHandler.HandleRequest(w, r)
}

// GenerateAdminerPasswdFile 生成或更新 adminer 密码文件中的用户条目
// user 为用户名，filePath 为输出文件路径，password 为明文密码；
// 若 password 为空则从 os.Stdin 读取一行。同一用户已存在则覆盖，否则追加。
func GenerateAdminerPasswdFile(user, filePath, password string) error {
	if user == "" || filePath == "" {
		return util.Errorf("adminer-passwd: user and file path are required")
	}
	if password == "" {
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			password = strings.TrimSpace(scanner.Text())
		}
		if password == "" {
			return util.Errorf("adminer-passwd: password is required (use -adminer-passwd-password or stdin)")
		}
	}
	absPath := filePath
	if !filepath.IsAbs(filePath) {
		absPath = filepath.Join(util.GetRuningDir(), filePath)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	line := user + ":" + string(hash) + "\n"

	// 若文件已存在，则按行读取、替换或追加对应用户后写回
	existing, loadErr := loadAdminerPasswdFile(filePath)
	if loadErr == nil && existing != nil {
		existing[user] = string(hash)
		var lines []string
		for u, h := range existing {
			lines = append(lines, u+":"+h)
		}
		// 保持稳定顺序（按用户名排序便于可读）
		lines = sortAdminerPasswdLines(lines)
		content := strings.Join(lines, "\n") + "\n"
		if err := os.WriteFile(absPath, []byte(content), 0600); err != nil {
			return err
		}
		return nil
	}

	// 文件不存在或路径此前无效：创建或覆盖为单用户
	dir := filepath.Dir(absPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	if err := os.WriteFile(absPath, []byte(line), 0600); err != nil {
		return err
	}
	return nil
}

func sortAdminerPasswdLines(lines []string) []string {
	for i := 0; i < len(lines); i++ {
		for j := i + 1; j < len(lines); j++ {
			if lines[i] > lines[j] {
				lines[i], lines[j] = lines[j], lines[i]
			}
		}
	}
	return lines
}
