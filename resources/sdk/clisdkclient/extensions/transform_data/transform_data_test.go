package transform_data

import (
	"fmt"
	"testing"
)

// the ConvertJsonToMap() will return either a map[string]interface{} or a []map[string]interface{}
func TestConvertJsonToMap(t *testing.T) {

	jsonObjects := [...]string {
		"{\"name\": \"michael roddy\", \"id\": \"12345\"}",
		"{\"name\": \"michael roddy\", \"id\": \"12345\", \"address\": {\"town\": \"athlone\"}}",
		"{\"name\": \"michael roddy\", \"id\": \"12345\", \"address\": [{\"town\": \"athlone\"}]}",
	}

	arrayOfJsonObjects := [...]string {
		"[{\"name\": \"michael roddy\", \"id\": \"12345\"}]",
		"[{\"name\": \"michael roddy\", \"id\": \"12345\", \"address\": {\"town\": \"athlone\"}}]",
		"[{\"name\": \"michael roddy\", \"id\": \"12345\", \"address\": [{\"town\": \"athlone\"}]}]",
	}

	mapOutputs := [...]map[string]interface{} {
		{"name":  "michael roddy", "id": "12345"},
		{"name":  "michael roddy", "id": "12345", "address": map[string]interface{}{"town": "athlone"}},
		{"name":  "michael roddy", "id": "12345", "address": []map[string]interface{}{{"town": "athlone"}}},
	}

	sliceOfMapOutputs := [...][]map[string]interface{} {
		{{"name": "michael roddy", "id": "12345"}},
		{{"name":  "michael roddy", "id": "12345", "address": map[string]interface{}{"town": "athlone"}}},
		{{"name":  "michael roddy", "id": "12345", "address": []map[string]interface{}{{"town": "athlone"}}}},
	}

	// map[string]interface{} test type
	type testMap struct {
		testNum int
		input string
		expectedOutput map[string]interface{}
	}
	// []map[string]interface{} test type
	type testSliceOfMap struct {
		testNum int
		input string
		expectedOutput []map[string]interface{}
	}

	mapTestCases := []testMap {
		{testNum: 1, input: jsonObjects[0], expectedOutput: mapOutputs[0]},
		{testNum: 2, input: jsonObjects[1], expectedOutput: mapOutputs[1]},
		{testNum: 3, input: jsonObjects[2], expectedOutput: mapOutputs[2]},
	}
	sliceOfMapTestCases := []testSliceOfMap {
		{testNum: 1, input: arrayOfJsonObjects[0], expectedOutput: sliceOfMapOutputs[0]},
		{testNum: 2, input: arrayOfJsonObjects[1], expectedOutput: sliceOfMapOutputs[1]},
		{testNum: 3, input: arrayOfJsonObjects[2], expectedOutput: sliceOfMapOutputs[2]},
	}

	// testing if ConvertJsonToMap() returns a map[string]interface{}
	for _, test := range mapTestCases {
		actualOutput := ConvertJsonToMap(test.input)
		if fmt.Sprint(actualOutput) != fmt.Sprint(test.expectedOutput) {
			t.Errorf("Did not get the right output: expectedOutput: %v, actualOutput: %v", test.expectedOutput, actualOutput)
		}
	}

	// testing if ConvertJsonToMap() returns a []map[string]interface{}
	for _, test := range sliceOfMapTestCases {
		actualOutput := ConvertJsonToMap(test.input)
		if fmt.Sprint(actualOutput) != fmt.Sprint(test.expectedOutput) {
			t.Errorf("Did not get the right output: expectedOutput: %v, actualOutput: %v", test.expectedOutput, actualOutput)
		}
	}

}

func TestProcessTemplateFile(t *testing.T) {

}