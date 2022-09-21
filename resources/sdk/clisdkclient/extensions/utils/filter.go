package utils

import (
	"encoding/json"
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"strconv"
	"strings"
)

const (
	TypeInteger string = "int"
	TypeString         = "string"
	TypeBoolean        = "bool"
	TypeArray          = "array"
)

const (
	equalsOperator            string = "=="
	notEqualsOperator                = "!="
	lessThanEqualsOperator           = "<="
	greaterThanEqualsOperator        = ">="
	lessThanOperator                 = "<"
	greaterThanOperator              = ">"
	containsOperator                 = "contains"
)

var (
	supportedOperators = []string{
		equalsOperator,
		notEqualsOperator,
		lessThanEqualsOperator,
		greaterThanEqualsOperator,
		lessThanOperator,
		greaterThanOperator,
		containsOperator,
	}
)

func FilterByRegex(data string, expression string) (string, error) {
	fmt.Printf("Calling FilterByRegex with expression %s\n", expression)
	return data, nil
}

func FilterByCondition(data string, condition string) (string, error) {
	var jsonData interface{}
	err := json.Unmarshal([]byte(data), &jsonData)
	if err != nil {
		return "", fmt.Errorf("error unmarshalling json data: %v", err)
	}

	// Find operator in condition
	operator := findOperatorInString(condition)
	if operator == "" {
		return "", unrecognizedConditionError(condition)
	}

	path, value := getFieldKeyAndValueFromConditionString(condition, operator)
	keys := getKeysFromJsonFieldPath(path)

	var objects []interface{}
	if jsonMap, ok := jsonData.(map[string]interface{}); ok {
		if entitiesArray, ok := jsonMap["entities"].([]interface{}); ok {
			objects = entitiesArray
		} else {
			return "", entitiesArrayNotFoundError()
		}
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
		match             bool
		err               error
	)

	for _, object := range returnedObjects {
		currentObject = object
		for i, k := range keys {
			if currentObjectMap, ok := currentObject.(map[string]interface{}); ok {
				if _, ok := currentObjectMap[k]; !ok {
					logger.Infof("field '%s' not found in current json object", k)
					break
				}
				currentObject = currentObjectMap[k]
				if _, ok := currentObject.(map[string]interface{}); ok {
					if i == len(keys)-1 {
						return nil, incomparableFieldError(k, value)
					}
					continue
				}
			}
			if i < len(keys)-1 {
				return nil, invalidKeyOrderingError(k)
			}
			if currentObjectArray, ok := currentObject.([]interface{}); ok {
				match, err = fieldMatchesValueInArray(currentObjectArray, value, operator)
			} else {
				match, err = fieldMatchesValue(currentObject, value, operator)
			}
			if err != nil {
				return nil, err
			}
			if match {
				allMatchedObjects = append(allMatchedObjects, object.(map[string]interface{}))
			}
		}
	}

	return allMatchedObjects, nil
}

func fieldMatchesValueInArray(jsonArray []interface{}, cliInputValue string, operator string) (bool, error) {
	if operator != containsOperator {
		return false, invalidOperatorError(TypeArray, operator)
	}
	for _, c := range jsonArray {
		match, err := fieldMatchesValue(c, cliInputValue, equalsOperator)
		if err != nil {
			return false, err
		}
		if match {
			return true, nil
		}
	}
	return false, nil
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
	case equalsOperator:
		return jsonValue == cliInputValue, nil
	case notEqualsOperator:
		return jsonValue != cliInputValue, nil
	case containsOperator:
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
	case equalsOperator:
		return value1Int == value2Int, nil
	case notEqualsOperator:
		return value1Int != value2Int, nil
	case greaterThanOperator:
		return value1Int > value2Int, nil
	case lessThanOperator:
		return value1Int < value2Int, nil
	case greaterThanEqualsOperator:
		return value1Int >= value2Int, nil
	case lessThanEqualsOperator:
		return value1Int <= value2Int, nil
	default:
		return false, invalidOperatorError(TypeInteger, operator)
	}
}

func compareBooleans(jsonValue bool, cliInputValue string, operator string) (bool, error) {
	if cliInputValue != "true" && cliInputValue != "false" {
		return false, invalidBooleanValue(cliInputValue)
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

func entitiesArrayNotFoundError() error {
	return fmt.Errorf("could not locate entites array inside response object")
}

func unrecognizedConditionError(condition string) error {
	return fmt.Errorf("could not understand condition: %s\n", condition)
}

func incomparableFieldError(key string, value string) error {
	return fmt.Errorf("key '%s' is incomparable to value: '%s'", key, value)
}

func invalidKeyOrderingError(key string) error {
	return fmt.Errorf("the value inside field '%s' is a non-map, but it is not the last key in the provided path", key)
}

func invalidBooleanValue(value string) error {
	return fmt.Errorf("'%s' is not boolean. Valid options: true, false", value)
}
