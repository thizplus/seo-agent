package dto

import (
	"encoding/json"

	"gorm.io/datatypes"
)

func jsonOrNil(data datatypes.JSON) any {
	if len(data) == 0 {
		return nil
	}
	var result any
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}
	return result
}
