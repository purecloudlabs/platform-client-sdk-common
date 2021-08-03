package utils

import (
	"encoding/json"
	"fmt"

	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/data_format"
	"github.com/tidwall/pretty"
	"sigs.k8s.io/yaml"
)

func Render(data string) {
	if data_format.OutputFormat == "json" && IsJSON(data) {
		result := pretty.Pretty([]byte(data))
		fmt.Printf("%s", result)
	}
	if data_format.OutputFormat == "yaml" && IsJSON(data) {
		result, err := yaml.JSONToYAML([]byte(data))
		if err != nil {
			fmt.Printf("err: %v\n\n", err)
			return
		}
		fmt.Println(string(result))
	}
}

func IsJSON(str string) bool {
	var js json.RawMessage
	return json.Unmarshal([]byte(str), &js) == nil
}
