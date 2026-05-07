package api

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	"github.com/francoispqt/gojay"
)

type ResponseResult string

const (
	ResultSuccess ResponseResult = "success"
	ResultFail    ResponseResult = "fail"
)

// XxbResponse has all required params and a json array string.
type XxbResponse struct {
	Users   BroadcastUsers
	UserID  int64
	RID     []byte
	Method  []byte
	Result  []byte
	Device  []byte
	Lang    []byte
	JSON    []byte
	Server  []byte
	FileID  []byte
	ErrMsg  []byte
	Ip      string
	Version string
}

func (response *XxbResponse) UnmarshalJSONArray(dec *gojay.Decoder) error {
	switch dec.Index() {
	case 0:
		var users BroadcastUsers
		if err := dec.Array(&users); err != nil {
			return err
		}
		response.Users = users
	case 1:
		var userId int64
		if err := dec.Int64(&userId); err != nil {
			return err
		}
		response.UserID = userId
	case 2:
		var method string
		if err := dec.String(&method); err != nil {
			return err
		}
		response.Method = []byte(method)
	case 3:
		var result string
		if err := dec.String(&result); err != nil {
			return err
		}
		response.Result = []byte(result)
	case 4:
		var device string
		if err := dec.String(&device); err != nil {
			return err
		}
		response.Device = []byte(device)
	case 5:
		var lang string
		if err := dec.String(&lang); err != nil {
			return err
		}
		response.Lang = []byte(lang)
	}

	return nil
}

// NewParseData creates a XxbResponse.
func NewParseData() XxbResponse {
	return XxbResponse{}
}

func NewXxbResponse(req XxbResponse) XxbResponse {
	return XxbResponse{
		Users:   []int64{req.UserID},
		UserID:  req.UserID,
		RID:     req.RID,
		Method:  req.Method,
		Result:  []byte("success"),
		Version: req.Version,
		Device:  req.Device,
		Lang:    req.Lang,
		JSON:    []byte{},
		Server:  []byte{},
		FileID:  []byte{},
		ErrMsg:  []byte(""),
	}
}

func DefaultXxbResponse(method string, json string, users []int64) XxbResponse {
	return XxbResponse{
		Users:  users,
		UserID: 0,
		RID:    []byte(""),
		Method: []byte(method),
		Result: []byte("succeess"),
		Device: []byte(""),
		Lang:   []byte(""),
		JSON:   []byte(json),
		Server: []byte{},
		FileID: []byte{},
		ErrMsg: []byte(""),
	}
}

// 失败响应封装
func FailResponse(xxb XxbResponse, err error) ([]XxbResponse, error) {
	method := string(xxb.Method)
	response := map[string]any{
		"result":  ResultFail,
		"message": err.Error(),
		"method":  method,
		"rid":     string(xxb.RID),
	}

	failResponse, err := Format(xxb, response, method+"Response")

	return []XxbResponse{failResponse}, err
}

func Format(res XxbResponse, output map[string]any, method string) (XxbResponse, error) {
	result := fmt.Sprintf("%v", output["result"])
	res.Result = []byte(result)
	if output["result"] == ResultFail {
		if message, ok := output["message"].(string); ok {
			res.ErrMsg = []byte(message)
		}
	}

	// 如果没有method，设置为 string(resp.Method)
	methodValue, ok := output["method"].(string)
	if !ok || methodValue == "" {
		output["method"] = string(res.Method)
	} else {
		res.Method = []byte(methodValue)
	}

	// 设置rid
	if ridValue, ok := output["rid"]; !ok || ridValue == "" {
		output["rid"] = string(res.RID)
	}

	// 设置device
	if deviceValue, ok := output["device"]; !ok || deviceValue == "" {
		output["device"] = string(res.Device)
	}

	// 如果output存在users属性，那么赋值给resp.Users
	if usersValue, ok := output["users"]; ok {
		if users, ok := usersValue.([]int); ok {
			// 将[]int转换为[]int64
			broadcastUsers := make(BroadcastUsers, len(users))
			for i, user := range users {
				broadcastUsers[i] = int64(user)
			}
			res.Users = broadcastUsers
		} else if users, ok := usersValue.([]int64); ok {
			// 如果已经是[]int64，直接转换
			res.Users = BroadcastUsers(users)
		}
	}

	// 需要将map[string]any 转为 []any
	dataArray := ConvertArrayBySchema(method, output)
	jsonWrapper := []any{
		method,
		dataArray,
	}
	// 转换为JSON字节数组
	jsonBytes, err := json.Marshal(jsonWrapper)
	if err != nil {
		// 在实际应用中，你可能需要更好的错误处理
		return XxbResponse{}, err
	}
	res.JSON = jsonBytes

	return res, nil
}

// ToString 使用反射格式化 XxbResponse 结构为简洁的单行日志输出
func (data XxbResponse) ToString() string {
	var parts []string

	v := reflect.ValueOf(data)
	t := reflect.TypeOf(data)

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)
		fieldName := fieldType.Name

		// 跳过零值字段
		if field.IsZero() {
			continue
		}

		var value string
		switch field.Kind() {
		case reflect.Slice:
			if fieldName == "Users" {
				// 处理用户列表
				var users []string
				for j := 0; j < field.Len(); j++ {
					users = append(users, fmt.Sprintf("%v", field.Index(j).Interface()))
				}
				value = fmt.Sprintf("[%s]", strings.Join(users, ", "))
			} else if field.Type().Elem().Kind() == reflect.Uint8 {
				// 处理 []byte 类型字段
				bytes := field.Bytes()
				if len(bytes) > 0 {
					if fieldName == "JSON" {
						// JSON 字段格式化但不换行
						var jsonObj any
						if err := json.Unmarshal(bytes, &jsonObj); err == nil {
							if compactJSON, err := json.Marshal(jsonObj); err == nil {
								value = string(compactJSON)
							} else {
								value = fmt.Sprintf(`"%s"`, string(bytes))
							}
						} else {
							value = fmt.Sprintf(`"%s"`, string(bytes))
						}
					} else {
						value = fmt.Sprintf(`"%s"`, string(bytes))
					}
				}
			}
		case reflect.String:
			str := field.String()
			if str != "" {
				value = fmt.Sprintf(`"%s"`, str)
			}
		case reflect.Int64:
			value = fmt.Sprintf("%d", field.Int())
		default:
			value = fmt.Sprintf("%v", field.Interface())
		}

		if value != "" {
			parts = append(parts, fmt.Sprintf("%s: %s", fieldName, value))
		}
	}

	return fmt.Sprintf("\n%s\n", strings.Join(parts, ", \n"))
}
