package utils

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

const (
	TypeInteger string = "int"
	TypeString         = "string"
	TypeBoolean        = "bool"
	TypeArray          = "array"
)

var (
	supportedOperators = []string{"==", "!=", "<=", ">=", "<", ">", "contains"}
)

func FilterByRegex(data string, expression string) (string, error) {
	fmt.Printf("Calling FilterByRegex with expression %s\n", expression)
	return data, nil
}

func FilterByCondition(data string, condition string) (string, error) {
	var jsonData interface{}
	err := json.Unmarshal([]byte(data), &jsonData)
	if err != nil {
		return "", err
	}

	// Find operator in condition
	operator := findOperatorInString(condition)
	if operator == "" {
		return "", fmt.Errorf("Could not understand condition: %s\n", condition)
	}

	path, value := getFieldKeyAndValueFromConditionString(condition, operator)
	keys := getKeysFromJsonFieldPath(path)

	var objects []interface{}
	if jsonMap, ok := jsonData.(map[string]interface{}); ok {
		objects = jsonMap["entities"].([]interface{})
	} else if jsonArray, ok := jsonData.([]interface{}); ok {
		objects = jsonArray
	}

	allMatchedObjects, err := findObjectsMatchingCondition(objects, keys, value, operator)
	if err != nil {
		return "", err
	}

	// Convert go data to json byte array
	jsonBytes, err := json.MarshalIndent(allMatchedObjects, "", "  ")
	if err != nil {
		return "", err
	}

	return string(jsonBytes), nil
}

func findObjectsMatchingCondition(returnedObjects []interface{}, keys []string, value string, operator string) ([]interface{}, error) {
	var (
		allMatchedObjects []interface{}
		currentObject     interface{}
	)

	for _, object := range returnedObjects {
		currentObject = object
		for i, k := range keys {
			if currentObjectMap, ok := currentObject.(map[string]interface{}); ok {
				if _, ok := currentObjectMap[k]; !ok {
					return nil, fmt.Errorf("invalid key '%s' in path", k)
				}
				currentObject = currentObjectMap[k]
				if _, ok := currentObject.(map[string]interface{}); ok {
					if i == len(keys)-1 {
						return nil, fmt.Errorf("key '%s' is type map and is incomparable to value: '%s'", k, value)
					}
					continue
				}
			}
			if currentObjectArray, ok := currentObject.([]interface{}); ok {
				for _, c := range currentObjectArray {
					match, err := fieldMatchesValue(c, value, "==")
					if err != nil {
						return nil, err
					}
					if match {
						allMatchedObjects = append(allMatchedObjects, object.(map[string]interface{}))
						break
					}
				}
			} else {
				if i < len(keys)-1 {
					return nil, fmt.Errorf("the value inside field '%s' is a non-map, but it is not the last key in the provided path", k)
				}
				match, err := fieldMatchesValue(currentObject, value, operator)
				if err != nil {
					return nil, err
				}
				if match {
					allMatchedObjects = append(allMatchedObjects, object.(map[string]interface{}))
				}
			}
		}
	}

	return allMatchedObjects, nil
}

func fieldMatchesValue(jsonValue interface{}, cliInputValue string, operator string) (bool, error) {
	if fieldValueStr, ok := jsonValue.(string); ok {
		return compareStrings(fieldValueStr, cliInputValue, operator)
	} else if fieldValueBool, ok := jsonValue.(bool); ok {
		return compareBooleans(fieldValueBool, cliInputValue, operator)
	} else {
		return compareAsIntegers(jsonValue, cliInputValue, operator)
	}
}

func compareStrings(jsonValue string, cliInputValue string, operator string) (bool, error) {
	switch operator {
	case "==":
		return jsonValue == cliInputValue, nil
	case "!=":
		return jsonValue != cliInputValue, nil
	case "contains":
		return strings.Contains(jsonValue, cliInputValue), nil
	default:
		return false, invalidOperatorError(TypeString, operator)
	}
}

func compareAsIntegers(jsonValue interface{}, cliInputValue string, operator string) (bool, error) {
	value1Int, err := strconv.Atoi(fmt.Sprintf("%v", jsonValue))
	if err != nil {
		return false, err
	}
	value2Int, err := strconv.Atoi(cliInputValue)
	if err != nil {
		return false, err
	}
	switch operator {
	case "==":
		return value1Int == value2Int, nil
	case "!=":
		return value1Int != value2Int, nil
	case ">":
		return value1Int > value2Int, nil
	case "<":
		return value1Int < value2Int, nil
	case ">=":
		return value1Int >= value2Int, nil
	case "<=":
		return value1Int <= value2Int, nil
	default:
		return false, invalidOperatorError(TypeInteger, operator)
	}
}

func compareBooleans(jsonValue bool, cliInputValue string, operator string) (bool, error) {
	if cliInputValue != "true" && cliInputValue != "false" {
		return false, fmt.Errorf("'%s' is not boolean. Valid options: true, false", cliInputValue)
	}
	switch operator {
	case "==":
		return fmt.Sprintf("%v", jsonValue) == fmt.Sprintf("%v", cliInputValue), nil
	case "!=":
		return fmt.Sprintf("%v", jsonValue) != fmt.Sprintf("%v", cliInputValue), nil
	default:
		return false, invalidOperatorError(TypeBoolean, operator)
	}
}

func findOperatorInString(text string) string {
	for _, operator := range supportedOperators {
		if strings.Contains(text, operator) {
			return operator
		}
	}
	return ""
}

func getFieldKeyAndValueFromConditionString(condition string, operator string) (string, string) {
	expressionSplit := strings.Split(condition, operator)
	return expressionSplit[0], strings.TrimSpace(expressionSplit[1])
}

func getKeysFromJsonFieldPath(path string) []string {
	var trimmedKeys []string
	keys := strings.Split(path, ".")
	for _, k := range keys {
		if k != "" && k != " " {
			trimmedKeys = append(trimmedKeys, strings.TrimSpace(k))
		}
	}
	return trimmedKeys
}

func invalidOperatorError(valueType string, operator string) error {
	return fmt.Errorf("invalid operator for %s comparison: %s\n", valueType, operator)
}
