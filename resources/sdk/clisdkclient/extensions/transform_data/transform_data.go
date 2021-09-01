package transform_data

import (
	"bytes"
	"encoding/json"
	"text/template"

	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
)

var (
	TemplateFile string
	TemplateStr  string
)

func ConvertJsonToMap(data string) map[string]interface{} {
	var result map[string]interface{}
	err := json.Unmarshal([]byte(data), &result)
	if err != nil {
		logger.Fatalf("Error unmarshalling JSON %v\n", err)
	}
	return result
}

func ProcessTemplateFile(mp map[string]interface{}) string {
	path := []string{TemplateFile}
	tmpl := myMust(template.ParseFiles(path...))
	return process(tmpl, mp)
}

func ProcessTemplateStr(mp map[string]interface{}) string {
	tmpl := myMust(template.New("tmpl").Parse(TemplateStr))
	return process(tmpl, mp)
}

func process(t *template.Template, vars interface{}) string {
	var tmplBytes bytes.Buffer
	err := t.Execute(&tmplBytes, vars)
	if err != nil {
		logger.Fatalf("Error applying parsed template to data object %v\n", err)
	}
	return tmplBytes.String()
}

// myMust() provides the same functionality as https://cs.opensource.google/go/go/+/refs/tags/go1.17:src/text/template/helper.go;l=23;drc=4f1b0a44cb46f3df28f5ef82e5769ebeac1bc493
// but does not "panic" and print the stack trace
// instead it logs and error message and exits the application if the template syntax is not valid
func myMust(t *template.Template, err error) *template.Template {
	if err != nil {
		logger.Fatalf("Error invalid syntax in %v\n", err)
	}
	return t
}
