package util

import (
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strconv"
	"sync"

	"github.com/davecgh/go-spew/spew"
)

// 支持的 JSON 类型 | Supported json types
type JSONType string

const (
	JSONTypeAny    JSONType = "any"
	JSONTypeString JSONType = "string"
	JSONTypeNumber JSONType = "number"
	JSONTypeBool   JSONType = "boolean"
	JSONTypeObject JSONType = "object"
	JSONTypeArray  JSONType = "array"
)

// 数据类型描述对象 | Data type scheme object
type DataTypeScheme struct {
	SchemeName   string           `json:"_schemeName,omitempty"`
	MapForEncode map[string]any   `json:"_mapForEncode,omitempty"`
	Type         string           `json:"type"`
	Name         string           `json:"name,omitempty"`
	Props        []DataTypeScheme `json:"props,omitempty"`
	Extend       string           `json:"extend,omitempty"`
	ArrType      string           `json:"arrType,omitempty"`
	Default      any              `json:"default,omitempty"`
	Match        string           `json:"match,omitempty"`
	Map          any              `json:"map,omitempty"`
	Required     bool             `json:"required,omitempty"`
}

// 数据定义映射表 | Data mapping scheme
type MappingScheme struct {
	Version          string         `json:"$version"`
	Validation       bool           `json:"$validation,omitempty"`
	EncodeName       bool           `json:"$encodeName,omitempty"`
	OmitDefaultProps bool           `json:"$omitDefaultProps,omitempty"`
	Schemes          map[string]any `json:"-"` // 其他字段动态存储
}

// JSON 数据优化工具类 | JSON optimizer struct
type JSONOptimizer struct {
	mu                  sync.RWMutex
	MappingScheme       map[string]any
	MappingSchemeCache  map[string]DataTypeScheme
	SchemeNamesIndex    []string
	SchemeNamesIndexMap map[string]int
	Identify            string
}

// 内部类型映射 | Internal data mapping scheme
var internalMapScheme = map[string]*DataTypeScheme{
	"string":  {Type: "string"},
	"boolean": {Type: "boolean"},
	"number":  {Type: "number"},
	"array":   {Type: "array"},
	"object":  {Type: "object"},
	"any":     {Type: "any"},
}

/**
 * 将引用的类型描述对象合并到当前目标数据表述对象中，合并后的类型为引用的类型描述对象类型 | Merge target scheme to source scheme
 * @param targetScheme 目标类型描述对象 | Target scheme object
 * @param sourceScheme 要合并到目标类型描述对象中的原始类型描述对象（通常为 `type` 字段自定义的类型描述对象） | Source scheme object
 * @returns 最终合并的数据表述对象 | Final target scheme
 */
func mergeScheme(target, source *DataTypeScheme) *DataTypeScheme {
	merged := *source
	if target != nil {
		if target.Name != "" {
			merged.Name = target.Name
		}
		if len(target.Props) > 0 {
			merged.Props = target.Props
		}
		if target.Extend != "" {
			merged.Extend = target.Extend
		}
		if target.ArrType != "" {
			merged.ArrType = target.ArrType
		}
		if target.Default != nil {
			merged.Default = target.Default
		}
		if target.Match != "" {
			merged.Match = target.Match
		}
		if target.Map != nil {
			merged.Map = target.Map
		}

		if target.MapForEncode != nil {
			merged.MapForEncode = target.MapForEncode
		}

		merged.Required = target.Required
		merged.SchemeName = target.SchemeName
	}
	merged.Type = source.Type
	return &merged
}

/**
 * 将引用的类型描述对象上的所有属性合并到当前目标数据表述对象中 | Extend properties from target scheme to source scheme
 * @param targetScheme 目标类型描述对象 | Target scheme object
 * @param sourceScheme 要继承属性到目标类型描述对象中的原始类型描述对象（通常为 `type` 字段自定义的类型描述对象） | Source scheme object for extend its properties to target scheme object
 */
func extendSchemeProps(target, source *DataTypeScheme) *DataTypeScheme {
	if len(source.Props) == 0 || len(target.Props) == 0 {
		return target
	}
	sourcesNameMap := map[string]int{}
	mergedProps := []DataTypeScheme{}
	for i, prop := range source.Props {
		sourcesNameMap[prop.Name] = i
		mergedProps = append(mergedProps, prop)
	}
	for _, prop := range target.Props {
		if idx, ok := sourcesNameMap[prop.Name]; ok {
			mergedProps[idx] = prop
		} else {
			mergedProps = append(mergedProps, prop)
		}
	}
	target.Props = mergedProps
	return target
}

