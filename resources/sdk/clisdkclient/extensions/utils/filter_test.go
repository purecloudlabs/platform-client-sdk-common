package utils

import (
	"fmt"
	"github.com/google/uuid"
	"strings"
	"testing"
)

const (
	trueValue  = "true"
	falseValue = "false"
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
	object1Id           = uuid.NewString()
	object1Name         = "Charlie C"
	object1Active       = trueValue
	object1DivisionName = "Home"
	object1Version      = "3"
	object1             = fmt.Sprintf(`
	{
		"id": "%s",
		"name": "%s",
		"active": %s,
		"division": {
			"name": "%s"
		},
		"version": %s,
		"skills": ["Sonic Speed", "Invisibility"]
	}
`, object1Id, object1Name, object1Active, object1DivisionName, object1Version)

	object2Id           = uuid.NewString()
	object2Name         = "Darragh McD"
	object2Active       = falseValue
	object2DivisionName = "New"
	object2Version      = "6"
	object2             = fmt.Sprintf(`
	{	
		"id": "%s",
		"name": "%s",
		"active": %s,
		"division": {
			"name": "%s"
		},
		"version": %s,
		"skills": ["Flight", "Knitting"]
	}
`, object2Id, object2Name, object2Active, object2DivisionName, object2Version)

	jsonTestCaseBasic = fmt.Sprintf(`
[
	%s,
	%s
]`, object1, object2)
)

func TestFilterByConditionEquals(t *testing.T) {
	err := testFilterByConditionWithEqualsOperator(equalsOperator)
	if err != nil {
		t.Errorf("ERROR: %v", err)
	}

	err = testFilterByConditionWithEqualsOperator(notEqualsOperator)
	if err != nil {
		t.Errorf("ERROR: %v", err)
	}
}

func testFilterByConditionWithEqualsOperator(operator string) error {
	var (
		condition    string
		err          error
		expectedId   string
		unexpectedId string
	)

	if operator == equalsOperator {
		expectedId = object1Id
		unexpectedId = object2
	} else if operator == notEqualsOperator {
		expectedId = object2Id
		unexpectedId = object1Id
	} else {
		return fmt.Errorf("only types %s and %s should be passed to function testFilterByConditionWithEqualsOperator", expectedId, unexpectedId)
	}

	// Filter by bool field
	condition = fmt.Sprintf("active%s%s", operator, object1Active)
	err = verifyValueReturnedWithCondition(jsonTestCaseBasic, condition, expectedId, unexpectedId)
	if err != nil {
		return err
	}

	// Filter by string field
	condition = fmt.Sprintf("name%s%s", operator, object1Name)
	err = verifyValueReturnedWithCondition(jsonTestCaseBasic, condition, expectedId, unexpectedId)
	if err != nil {
		return err
	}
	// Filter by nested string field
	condition = fmt.Sprintf("division.name%s%s", operator, object1DivisionName)
	err = verifyValueReturnedWithCondition(jsonTestCaseBasic, condition, expectedId, unexpectedId)
	if err != nil {
		return err
	}

	// Filter by int field
	condition = fmt.Sprintf("version%s%s", operator, object1Version)
	err = verifyValueReturnedWithCondition(jsonTestCaseBasic, condition, expectedId, unexpectedId)
	if err != nil {
		return err
	}

	return nil
}

func verifyValueReturnedWithCondition(data string, condition string, expectedValue string, notExpectedValue string) error {
	result, err := FilterByCondition(data, condition)
	if err != nil {
		return err
	}
	if !strings.Contains(result, expectedValue) {
		return fmt.Errorf("wrong json object returned. Expected to find value: '%s' with condition '%s'\nReceived:\n%s\n", expectedValue, condition, result)
	}
	if strings.Contains(result, notExpectedValue) {
		return fmt.Errorf("wrong json object returned. Did not expect to find value: '%s' with condition '%s'\nReceived:\n%s\n", notExpectedValue, condition, result)
	}
	return nil
}

func operatorIsSuitableForBoolFields(operator string) bool {
	return operator == equalsOperator || operator == notEqualsOperator
}

func operatorIsSuitableForStringFields(operator string) bool {
	return operator == equalsOperator || operator == notEqualsOperator || operator == containsOperator
}

func operatorIsSuitableForIntegers(operator string) bool {
	return operator != containsOperator
}
