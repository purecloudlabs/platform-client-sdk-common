package transform_data

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Masterminds/sprig"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"io/ioutil"
	"log"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"
)

var (
	TemplateFile string
	TemplateStr  string
)

func ConvertJsonToMap(data string) interface{} {
	if data[0] == '[' {
		return convertArrayOfObjectsToMap(data)
	} else {
		return convertObjectToMap(data)
	}
}

func convertObjectToMap(data string) map[string]interface{} {
	var res map[string]interface{}
	err := json.Unmarshal([]byte(data), &res)
	if err != nil {
		logger.Fatalf("Error unmarshalling JSON: %v\n", err)
	}
	return res
}

func convertArrayOfObjectsToMap(data string) []map[string]interface{} {
	var res []map[string]interface{}
	err := json.Unmarshal([]byte(data), &res)
	if err != nil {
		logger.Fatalf("Error unmarshalling JSON: %v\n", err)
	}
	return res
}

func ProcessTemplateFile(mp interface{}) string {
	if strings.Contains(TemplateFile, "github") {
		rawURL := getFullUrlToRawFile(TemplateFile)
		if isValidGitHubURL(rawURL) {
			resp, err := http.Get(rawURL)
			if err != nil {
				logger.Fatalf("Error downloading template file: %v\n", err)
			}

			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				log.Fatal(err)
			}

			TemplateStr = string(body)
			return ProcessTemplateStr(mp)
		} else {
			fmt.Println("The provided GitHub URL may be invalid.")
		}
	}

	path := []string{TemplateFile}
	fileName := filepath.Base(path[0])
	tmpl := handleParse(template.New(fileName).Funcs(sprig.TxtFuncMap()).ParseFiles(path...))
	return process(tmpl, mp)
}

func ProcessTemplateStr(mp interface{}) string {
	tmpl := handleParse(template.New("tmpl").Funcs(sprig.TxtFuncMap()).Parse(TemplateStr))
	return process(tmpl, mp)
}

func process(t *template.Template, vars interface{}) string {
	var tmplBytes bytes.Buffer
	err := t.Execute(&tmplBytes, vars)
	if err != nil {
		logger.Fatalf("Error applying parsed template to data object: %v\n", err)
	}
	return tmplBytes.String()
}

// handleParse() provides similar functionality to Must() from the text/template package
// https://cs.opensource.google/go/go/+/refs/tags/go1.17:src/text/template/helper.go;l=23;drc=4f1b0a44cb46f3df28f5ef82e5769ebeac1bc493
// but does not "panic" and print the stack trace if there is an error, instead it prints an error message and exits the application if the template syntax is not valid
// otherwise, it returns the template
func handleParse(t *template.Template, err error) *template.Template {
	if err != nil {
		logger.Fatalf("Error parsing: %v\n", err)
	}
	return t
}

func isValidGitHubURL(url string) bool {
	matched, _ := regexp.MatchString(`https://raw\.githubusercontent\.com/.+[^/]/.+[^/]/.+[^/]/.+[^/]\.gotmpl`, url)
	return matched
}

func getFullUrlToRawFile(url string) string {
	rawURL := url

	if !strings.Contains(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	if !strings.Contains(rawURL, "raw.githubusercontent.com") {
		rawURL = strings.Replace(rawURL, "github.com", "raw.githubusercontent.com", 1)
		rawURL = strings.Replace(rawURL, "blob/", "", 1)
	}

	return rawURL
}
