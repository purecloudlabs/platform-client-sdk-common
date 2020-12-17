package services

import (
	"encoding/json"
	"fmt"
	"gc/config"
	"gc/models"
	"gc/restclient"
	"gc/utils"
	"log"
	"net/http"
	"strings"

	"github.com/spf13/cobra"
)

type CommandService interface {
	Get(*cobra.Command, string) string
	List(*cobra.Command, string) string
	Post(*cobra.Command, string, bool) string
	Patch(*cobra.Command, string) string
	Put(*cobra.Command, string) string
	Delete(*cobra.Command, string) string
	Upsert(string, *cobra.Command, string, bool) string
}

type commandService struct{}

func NewCommandService() *commandService {
	return &commandService{}
}

func (this *commandService) Get(cmd *cobra.Command, uri string) string {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	config := config.GetConfig(profileName)
	restClient := restclient.NewRESTClient(*config)

	response := restClient.Get(uri)
	return response
}

func (this *commandService) List(cmd *cobra.Command, uri string) string {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	config := config.GetConfig(profileName)

	restClient := restclient.NewRESTClient(*config)

	//Looks up first page
	data := restClient.Get(uri)

	firstPage := &models.Entities{}
	json.Unmarshal([]byte(data), firstPage)

	//Allocate the total results based on the page count
	totalResults := make([]string, len(firstPage.Entities))

	//Appends the individual records from Entities into the array
	for _, val := range firstPage.Entities {
		totalResults = append(totalResults, string(val))
	}

	// //Looks up the rest of the pages
	if firstPage.PageCount > 1 {
		for x := 2; x <= firstPage.PageCount; x++ {

			pagedURI := fmt.Sprintf("%s?pageNumber=%d", uri, x)
			pageData := &models.Entities{}
			data := restClient.Get(pagedURI)
			json.Unmarshal([]byte(data), pageData)

			for _, val := range pageData.Entities {
				totalResults = append(totalResults, string(val))
			}
		}
	}

	//Convert the data into one big string
	finalJSONString := fmt.Sprintf("[%s]", strings.Join(totalResults, ","))
	return finalJSONString
}

func (this *commandService) Post(cmd *cobra.Command, uri string, ignoreBody bool) string {
	return this.Upsert(http.MethodPost, cmd, uri, true)
}

func (this *commandService) Patch(cmd *cobra.Command, uri string) string {
	return this.Upsert(http.MethodPatch, cmd, uri, false)
}

func (this *commandService) Put(cmd *cobra.Command, uri string) string {
	return this.Upsert(http.MethodPut, cmd, uri, false)
}

func (this *commandService) Delete(cmd *cobra.Command, uri string) string {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	config := config.GetConfig(profileName)
	restclient := restclient.NewRESTClient(*config)

	return restclient.Delete(uri)
}

func (this *commandService) Upsert(method string, cmd *cobra.Command, uri string, ignoreBody bool) string {
	fmt.Println("Upsert", method)
	profileName, _ := cmd.Root().Flags().GetString("profile")
	fileName, _ := cmd.Flags().GetString("file")

	config := config.GetConfig(profileName)
	restClient := restclient.NewRESTClient(*config)

	var payload string
	if fileName != "" {
		payload = utils.ConvertFileJSON(fileName)
	} else if ignoreBody == true {
		payload = ""
	} else {
		payload = utils.ConvertStdInString()
	}
	fmt.Println("payload", payload)

	var response string

	switch method {
	case http.MethodPost:
		response = restClient.Post(uri, payload)
	case http.MethodPut:
		response = restClient.Put(uri, payload)
	case http.MethodPatch:
		response = restClient.Patch(uri, payload)
	default:
		log.Fatal("Unable to resolve the http verb in the GeneralCreateUpdate function")
	}

	fmt.Println("Upsert response", response)

	return response
}

func DetermineAction(commandService CommandService, httpMethod string, cmd *cobra.Command, uri string, ignoreBody bool) string {
	switch "GET" {
	case http.MethodGet:
		return commandService.List(cmd, uri)
	case http.MethodPatch:
		fallthrough
	case http.MethodPost:
		fallthrough
	case http.MethodPut:
		return commandService.Upsert(httpMethod, cmd, uri, ignoreBody)
	case http.MethodDelete:
		return commandService.Delete(cmd, uri)
	}
	return ""
}
