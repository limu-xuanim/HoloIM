package wsocket

import (
	"encoding/json"
	"fmt"
	"xxd/api"
	"xxd/util"
)

type pingRequest struct {
	RID string
}

type chatTypingRequest struct {
	RID          string
	CGID         string
	TargetUserID int64
	Typing       bool
	UserID       int64
}

type dataTransferRequest struct {
	CGID         string
	TargetUserID int64
	Data         string
	UserID       int64
}

type userSubscribeRequest struct {
	RID           string
	SubscribeType string
	Objects       []int64
}

type pingResponse struct {
	Method string             `json:"method"`
	Result api.ResponseResult `json:"result"`
	RID    string             `json:"rid"`
}

type chatTypingResponse struct {
	Module string                  `json:"module"`
	Method string                  `json:"method"`
	Result api.ResponseResult      `json:"result"`
	Data   chatTypingResponseData  `json:"data"`
}

type chatTypingResponseData struct {
	CGID   string `json:"cgid"`
	Typing bool   `json:"typing"`
	UserID int64  `json:"user"`
}

type dataTransferResponse struct {
	Module string                    `json:"module"`
	Method string                    `json:"method"`
	Result api.ResponseResult        `json:"result"`
	Data   dataTransferResponseData  `json:"data"`
}

type dataTransferResponseData struct {
	CGID   string `json:"cgid"`
	Data   string `json:"data"`
	UserID int64  `json:"userID"`
}

type userSubscribeResponse struct {
	RID           string
	Method        string
	Module        string
	SubscribeType string
	Result        api.ResponseResult
	Message       string
}

func (r userSubscribeResponse) MarshalJSON() ([]byte, error) {
	return json.Marshal([]any{
		"usersubscribeResponse",
		[]any{r.RID, r.Method, r.Module, r.SubscribeType, r.Result, r.Message},
	})
}

func decodePingRequest(data []byte) (pingRequest, error) {
	_, payload, err := decodeClientProtocolEnvelope(data)
	if err != nil {
		return pingRequest{}, err
	}

	items, err := getPayloadItems(payload)
	if err != nil {
		return pingRequest{}, err
	}
	rid, err := getStringAt(items, 0, "rid")
	if err != nil {
		return pingRequest{}, err
	}

	return pingRequest{RID: rid}, nil
}

func decodeChatTypingRequest(data []byte) (chatTypingRequest, error) {
	_, payload, err := decodeClientProtocolEnvelope(data)
	if err != nil {
		return chatTypingRequest{}, err
	}

	items, err := getPayloadItems(payload)
	if err != nil {
		return chatTypingRequest{}, err
	}
	rid, err := getStringAt(items, 0, "rid")
	if err != nil {
		return chatTypingRequest{}, err
	}
	cgid, err := getStringAt(items, 1, "cgid")
	if err != nil {
		return chatTypingRequest{}, err
	}
	targetUserID, err := getSingleInt64At(items, 2, "users")
	if err != nil {
		return chatTypingRequest{}, err
	}
	typing, err := getBoolAt(items, 3, "typing")
	if err != nil {
		return chatTypingRequest{}, err
	}
	userID, err := getInt64At(items, 4, "userID")
	if err != nil {
		return chatTypingRequest{}, err
	}

	return chatTypingRequest{
		RID:          rid,
		CGID:         cgid,
		TargetUserID: targetUserID,
		Typing:       typing,
		UserID:       userID,
	}, nil
}

func decodeDataTransferRequest(data []byte) (dataTransferRequest, error) {
	_, payload, err := decodeClientProtocolEnvelope(data)
	if err != nil {
		return dataTransferRequest{}, err
	}

	payloadMap, err := unwrapDataTransferPayload(payload)
	if err != nil {
		return dataTransferRequest{}, err
	}

	cgid, err := getStringField(payloadMap, "cgid")
	if err != nil {
		return dataTransferRequest{}, err
	}
	targetUserID, err := getInt64Field(payloadMap, "user")
	if err != nil {
		return dataTransferRequest{}, err
	}
	transferData, err := getStringField(payloadMap, "data")
	if err != nil {
		return dataTransferRequest{}, err
	}
	userID, err := getInt64Field(payloadMap, "userID")
	if err != nil {
		return dataTransferRequest{}, err
	}

	return dataTransferRequest{
		CGID:         cgid,
		TargetUserID: targetUserID,
		Data:         transferData,
		UserID:       userID,
	}, nil
}

func decodeUserSubscribeRequest(data []byte) (userSubscribeRequest, error) {
	_, payload, err := decodeClientProtocolEnvelope(data)
	if err != nil {
		return userSubscribeRequest{}, err
	}

	items, err := getPayloadItems(payload)
	if err != nil {
		return userSubscribeRequest{}, err
	}
	rid, err := getStringAt(items, 0, "rid")
	if err != nil {
		return userSubscribeRequest{}, err
	}
	subscribeType, err := getStringAt(items, 1, "type")
	if err != nil {
		return userSubscribeRequest{}, err
	}
	objects, err := getInt64SliceAt(items, 2, "objects")
	if err != nil {
		return userSubscribeRequest{}, err
	}

	return userSubscribeRequest{
		RID:           rid,
		SubscribeType: subscribeType,
		Objects:       objects,
	}, nil
}

