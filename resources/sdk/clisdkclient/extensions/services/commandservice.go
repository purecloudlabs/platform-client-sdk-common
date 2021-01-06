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
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

//CommandService holds the method signatures for all common Command object invocations
type CommandService interface {
	Get(uri string) (string, error)
	List(uri string) (string, error)
	Post(uri string, payload string) (string, error)
	Patch(uri string, payload string) (string, error)
	Put(uri string, payload string) (string, error)
	Delete(uri string) (string, error)
	DetermineAction(httpMethod string, operationId string, uri string) func(retryConfiguration *RetryConfiguration) (string, error)
}

type commandService struct {
	cmd *cobra.Command
}

type RetryConfiguration struct {
	MaxRetryTimeSec          int
	MaxRetriesBeforeQuitting int
}

type retry struct {
	retryAfterMs             int64
	retryCountBeforeQuitting int
	RetryConfiguration
}

// The following functions are added as variables to allow reassignment to mock functions in unit tests
var (
	configGetConfig = config.GetConfig
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

func (c *commandService) DetermineAction(httpMethod string, operationId string, uri string) func(retryConfiguration *RetryConfiguration) (string, error) {
	switch httpMethod {
	case http.MethodGet:
		if strings.Compare(operationId, strings.ToLower(http.MethodGet)) == 0 {
			return Retry(uri, c.Get)
		} else {
			return Retry(uri, c.List)
		}
	case http.MethodPatch:
		return RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Patch)
	case http.MethodPost:
		return RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Post)
	case http.MethodPut:
		return RetryWithData(uri, utils.ResolveInputData(c.cmd), c.Put)
	case http.MethodDelete:
		return Retry(uri, c.Delete)
	}
	return nil
}

func RetryWithData(uri string, data string, httpCall func(uri string, data string) (string, error)) func(retryConfiguration *RetryConfiguration) (string, error) {
	return func(retryConfiguration *RetryConfiguration) (string, error) {
		if retryConfiguration == nil {
			retryConfiguration = &RetryConfiguration{
				MaxRetriesBeforeQuitting: 3,
				MaxRetryTimeSec: 10,
			}
		}
		retry := retry{
			RetryConfiguration: *retryConfiguration,
		}
		response, err := httpCall(uri, data)
		now := time.Now()
		for ok := true; ok; ok = retry.shouldRetry(now, err) {
			response, err = httpCall(uri, data)
		}
		return response, err
	}
}

func Retry(uri string, httpCall func(uri string) (string, error)) func(retryConfiguration *RetryConfiguration) (string, error) {
	return func(retryConfiguration *RetryConfiguration) (string, error) {
		if retryConfiguration == nil {
			retryConfiguration = &RetryConfiguration{
				MaxRetriesBeforeQuitting: 3,
				MaxRetryTimeSec: 10,
			}
		}
		retry := retry{
			RetryConfiguration: *retryConfiguration,
		}
		response, err := httpCall(uri)
		now := time.Now()
		for ok := true; ok; ok = retry.shouldRetry(now, err) {
			response, err = httpCall(uri)
		}
		return response, err
	}
}

func (r *retry) shouldRetry(startTime time.Time, errorValue error) bool {
	if errorValue == nil {
		return false
	}
	e := errorValue.(restclient.HttpStatusError)

	if time.Since(startTime) < secondsToNanoSeconds(r.MaxRetryTimeSec) && e.StatusCode == http.StatusTooManyRequests {
		r.retryAfterMs = getRetryAfterValue(e.Headers)
		r.retryCountBeforeQuitting++
		if r.retryCountBeforeQuitting < r.MaxRetriesBeforeQuitting {
			time.Sleep(milliSecondsToNanoSeconds(r.retryAfterMs))
			return true
		}
	}
	return false
}

func milliSecondsToNanoSeconds(milliSeconds int64) time.Duration {
	return time.Duration(milliSeconds * 1000 * 1000)
}

func secondsToNanoSeconds(seconds int) time.Duration {
	return milliSecondsToNanoSeconds(int64(seconds)) * 1000
}

func getRetryAfterValue(headers map[string][]string) int64 {
	defaultValue := int64(3000)
	retryAfterValues := headers["Retry-After"]
	if retryAfterValues == nil {
		return defaultValue
	}

	returnValue := int64(0)
	for _, retryAfter := range retryAfterValues {
		if retryAfter != "" {
			returnValue, _ = strconv.ParseInt(retryAfter, 10, 64)
			break
		}
	}

	// Edge case where the retry-after header has no value
	if returnValue == 0 {
		returnValue = defaultValue
	}

	return returnValue
}
