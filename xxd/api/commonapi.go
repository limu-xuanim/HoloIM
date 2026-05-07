/**
 * The commonapi file of api current module of xxd.
 *
 * @copyright   Copyright 2009-now 禅道软件（青岛）有限公司(ZenTao Software (Qingdao) Co., Ltd., www.zentao.net)
 * @license     AGPL-3.0 (https://www.gnu.org/licenses/agpl-3.0.html)
 * @package     api
 * @link        https://www.xuanim.com
 */
package api

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"xxd/util"

	"github.com/davecgh/go-spew/spew"
	"github.com/francoispqt/gojay"
)

// BroadcastUsers is an []int64 of userIDs.
type BroadcastUsers []int64

func (u *BroadcastUsers) UnmarshalJSONArray(dec *gojay.Decoder) error {
	var user int64
	if err := dec.Int64(&user); err != nil {
		return err
	}
	*u = append(*u, user)
	return nil
}

// SwapToken decrypts the data with a token and encrypts it with another token.
func SwapTokenJSON(data []byte, decryptToken []byte, encryptToken []byte) ([]byte, error) {
	decryptData, err := AesDecrypt(data, decryptToken)
	if err != nil {
		util.Log("error", util.GetLang("[SwapToken]", " ", "decrypt error", ": %v"), err)
		return nil, err
	}

	util.LogDetail("[SwapToken] " + string(decryptData))

	encryptData, err := AesEncrypt(decryptData, encryptToken)
	if err != nil {
		util.Log("error", util.GetLang("[SwapToken]", " ", "encrypt error", ": %v"), err)
		return nil, err
	}

	return encryptData, nil
}

// UnparseData encrypts the data into cipher text.
func UnparseData(parseData XxbResponse, token []byte) []byte {
	data, err := AesEncrypt(parseData.JSON, token)
	if err != nil {
		util.Log("error", util.GetLang("[UnparseData]", " ", "encrypt error", ": %v"), err)
		return nil
	}

	return data
}

// ParseJSON parses pure json data.
func ParseJSON(data []byte, token []byte) (util.JSONData, error) {
	parsedJSON := make(util.JSONData)

	if token != nil && util.Config.EnableAES == 1 {
		var err error
		data, err = AesDecrypt(data, token)
		util.LogDetail(util.GetLang("[ParseJSON]", " ") + string(data))
		if err != nil {
			util.Log("error", util.GetLang("[ParseJSON]", " ", "decrypt error", ": %v"), err)
			parsedJSON["error"] = data
			return parsedJSON, err
		}
	}

	if len(data) == 0 {
		util.Log("error", util.GetLang("[ParseJSON]", " ", "Empty response"))
		return parsedJSON, nil
	}

	err := gojay.Unsafe.Unmarshal(data, &parsedJSON)
	if err != nil {
		util.Log("error", util.GetLang("[ParseJSON]", " ", "unmarshal error", ": %v"), err)
		return nil, err
	}
	return parsedJSON, nil
}

// ParseClientRequest parses data from client into XxbResponse.
func ParseClientRequest(data []byte, token []byte) (XxbResponse, error) {
	parseData := NewParseData()

	var decryptData []byte
	var err error
	if util.Config.EnableClientAES == 1 {
		decryptData, err = AesDecrypt(data, token)
	} else {
		decryptData = data
	}
	if err != nil {
		util.Log("error", util.GetLang("[ParseClient]", " ", "decrypt error", ": %v"), err)
		return parseData, err
	}

	serverName, cleanData := ExtractServerName(decryptData)
	method, _ := ExtractMethodCall(cleanData)

	parseData.Method = method
	parseData.Server = serverName
	parseData.JSON = cleanData

	methodString := string(method)

	if methodString == "chattyping" || methodString == "datatransfer" || methodString == "ping" || methodString == "usersubscribe" {
		return parseData, nil
	}

	parsedJson := MapScheme(cleanData).(map[string]any)
	util.LogDetail(util.GetLang("[ParseClient]", " ") + spew.Sdump(parsedJson))

	if rid, ok := parsedJson["rid"]; ok {
		parseData.RID = []byte(rid.(string))
	}

	if method, ok := parsedJson["method"]; ok {
		parseData.Method = []byte(method.(string))
	}

	if device, ok := parsedJson["device"]; ok {
		parseData.Device = []byte(device.(string))
	}

	if lang, ok := parsedJson["lang"]; ok {
		parseData.Lang = []byte(lang.(string))
	}

	if version, ok := parsedJson["version"]; ok {
		parseData.Version = version.(string)
	}

	if userID, ok := parsedJson["userID"]; ok {
		parseData.UserID = int64(userID.(float64))
	}

	return parseData, nil
}

