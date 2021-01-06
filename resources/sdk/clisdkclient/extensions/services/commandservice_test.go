package services

import (
	"fmt"
	"gc/config"
	"gc/mocks"
	"gc/restclient"
	"gc/utils"
	"github.com/spf13/cobra"
	"io/ioutil"
	"net/http"
	"strings"
	"testing"
)

type apiClientTest struct {
	targetPath          string
	targetStatusCode    int
	targetHeaders       map[string][]string
	expectedResponse    string
	expectedStatusCode  int
}

func TestRetryWithData(t *testing.T) {
	restclientNewRESTClient = mockNewRESTClient
	configGetConfig = mockGetConfig

	c := commandService{
		cmd: &cobra.Command{},
	}

	// Check that RESTClient DoFunc is called 5 times
	maxRetriesBeforeQuitting := 5
	headers := make(map[string][]string)
	headers["Retry-After"] = []string{"10"}

	tc := apiClientTest{
		targetHeaders: headers,
		targetStatusCode: http.StatusTooManyRequests,
		expectedResponse: fmt.Sprintf(`{"numRetries":"%v"}`, maxRetriesBeforeQuitting),
		expectedStatusCode: http.StatusTooManyRequests}
	restclient.Client = buildRestClientDoMock(tc, 10)

	retryFunc := RetryWithData(tc.targetPath, "", c.Patch)
	retryConfig := &RetryConfiguration{
		MaxRetryTimeSec:          100,
		MaxRetriesBeforeQuitting: maxRetriesBeforeQuitting,
	}
	_, err := retryFunc(retryConfig)
	if err != nil {
		//Check to see if its an HTTP error and if its check to see if its what we are expecting
		e, _ := err.(restclient.HttpStatusError)
		if e.StatusCode != tc.expectedStatusCode {
			t.Errorf("Did not get the right HttpStatus Code for the error expected, got: %d, want: %d.", e.StatusCode, tc.expectedStatusCode)
		}
		e.Body = strings.ReplaceAll(strings.ReplaceAll(e.Body, "\n", ""), " ", "")
		if e.Body != tc.expectedResponse {
			t.Errorf("Did not get the right Body for the error expected, got: %s, want: %s.", e.Body, tc.expectedResponse)
		}
	}

	// Check that RESTClient DoFunc is called 2 times when the retry-after value is increased and MaxRetryTimeSec is reduced below it
	maxRetryTimeSec := 1
	headers["Retry-After"] = []string{"2000"}
	expectedNumCalls := 2

	tc.expectedResponse = fmt.Sprintf(`{"numRetries":"%v"}`, expectedNumCalls)
	restclient.Client = buildRestClientDoMock(tc, 10)

	retryFunc = RetryWithData(tc.targetPath, "", c.Patch)
	retryConfig.MaxRetryTimeSec = maxRetryTimeSec
	_, err = retryFunc(retryConfig)
	if err != nil {
		//Check to see if its an HTTP error and if its check to see if its what we are expecting
		e, _ := err.(restclient.HttpStatusError)
		if e.StatusCode != tc.expectedStatusCode {
			t.Errorf("Did not get the right HttpStatus Code for the error expected, got: %d, want: %d.", e.StatusCode, tc.expectedStatusCode)
		}
		e.Body = strings.ReplaceAll(strings.ReplaceAll(e.Body, "\n", ""), " ", "")
		if e.Body != tc.expectedResponse {
			t.Errorf("Did not get the right Body for the error expected, got: %s, want: %s.", e.Body, tc.expectedResponse)
		}
	}

	// Check that RESTClient DoFunc is called 4 times when it fails the first 3 times
	maxRetriesBeforeQuitting = 5
	headers["Retry-After"] = []string{"10"}
	expectedNumCalls = 4

	tc.expectedResponse = fmt.Sprintf(`{"numRetries":"%v"}`, expectedNumCalls)
	restclient.Client = buildRestClientDoMock(tc, 3)

	retryFunc = RetryWithData(tc.targetPath, "", c.Patch)
	retryConfig.MaxRetryTimeSec = maxRetryTimeSec
	retryConfig.MaxRetriesBeforeQuitting = maxRetriesBeforeQuitting
	results, err := retryFunc(retryConfig)
	if err != nil {
		t.Errorf("Error should not be nil, got: %s", err)
	}
	results = strings.ReplaceAll(strings.ReplaceAll(results, "\n", ""), " ", "")
	if results != tc.expectedResponse {
		t.Errorf("Did not get the expected results, got: %s, want: %s.", results, tc.expectedResponse)
	}
}

func mockGetConfig(profileName string) (config.Configuration, error) {
	mockConfig := &mocks.MockClientConfig{}

	mockConfig.ProfileNameFunc = func() string {
		return profileName
	}

	mockConfig.EnvironmentFunc = func() string {
		return "mypurecloud.com"
	}

	mockConfig.ClientIDFunc = func() string {
		return utils.GenerateGuid()
	}

	mockConfig.ClientSecretFunc = func() string {
		return utils.GenerateGuid()
	}

	return mockConfig, nil
}

//buildRestClientDoMock returns a mock Do object for the RestClient tests
func buildRestClientDoMock(tc apiClientTest, numberOfFailedCalls int) *mocks.MockHttpClient {
	mock := &mocks.MockHttpClient{}
	numCalls := 0

	//Building a Mock HTTP Functions
	mock.DoFunc = func(request *http.Request) (*http.Response, error) {
		//Setting up the response body
		stringReader := strings.NewReader(fmt.Sprintf(`{"numRetries": "%v"}`, numCalls))
		stringReadCloser := ioutil.NopCloser(stringReader)

		response := &http.Response{
			Header:     tc.targetHeaders,
			StatusCode: tc.targetStatusCode,
			Body:       stringReadCloser,
		}
		if numCalls > numberOfFailedCalls {
			response.StatusCode = http.StatusOK
		}
		numCalls++

		return response, nil
	}

	return mock
}

func mockNewRESTClient(_ config.Configuration) *restclient.RESTClient {
	return &restclient.RESTClient{}
}
