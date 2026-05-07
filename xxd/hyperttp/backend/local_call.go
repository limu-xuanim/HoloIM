/**
 * The local_call file of backend current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     backend
 * @link        https://www.xuanim.com
 */
package backend

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"fmt"
	"net/http"
	"strings"
	"xxd/util"
)

// LocalRequestOptions 本地请求选项
type LocalRequestOptions struct {
	ClientIP string
	Referer  string
	Timeout  int // 超时时间（秒）
}

// LocalRequestInfo 本地调用 PHP 代码
func LocalRequestInfo(postData []byte, options *LocalRequestOptions, ranzhiToken []byte) ([]byte, int, error) {
	util.LogDetail(util.GetLang("[LocalRequestInfo]", " ", "post data", ": ")+string(postData), util.ColorLightGreen)

	if postData == nil {
		return nil, 0, util.Errorf("%s", util.GetLang("post data is null"))
	}

	// 如果是加密数据，需要先解密
	var requestData []byte
	if util.Config.EnableAES == 1 && ranzhiToken != nil {
		var err error
		requestData, err = aesDecrypt(postData, ranzhiToken)
		if err != nil {
			util.Log("error", util.GetLang("AES decrypt error in local call: %v"), err)
			return nil, 0, err
		}
	} else {
		requestData = postData
	}

	// 创建 HTTP 请求
	req, err := http.NewRequest("POST", "/x.php", bytes.NewReader(requestData))
	if err != nil {
		util.Log("error", util.GetLang("HTTP new request error: %v"), err)
		return nil, 0, err
	}

	req.Header.Set("Content-type", "text/plain")
	req.Header.Set("User-Agent", "easysoft/xuan.im")
	req.Header.Set("xxd-version", util.Version)

	if options != nil {
		if options.ClientIP != "" {
			req.Header.Set("X-Forwarded-For", options.ClientIP)
		}
		if options.Referer != "" {
			req.Header.Set("Referer", options.Referer)
		}
	}

	// 创建响应写入器
	responseWriter := &localResponseWriter{
		header: make(http.Header),
		buffer: &bytes.Buffer{},
	}

	err = serveFrankenPHP(responseWriter, req, defaultDocumentRoot(), "/xxb", map[string]string{
		// "PATH_INFO":   "/api/v1/im",
		"SCRIPT_NAME": "/x.php",
	})
	if err != nil {
		util.Log("error", util.GetLang("Execute PHP error: %v"), err)
		return nil, 0, err
	}

	// 获取响应内容
	body := responseWriter.buffer.Bytes()
	status := responseWriter.statusCode

	if bytes.HasPrefix(body, []byte("<")) {
		resBytes, errText := util.BeheadErrorResponse(body)
		if errText != "" {
			util.Log("error", util.GetLang("Request body error (handled): %s"), errText)
		}
		body = resBytes
	}

	util.LogDetail(fmt.Sprintf("[frankenphp] Response status: %d body : %s", status, string(body)))

	return body, status, nil
}

// localResponseWriter 用于捕获 frankenphp 的响应
type localResponseWriter struct {
	header     http.Header
	buffer     *bytes.Buffer
	statusCode int
}

func (w *localResponseWriter) Header() http.Header {
	return w.header
}

func (w *localResponseWriter) Write(data []byte) (int, error) {
	if w.buffer == nil {
		w.buffer = &bytes.Buffer{}
	}
	return w.buffer.Write(data)
}

func (w *localResponseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
}

// IsLocalServer 检查服务器地址是否为本地服务器
func IsLocalServer(addr string) bool {
	if addr == "" {
		return false
	}

	// 检查是否为本地地址
	localPrefixes := []string{
		"http://localhost",
		"http://127.0.0.1",
		"https://localhost",
		"https://127.0.0.1",
	}

	for _, prefix := range localPrefixes {
		if strings.HasPrefix(addr, prefix) {
			return true
		}
	}

	return false
}

// aesDecrypt AES 解密函数
func aesDecrypt(crypted, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	blockSize := block.BlockSize()
	cryptedSize := len(crypted)
	if cryptedSize == 0 || cryptedSize%blockSize != 0 {
		readableMessage := util.Asciify(string(crypted))
		errorMessage := util.Pretty(readableMessage)
		util.Log("error", "%s %s%s", util.GetLang("[aesDecrypt] decrypt failed, data:"), errorMessage, "\n")
		decryptError := util.Errorf("%s", util.GetLang("AES decrypt error, Blocks entered are incomplete"))
		if util.StringContains(errorMessage, "license error") {
			decryptError = util.Errorf("%s", util.GetLang("Backend license error"))
		}
		return []byte(readableMessage), decryptError
	}

	blockMode := cipher.NewCBCDecrypter(block, key[:blockSize])
	origData := make([]byte, cryptedSize)
	blockMode.CryptBlocks(origData, crypted)
	origData = pkcs5UnPadding(origData)
	if origData == nil {
		return nil, util.Errorf("%s", "Pkcs5UnPadding error")
	}

	return origData, nil
}

func pkcs5UnPadding(origData []byte) []byte {
	length := len(origData)
	// 去掉最后一个字节 unpadding 次
	unpadding := int(origData[length-1])
	if unpadding > length {
		util.Log("error", "AES unpadding len > data length")
		return nil
	}

	return origData[:(length - unpadding)]
}
