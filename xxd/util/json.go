package util

import (
	"encoding/json"

	"github.com/francoispqt/gojay"
	"github.com/wI2L/jettison"
)

// JSONData is an json object.
type JSONData map[string]any

func (jd *JSONData) UnmarshalJSONObject(dec *gojay.Decoder, k string) error {
	var value any
	if err := dec.Interface(&value); err != nil {
		return err
	}
	(*jd)[k] = value
	return nil
}
func (jd *JSONData) NKeys() int {
	return 0
}

// MultiArray is an array of arrays.
type MultiArray []any

func (pd *MultiArray) UnmarshalJSONArray(dec *gojay.Decoder) error {
	var value any
	if err := dec.Interface(&value); err != nil {
		return err
	}
	*pd = append(*pd, value)
	return nil
}

func JSONMarshal(v any) ([]byte, error) {
	return jettison.Marshal(v)
}

func JSONUnmarshal(data []byte) (any, error) {
	var jsonData any
	err := json.Unmarshal(data, &jsonData)
	if err != nil {
		return nil, err
	}
	return jsonData, nil
}