// ParseBackendResponse parses data from backend into XxbResponse.
func ParseBackendResponse(data []byte, token []byte) ([]XxbResponse, error) {
	if util.Config.EnableAES == 1 {
		var err error
		data, err = AesDecrypt(data, token)
		if err != nil {
			util.Log("error", util.GetLang("[ParseBackend]", " ", "decrypt error", ": %v"), err)
			return []XxbResponse{}, err
		}
		if len(data) == 0 {
			return []XxbResponse{}, nil
		}
	}

	responses, err := ExtractParams(data)
	if err != nil {
		util.Log("error", util.GetLang("[ParseBackend]", " ", "extract error", ": %v"), err)
		return responses, err
	}

	return responses, nil
}

// ExtractParams extracts params and json data from impure json string.
func ExtractParams(data []byte) ([]XxbResponse, error) {
	var responses []XxbResponse
	responseStrings := strings.Split(string(data), "\n")
	if len(responseStrings)%2 != 0 {
		return []XxbResponse{}, fmt.Errorf("Invalid response")
	}

	for i, response := range responseStrings {
		if i%2 == 0 {
			var parseData XxbResponse

			reader := strings.NewReader(response)
			dec := gojay.BorrowDecoder(reader)
			err := dec.DecodeArray(&parseData)

			// add fallback broadcast user when value is null.
			if len(parseData.Users) == 0 || (len(parseData.Users) == 1 && parseData.Users[0] == 0) {
				parseData.Users = []int64{parseData.UserID}
			}

			responses = append(responses, parseData)

			if err != nil {
				util.VarDump(data)
				util.Log("error", util.GetLang("[ExtractParams]", " JSON unmarshal 'response' error: %v"), err)
				return []XxbResponse{}, err
			}
			dec.Release()
		} else {
			responses[len(responses)-1].JSON = []byte(response)
		}
	}

	return responses, nil
}

// ExtractMethodCall extracts method name and rid from pure json string.
func ExtractMethodCall(data []byte) (method, rid []byte) {
	extractorRegex := regexp.MustCompile(`^\["(?P<method>[\w/]+)Request[^[]+\["(?P<rid>[\w\-_\.]*?)"`)
	matches := extractorRegex.FindStringSubmatch(string(data))
	matchesMap := make(map[string]string)
	for i, name := range extractorRegex.SubexpNames() {
		if i != 0 {
			matchesMap[name] = matches[i]
		}
	}
	return []byte(matchesMap["method"]), []byte(matchesMap["rid"])
}

// ExtractServerName extracts and removes server name from client requests.
func ExtractServerName(data []byte) ([]byte, []byte) {
	extractorRegex := regexp.MustCompile(`^([\w\d]+)`)
	serverName := extractorRegex.Find(data)
	if serverName == nil {
		return []byte{}, data
	}
	removerRegex := regexp.MustCompile("^" + string(serverName))
	cleanData := removerRegex.ReplaceAll(data, []byte{})
	return serverName, cleanData
}

func ParseParams(parseData XxbResponse) (map[string]any, XxbResponse, error) {
	// 解析出数组
	xxbResponse := NewXxbResponse(parseData)
	parsedJson := MapScheme(parseData.JSON)
	if parsedJson == nil {
		return nil, xxbResponse, fmt.Errorf("parameter error")
	}

	parsedMap, ok := parsedJson.(map[string]any)
	if !ok {
		return nil, xxbResponse, fmt.Errorf("parameter error")
	}
	return parsedMap, xxbResponse, nil
}

func MapScheme(data []byte) any {
	// 将data转为[]any
	var dataArray []any
	if err := json.Unmarshal(data, &dataArray); err != nil {
		util.Log("error", "Failed to unmarshal data: %v", err)
		return nil
	}

	// 验证dataArray格式
	if len(dataArray) < 2 {
		util.Log("error", "Invalid data format: insufficient elements in array")
		return nil
	}

	key, ok := dataArray[0].(string)
	if !ok {
		util.Log("error", "Key is not a string")
		return nil
	}

	params, ok := dataArray[1].([]any)
	if !ok {
		util.Log("error", "Params is not an array")
		return nil
	}

	result, err := util.ApiOptimizer.Decode(params, key, "requestPack")
	if err != nil {
		util.Log("error", "Failed to decode params: %s, error: %v", spew.Sdump(params), err.Error())
		return nil
	}
	return result
}

func ConvertArrayBySchema(key string, data map[string]any) []any {
	// util.LogDetail(fmt.Sprintf("Original data: %v", spew.Sdump(data)), util.ColorLightRed)
	encodeData, err := util.ApiOptimizer.Encode(key, data, "responsePack")
	if err != nil {
		util.LogDetail(fmt.Sprintf("Optimized data error: %s\noriginal data is %s\nkey is %s", err.Error(), spew.Sdump(data), key), util.ColorBgRed)
	}
	return encodeData

}
