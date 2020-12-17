package utils

import (
	"bufio"
	"bytes"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"net/http"
	"io/ioutil"
	"log"
	"os"
	"strconv"
	"strings"
)

func AddFlag(flags *pflag.FlagSet, paramType string, name string, value string, usage string) {
	switch paramType {
	case "[]string":
		flags.StringSlice(name, []string{}, usage)
		break
	case "string":
		flags.String(name, value, usage)
		break
	case "int":
		intValue, _ := strconv.Atoi(value)
		flags.Int(name, intValue, usage)
		break
	case "bool":
		boolValue, _ := strconv.ParseBool(value)
		flags.Bool(name, boolValue, usage)
	}
}

func AddFileFlagIfUpsert(flags *pflag.FlagSet, method string) {
	switch method {
	case http.MethodPatch:
		fallthrough
	case http.MethodPost:
		fallthrough
	case http.MethodPut:
		flags.StringP("file", "f", "", "File name containing the JSON for creating a user object")
	}
}

func GetFlag(flags *pflag.FlagSet, paramType string, name string) string {
	flag := ""
	switch paramType {
	case "[]string":
		flags, _ := flags.GetStringSlice(name)
		flag = strings.Join(flags, ",")
		break
	case "string":
		flag, _ = flags.GetString(name)
		break
	case "int":
		flagInt, _ := flags.GetInt(name)
		flag = strconv.Itoa(flagInt)
		break
	case "bool":
		flagBool, _ := flags.GetBool(name)
		flag = strconv.FormatBool(flagBool)
	}
	return flag
}

func DetermineArgs(args []string) cobra.PositionalArgs {
	validArgs := 0
	for _, arg := range args {
		if arg != "body" {
			validArgs++
		}
	}
	return cobra.ExactArgs(validArgs)
}

func AliasOperationId(operationId string, classVarName string) string {
	return strings.ReplaceAll(operationId, classVarName, "")
}

func ConvertStdInString() string {
	consolescanner := bufio.NewScanner(os.Stdin)
	var inputBuffer bytes.Buffer
	// by default, bufio.Scanner scans newline-separated lines
	for consolescanner.Scan() {
		input := consolescanner.Text()
		inputBuffer.WriteString(input)
	}

	return string(inputBuffer.Bytes())
}

func ConvertFileJSON(fileName string) string {
	jsonFile, err := os.Open(fileName)

	if err != nil {
		log.Fatalf("Unable to open file %s.", fileName, err)
	}

	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()

	fileContent, _ := ioutil.ReadAll(jsonFile)
	return string(fileContent)
}