// 获取特殊值索引 | Get special value index by given scheme object
func getSpecialValueIndex(mapVal any, value any) any {
	valueStr := value
	if reflect.TypeOf(value).Kind() == reflect.Struct || reflect.TypeOf(value).Kind() == reflect.Map {
		b, _ := json.Marshal(value)
		valueStr = string(b)
	}
	switch m := mapVal.(type) {
	case []any:
		for i, v := range m {
			if v == valueStr {
				return i
			}
		}
	case map[string]any:
		for k, v := range m {
			if v == valueStr {
				num, err := strconv.Atoi(k)
				if err != nil {
					return k
				}
				return num
			}
		}
	}
	return nil
}

func getSpecialValue(mapVal map[string]any, value any) any {
	index := fmt.Sprintf("%v", value)
	if _, ok := mapVal[index]; ok {
		return mapVal[index]
	}
	return value
}

// 构造函数 | Create a JSON optimizer instance
func NewJSONOptimizer() *JSONOptimizer {
	apiSchema := GetApiSchema()
	return &JSONOptimizer{
		MappingScheme:       apiSchema,
		MappingSchemeCache:  make(map[string]DataTypeScheme),
		SchemeNamesIndexMap: make(map[string]int),
	}
}

func (jo *JSONOptimizer) formatDataSchema(schema DataTypeScheme, name string) (DataTypeScheme, error) {

	// 设置默认名称 | Set default name if undefined
	schema.SchemeName = name
	// 如果描述对象的数据类型不是内置的 JSON 类型则获取自定义类型并和当前类型描述进行合并 | Merge mapping scheme if the data type scheme object is not a built-in JSON type
	if _, ok := internalMapScheme[schema.Type]; !ok || name != schema.Type {
		source, err := jo.GetDataScheme(schema.Type)
		if err != nil {
			return DataTypeScheme{}, fmt.Errorf("scheme mapping object of data type '%s' is not found", schema.Type)
		}
		schema = *mergeScheme(&schema, &source)
	}
	// 扩展属性
	if schema.Extend != "" {
		extendSource, err := jo.GetDataScheme(schema.Extend)
		if err != nil {
			return DataTypeScheme{}, fmt.Errorf("extend scheme mapping object of data type '%s' is not found", schema.Extend)
		}
		schema = *extendSchemeProps(&schema, &extendSource)
	}
	// 尝试格式化特殊值映射 | Try to format scheme map
	if schema.Map != nil {
		mapEncode := map[string]any{}
		if reflect.TypeOf(schema.Map).Kind() == reflect.Slice {
			mapArr, ok := schema.Map.([]any)
			if ok {
				for i, v := range mapArr {
					mapEncode[fmt.Sprintf("%d", i)] = v
				}
			}
		} else {
			mapEncode = schema.Map.(map[string]any)
		}
		schema.Map = nil
		schema.MapForEncode = mapEncode
	}
	// 格式化属性描述数组 | Format properties scheme array
	if len(schema.Props) > 0 {
		formatedProps := []DataTypeScheme{}
		for _, prop := range schema.Props {
			propSchema, err := jo.formatDataSchema(prop, fmt.Sprintf("%s.%s", name, prop.Name))
			if err != nil {
				return DataTypeScheme{}, err
			}
			propTypeSchema, err := jo.GetDataScheme(propSchema.Type)
			if err != nil {
				return DataTypeScheme{}, fmt.Errorf("scheme mapping object of data type '%s' is not found", propSchema.Type)
			}
			propSchema = *mergeScheme(&propSchema, &propTypeSchema)
			formatedProps = append(formatedProps, propSchema)
		}
		schema.Props = formatedProps
	}

	return schema, nil
}

// 获取指定名称的类型描述对象 | Get data type scheme object by given name
func (jo *JSONOptimizer) GetDataScheme(name string, fallbackName ...string) (DataTypeScheme, error) {
	jo.mu.RLock()
	scheme, ok := jo.MappingSchemeCache[name]
	jo.mu.RUnlock()
	if ok {
		return scheme, nil
	}

	jo.mu.RLock()
	raw, ok := jo.MappingScheme[name]
	jo.mu.RUnlock()
	if !ok && len(fallbackName) > 0 {
		jo.mu.RLock()
		raw, ok = jo.MappingScheme[fallbackName[0]]
		jo.mu.RUnlock()
	}
	// 如果外部 schema 没有，再查内置类型
	if !ok {
		raw, ok = internalMapScheme[name]
		if !ok {
			return DataTypeScheme{}, fmt.Errorf("data type scheme '%s' not found", name)
		}
	}
	// 反序列化为 DataTypeScheme
	b, _ := json.Marshal(raw)
	var schema DataTypeScheme
	_ = json.Unmarshal(b, &schema)
	schema, err := jo.formatDataSchema(schema, name)
	if err != nil {
		Log("error", fmt.Sprintf("formatDataSchema error: %s", err.Error()))
		return DataTypeScheme{}, err
	}

	jo.mu.Lock()
	jo.MappingSchemeCache[name] = schema
	jo.mu.Unlock()
	return schema, nil
}

