package services

import (
	"encoding/json"
	"fmt"
	"gc/config"
	"gc/models"
	"gc/restclient"
	"gc/retry"
	"gc/utils"
	"github.com/spf13/cobra"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

//CommandService holds the method signatures for all common Command object invocations
type CommandService interface {
	Get(uri string) (string, error)
	List(uri string) (string, error)
	Post(uri string, payload string) (string, error)
	Patch(uri string, payload string) (string, error)
	Put(uri string, payload string) (string, error)
	Delete(uri string) (string, error)
	DetermineAction(httpMethod string, operationId string, uri string) func(retryConfiguration *retry.RetryConfiguration) (string, error)
}

type commandService struct {
	cmd *cobra.Command
}

// The following functions are added as variables to allow reassignment to mock functions in unit tests
var (
	configGetConfig         = config.GetConfig
	restclientNewRESTClient = restclient.NewRESTClient
)

//NewCommandService initializes a new command Service object
func NewCommandService(cmd *cobra.Command) *commandService {
	return &commandService{cmd: cmd}
}

func (c *commandService) Get(uri string) (string, error) {
	profileName, _ := c.cmd.Root().Flags().GetString("profile")
	config, err := configGetConfig(profileName)
	if err != nil {
		return "", err
	}

	restClient := restclientNewRESTClient(config)

	response, err := restClient.Get(uri)

	if err != nil {
		return "", err
	}

	return response, nil
}

func (c *commandService) List(uri string) (string, error) {
	profileName, _ := c.cmd.Root().Flags().GetString("profile")
	config, err := configGetConfig(profileName)
	if err != nil {
		return "", err
	}

	restClient := restclientNewRESTClient(config)

	//Looks up first page
	data, err := restClient.Get(uri)
	if err != nil {
		return "", err
	}

	firstPage := &models.Entities{}
	json.Unmarshal([]byte(data), firstPage)

	//Allocate the total results based on the page count
	totalResults := make([]string, len(firstPage.Entities))

	//Appends the individual records from Entities into the array
	for _, val := range firstPage.Entities {
		totalResults = append(totalResults, string(val))
	}

    //Looks up the rest of the pages
	if firstPage.PageCount > 1 {
		pagedURI := uri
		for x := 2; x <= firstPage.PageCount; x++ {
			if strings.Contains(pagedURI,"pageNumber=") {
				re := regexp.MustCompile("pageNumber=([0-9]+)")
				result := re.FindStringSubmatch(pagedURI)
				pageNumber, _ := strconv.Atoi(result[1])
				pageNumber++
				pagedURI = strings.Replace(pagedURI, result[0], fmt.Sprintf("pageNumber=%v", pageNumber), 1)
			} else {
				if strings.Contains(pagedURI, "?") {
					pagedURI = fmt.Sprintf("%s&pageNumber=%d", pagedURI, x)
				} else {
					pagedURI = fmt.Sprintf("%s?pageNumber=%d", pagedURI, x)
				}
			}
			pageData := &models.Entities{}
			data, err := restClient.Get(pagedURI)
			if err != nil {
				return "", err
			}

			json.Unmarshal([]byte(data), pageData)

			for _, val := range pageData.Entities {
				totalResults = append(totalResults, string(val))
			}
		}
	}

	//Convert the data into one big string
	finalJSONString := fmt.Sprintf("[%s]", strings.Join(totalResults, ","))
	return finalJSONString, nil
}

func (c *commandService) Post(uri string, payload string) (string, error) {
	return c.upsert(http.MethodPost, uri, payload)
}

func (c *commandService) Patch(uri string, payload string) (string, error) {
	return c.upsert(http.MethodPatch, uri, payload)
}

func (c *commandService) Put(uri string, payload string) (string, error) {
	return c.upsert(http.MethodPut, uri, payload)
}

func (c *commandService) Delete(uri string) (string, error) {
	return c.upsert(http.MethodDelete, uri, "")
}

func (c *commandService) upsert(method string, uri string, payload string) (string, error) {
	profileName, _ := c.cmd.Root().Flags().GetString("profile")
	config, err := configGetConfig(profileName)
	if err != nil {
		return "", err
	}

	restClient := restclientNewRESTClient(config)

	var response string

	switch method {
	case http.MethodPost:
		response, err = restClient.Post(uri, payload)
	case http.MethodPut:
		response, err = restClient.Put(uri, payload)
	case http.MethodPatch:
		response, err = restClient.Patch(uri, payload)
	case http.MethodDelete:
		response, err = restClient.Delete(uri)
	default:
		log.Fatal("Unable to resolve the http verb in the GeneralCreateUpdate function")
	}

	return response, err
}

func (c *commandService) DetermineAction(httpMethod string, operationId string, uri string) func(retryConfiguration *retry.RetryConfiguration) (string, error) {
	switch httpMethod {
	case http.MethodGet:
		listOverrides := make(map[string]int)
		// Add overrides here for resources with custom operationIds requiring pagination
		listOverrides["users"] = 1

		_, ok := listOverrides[operationId]
		if operationId == "list" || ok {
			return retry.Retry(uri, c.List)
		} else {
			return retry.Retry(uri, c.Get)
		} 
	case http.MethodPatch:
		return retry.RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Patch)
	case http.MethodPost:
		return retry.RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Post)
	case http.MethodPut:
		return retry.RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Put)
	case http.MethodDelete:
		return retry.Retry(uri, c.Delete)
	}
	return nil
}