func decodeClientProtocolEnvelope(data []byte) (string, any, error) {
	raw, err := util.JSONUnmarshal(data)
	if err != nil {
		return "", nil, err
	}

	requestEnvelope, ok := raw.([]any)
	if !ok || len(requestEnvelope) < 2 {
		return "", nil, fmt.Errorf("invalid client protocol request")
	}

	requestName, ok := requestEnvelope[0].(string)
	if !ok || requestName == "" {
		return "", nil, fmt.Errorf("invalid client protocol request name")
	}

	return requestName, requestEnvelope[1], nil
}

func getPayloadItems(payload any) ([]any, error) {
	items, ok := payload.([]any)
	if !ok {
		return nil, fmt.Errorf("client protocol payload is not an array")
	}
	return items, nil
}

func unwrapDataTransferPayload(payload any) (map[string]any, error) {
	if payloadMap, ok := payload.(map[string]any); ok && hasDataTransferFields(payloadMap) {
		return payloadMap, nil
	}

	items, ok := payload.([]any)
	if !ok {
		return nil, fmt.Errorf("datatransfer request payload is invalid")
	}

	for _, item := range items {
		payloadMap, ok := item.(map[string]any)
		if ok && hasDataTransferFields(payloadMap) {
			return payloadMap, nil
		}
	}

	return nil, fmt.Errorf("datatransfer request payload not found")
}

func hasDataTransferFields(payload map[string]any) bool {
	_, hasCGID := payload["cgid"]
	_, hasUser := payload["user"]
	_, hasData := payload["data"]
	_, hasUserID := payload["userID"]
	return hasCGID && hasUser && hasData && hasUserID
}

func getStringField(data map[string]any, key string) (string, error) {
	value, ok := data[key]
	if !ok {
		return "", fmt.Errorf("missing %s in client protocol request", key)
	}

	str, err := util.AnyToString(value)
	if err != nil {
		return "", fmt.Errorf("invalid %s in client protocol request: %w", key, err)
	}

	return str, nil
}

func getBoolField(data map[string]any, key string) (bool, error) {
	value, ok := data[key]
	if !ok {
		return false, fmt.Errorf("missing %s in client protocol request", key)
	}

	boolean, err := util.AnyToBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s in client protocol request: %w", key, err)
	}

	return boolean, nil
}

func getInt64Field(data map[string]any, key string) (int64, error) {
	value, ok := data[key]
	if !ok {
		return 0, fmt.Errorf("missing %s in client protocol request", key)
	}

	number, err := util.AnyToInt64(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s in client protocol request: %w", key, err)
	}

	return number, nil
}

func getStringAt(items []any, index int, field string) (string, error) {
	value, err := getItemAt(items, index, field)
	if err != nil {
		return "", err
	}

	str, err := util.AnyToString(value)
	if err != nil {
		return "", fmt.Errorf("invalid %s in client protocol request: %w", field, err)
	}

	return str, nil
}

func getBoolAt(items []any, index int, field string) (bool, error) {
	value, err := getItemAt(items, index, field)
	if err != nil {
		return false, err
	}

	boolean, err := util.AnyToBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
	}

	return boolean, nil
}

func getInt64At(items []any, index int, field string) (int64, error) {
	value, err := getItemAt(items, index, field)
	if err != nil {
		return 0, err
	}

	number, err := util.AnyToInt64(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
	}

	return number, nil
}

func getSingleInt64At(items []any, index int, field string) (int64, error) {
	value, err := getItemAt(items, index, field)
	if err != nil {
		return 0, err
	}

	if innerItems, ok := value.([]any); ok {
		if len(innerItems) == 0 {
			return 0, fmt.Errorf("empty %s in client protocol request", field)
		}
		number, err := util.AnyToInt64(innerItems[0])
		if err != nil {
			return 0, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
		}
		return number, nil
	}

	number, err := util.AnyToInt64(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
	}

	return number, nil
}

func getInt64SliceAt(items []any, index int, field string) ([]int64, error) {
	value, err := getItemAt(items, index, field)
	if err != nil {
		return nil, err
	}

	if innerItems, ok := value.([]any); ok {
		numbers, err := util.AnySliceToInt64Slice(innerItems)
		if err != nil {
			return nil, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
		}
		return numbers, nil
	}

	number, err := util.AnyToInt64(value)
	if err != nil {
		return nil, fmt.Errorf("invalid %s in client protocol request: %w", field, err)
	}

	return []int64{number}, nil
}

func getItemAt(items []any, index int, field string) (any, error) {
	if index >= len(items) {
		return nil, fmt.Errorf("missing %s in client protocol request", field)
	}
	return items[index], nil
}

func buildClientProtocolMessage(parseData api.XxbResponse, payload any) ([]byte, error) {
	responseJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	parseData.JSON = responseJSON
	if util.Config.EnableClientAES == 1 {
		return api.UnparseData(parseData, util.Token), nil
	}

	return parseData.JSON, nil
}