// 根据名称索引获取类型描述名称 | Get type scheme name by index
func (jo *JSONOptimizer) GetSchemeNameByIndex(index int) string {
	jo.mu.Lock()
	if len(jo.SchemeNamesIndex) == 0 {
		for k := range jo.MappingScheme {
			jo.SchemeNamesIndex = append(jo.SchemeNamesIndex, k)
		}
		sort.Strings(jo.SchemeNamesIndex)
	}
	var name string
	if index >= 0 && index < len(jo.SchemeNamesIndex) {
		name = jo.SchemeNamesIndex[index]
	}
	jo.mu.Unlock()
	return name
}

// 根据类型描述名称获取索引 | Get type scheme index by name
func (jo *JSONOptimizer) GetSchemeIndexByName(name string) int {
	jo.mu.Lock()
	if len(jo.SchemeNamesIndexMap) == 0 {
		jo.GetSchemeNameByIndex(0)
		for i, n := range jo.SchemeNamesIndex {
			jo.SchemeNamesIndexMap[n] = i
		}
	}
	idx := jo.SchemeNamesIndexMap[name]
	jo.mu.Unlock()
	return idx
}

// 编码 | Compress JSON data with data type scheme
func (jo *JSONOptimizer) encodeWithScheme(scheme DataTypeScheme, data any) (any, error) {
	// LogDetail(fmt.Sprintf("encodeWithScheme scheme: %v", spew.Sdump(scheme)), ColorLightYellow)
	// LogDetail(fmt.Sprintf("encodeWithScheme data: %v", spew.Sdump(data)), ColorLightGreen)
	value := data
	if value == nil || value == "" {
		value = scheme.Default
	}
	// 不支持 Date 类型
	if reflect.TypeOf(data) != nil && reflect.TypeOf(data).String() == "time.Time" {
		return nil, fmt.Errorf("date type is not supported in scheme '%s'", scheme.SchemeName)
	}
	// 特殊值映射
	if scheme.MapForEncode != nil {
		idx := getSpecialValueIndex(scheme.MapForEncode, value)
		if idx != nil {
			return idx, nil
		}
		return value, nil
	}

	schemeType := scheme.Type
	if scheme.ArrType != "" {
		schemeType = "array"
	}

	if value != nil {
		typ := JSONType(schemeType)
		switch typ {
		case JSONTypeObject:
			if len(scheme.Props) == 0 {
				return nil, fmt.Errorf("schema %v props is empty", spew.Sdump(scheme))
			}
			m, ok := value.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("schema %v value %v  value must be map[string]any actual is %s", spew.Sdump(scheme), spew.Sdump(value), reflect.TypeOf(value).String())
			}
			objectPropValues := []any{}
			for _, propScheme := range scheme.Props {
				propValue := m[propScheme.Name]
				propEncodedValue, err := jo.encodeWithScheme(propScheme, propValue)
				if err != nil {
					return nil, err
				}
				objectPropValues = append(objectPropValues, propEncodedValue)
			}
			return objectPropValues, nil
		case JSONTypeArray:
			// 判断 value是否为slice
			if reflect.TypeOf(value).Kind() != reflect.Slice {
				return nil, fmt.Errorf("schema %v value %v must be slice actual is %s, original value is %s", scheme, value, reflect.TypeOf(value).String(), spew.Sdump(value))
			}
			// 通用转换为 []any
			v := reflect.ValueOf(value)
			arr := make([]any, v.Len())
			for i := 0; i < v.Len(); i++ {
				arr[i] = v.Index(i).Interface()
			}
			if scheme.ArrType == "" {
				return nil, fmt.Errorf("array type scheme arrType is empty")
			}
			arrayTypeScheme, err := jo.GetDataScheme(scheme.ArrType)
			if err != nil {
				return nil, fmt.Errorf("array type scheme not found")
			}
			arryValues := make([]any, len(arr))
			for i, item := range arr {
				v, err := jo.encodeWithScheme(arrayTypeScheme, item)
				if err != nil {
					return nil, err
				}
				arryValues[i] = v
			}
			return arryValues, nil
		case JSONTypeString:
			if reflect.TypeOf(value).Kind() != reflect.String {
				return fmt.Sprintf("%v", value), nil
			}
		case JSONTypeNumber:
			// 转为int, 首先判断是否为数值类型，如果不是，尝试强转
			if reflect.TypeOf(value).Kind() != reflect.Float64 && reflect.TypeOf(value).Kind() != reflect.Int && reflect.TypeOf(value).Kind() != reflect.Int64 {
				// 如果是字符串类型，尝试强转
				if reflect.TypeOf(value).Kind() == reflect.String {
					// 使用反射安全地获取字符串值
					strValue := reflect.ValueOf(value).String()
					num, err := strconv.ParseInt(strValue, 10, 64)
					if err != nil {
						return num, nil
					}
				}
			}
		case JSONTypeBool:
			// 转为bool， 首先判断是否为bool类型，如果不是，尝试强转
			if reflect.TypeOf(value).Kind() != reflect.Bool {
				// 使用反射安全地获取字符串值
				strValue := reflect.ValueOf(value).String()
				if strValue == "1" {
					return true, nil
				} else {
					return false, nil
				}
			}
			return value, nil
		case JSONTypeAny:
			return value, nil
		}
	}
	return value, nil
}

// 解码 | Decode data by given name
func (jo *JSONOptimizer) decodeWithScheme(scheme DataTypeScheme, data any) (any, error) {
	value := data

	schemeType := scheme.Type
	if scheme.ArrType != "" {
		schemeType = "array"
	}

	// 特殊值映射
	if scheme.MapForEncode != nil {
		index := getSpecialValue(scheme.MapForEncode, value)
		if index != nil {
			return index, nil
		}
	}

	if value != nil {
		typ := JSONType(schemeType)
		switch typ {
		case JSONTypeObject:
			arr, ok := value.([]any)
			if !ok {
				return nil, fmt.Errorf("encoded data must be array for object scheme")
			}
			if len(scheme.Props) == 0 {
				return nil, fmt.Errorf("properties scheme array is empty in data type scheme")
			}
			object := map[string]any{}
			for i, propScheme := range scheme.Props {
				if i < len(arr) {
					v, err := jo.decodeWithScheme(propScheme, arr[i])
					if err != nil {
						return nil, err
					}
					object[propScheme.Name] = v
				}
			}
			return object, nil
		case JSONTypeArray:
			arr, ok := value.([]any)
			if !ok {
				return nil, fmt.Errorf("encoded data must be array for array scheme")
			}
			if scheme.ArrType == "" {
				return nil, fmt.Errorf("array type scheme arrType is empty")
			}
			arrayTypeScheme, err := jo.GetDataScheme(scheme.ArrType)
			if err != nil {
				return nil, fmt.Errorf("array type scheme not found")
			}
			result := make([]any, len(arr))
			for i, item := range arr {
				v, err := jo.decodeWithScheme(arrayTypeScheme, item)
				if err != nil {
					return nil, err
				}
				result[i] = v
			}
			return result, nil
		case JSONTypeBool:
			if reflect.TypeOf(value).Kind() != reflect.Bool {
				return scheme.Default, nil
			}
		case JSONTypeNumber:
			kind := reflect.TypeOf(value).Kind()
			if kind != reflect.Float64 && kind != reflect.Int && kind != reflect.Int64 {
				return scheme.Default, nil
			}
		case JSONTypeString:
			if reflect.TypeOf(value).Kind() != reflect.String {
				return fmt.Sprintf("%v", value), nil
			}
		}
	}
	return value, nil
}

// 对 JSON 数据进行编码操作 | Compress JSON data by given name
func (jo *JSONOptimizer) Encode(name string, data any, fallbackName ...string) ([]any, error) {
	scheme, err := jo.GetDataScheme(name, fallbackName...)
	if err != nil {
		return nil, fmt.Errorf("scheme mapping object of data type '%s' is not found", name)
	}
	encodedData, err := jo.encodeWithScheme(scheme, data)
	// LogDetail(fmt.Sprintf("encodedData: %v", spew.Sdump(encodedData)), ColorLightCyan)
	if err != nil {
		return nil, err
	}
	return encodedData.([]any), nil
}

// 对编码后的数据进行还原为原始的 JSON 数据 | Decode data by given name
func (jo *JSONOptimizer) Decode(data any, name string, fallbackName ...string) (any, error) {
	if name == "" {
		return nil, fmt.Errorf("data type name is required")
	}
	scheme, err := jo.GetDataScheme(name, fallbackName...)
	if err != nil {
		return nil, fmt.Errorf("scheme mapping object of data type '%s' is not found", name)
	}
	decodeData, err := jo.decodeWithScheme(scheme, data)
	if err != nil {
		return nil, err
	}
	return decodeData, nil
}
