package restclient

import (
	"encoding/base64"
	"fmt"
	"gc/mocks"
	"gc/models"
	"gc/utils"
	"io/ioutil"
	"net/http"
	"strings"
	"testing"
)

type apiClientTest struct {
	oAuthToken          string
	targetVerb          string
	targetPath          string
	targetEnv           string
	targetStatusCode    int
	targetBody          string
	expectedHeaderToken string
	expectedHost        string
	expectedPath        string
	expectedResponse    string
	expectedAuthHeader  string
	expectedStatusCode  int
}

func buildMockConfig(profileName string, environment string, clientID string, clientSecret string) *mocks.MockClientConfig {
	mockConfig := &mocks.MockClientConfig{}

	mockConfig.ProfileNameFunc = func() string {
		return profileName
	}

	mockConfig.EnvironmentFunc = func() string {
		return environment
	}

	mockConfig.ClientIDFunc = func() string {
		return clientID
	}

	mockConfig.ClientSecretFunc = func() string {
		return clientSecret
	}

	

	return mockConfig
}
func TestLogin(t *testing.T) {
	mock := &mocks.MockHttpClient{}
	mockConfig := buildMockConfig("DEFAULT", "mypurecloud.com", utils.GenerateGuid(), utils.GenerateGuid())

	accessToken := "aJdvugb8k1kwnOovm2qX6LXTctJksYvdzcoXPrRDi-nL1phQhcKRN-bjcflq7CUDOmUCQv5OWuBSkPQr0peWhw"
	tokenType := "bearer"

	mock.DoFunc = func(request *http.Request) (*http.Response, error) {
		authHeaderString := fmt.Sprintf("%s:%s", mockConfig.ClientID(), mockConfig.ClientSecret())
		expectedAuthHeader := fmt.Sprintf("Basic %s", base64.StdEncoding.EncodeToString([]byte(authHeaderString)))
		requestAuthHeader := request.Header.Get("Authorization")

		//Checking to make sure the auth header is built correctly
		if requestAuthHeader != expectedAuthHeader {
			t.Errorf("Authorization token on header not set propertly got: %s, want: %s.", requestAuthHeader, expectedAuthHeader)
		}

		//Checking to make sure the URL is built correctly
		expectedHost := fmt.Sprintf("login.%s", mockConfig.Environment())
		expectedPath := "/oauth/token"
		urlHost := request.URL.Host
		urlPath := request.URL.Path

		if expectedHost != urlHost {
			t.Errorf("Target oauth host is not correct : %s, want: %s.", expectedHost, urlHost)
		}

		if expectedPath != urlPath {
			t.Errorf("Target oauth path is not correct : %s, want: %s.", expectedPath, urlPath)
		}

		responseString := fmt.Sprintf(`
		  {
				"access_token": "%s",
				"token_type": "%s", 
				"expires_in": "",
				"Error":      ""
			}
		`, accessToken, tokenType)

		stringReader := strings.NewReader(responseString)
		stringReadCloser := ioutil.NopCloser(stringReader)
		response := &http.Response{
			Status:     "200 OK",
			StatusCode: 200,
			Body:       stringReadCloser,
		}
		return response, nil
	}

	Client = mock
	oauth, _ := Authorize(mockConfig)

	if oauth.AccessToken != accessToken {
		t.Errorf("OAuth Access Token incorrect, got: %s, want: %s.", oauth.AccessToken, accessToken)
	}
}

//buildRestClientDoMock returns a mock Do object for the RestClient tests
func buildRestClientDoMock(t *testing.T, tc apiClientTest) *mocks.MockHttpClient {
	mock := &mocks.MockHttpClient{}

	//Building a Mock HTTP Functions
	mock.DoFunc = func(request *http.Request) (*http.Response, error) {
		urlHost := request.URL.Host
		urlPath := request.URL.Path

		//Testing to see if the host and the path are being set correctly in my rest client code.
		if tc.expectedHost != urlHost {
			t.Errorf("Target host is not correct : %s, want: %s.", tc.expectedHost, urlHost)
		}

		if tc.expectedPath != urlPath {
			t.Errorf("Target path is not correct : %s, want: %s.", tc.expectedPath, urlPath)
		}

		//Check the auth header on the request to make sure is set
		if request.Header.Get("Authorization:") != tc.expectedAuthHeader {
			t.Errorf("Auth header on requests is not set properly : %s, want: %s.", tc.expectedAuthHeader, request.Header.Get("Authorization:")) //The extra colon at the head of the header string is not incorrect.  Go adds this
		}

		//Setting up the response body
		stringReader := strings.NewReader(tc.expectedResponse)
		stringReadCloser := ioutil.NopCloser(stringReader)
		response := &http.Response{
			StatusCode: tc.targetStatusCode,
			Body:       stringReadCloser,
		}
		return response, nil
	}

	return mock
}

func buildTestCaseTable() []apiClientTest {
	oAuthToken := utils.GenerateGuid()
	skillId := utils.GenerateGuid()
	tests := []apiClientTest{
		{oAuthToken: oAuthToken, targetVerb: http.MethodGet, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: "", expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateModified": "2016-07-27T15:57:58Z","state": "active","version": "1","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId)},
		{oAuthToken: oAuthToken, targetVerb: http.MethodGet, targetEnv: "mypurecloud.de", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: "", expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.de", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateModified": "2016-07-27T15:57:58Z","state": "active","version": "1","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId)},
		{oAuthToken: oAuthToken, targetVerb: http.MethodPost, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: `{"id": "%s","name":"test2","state": "active""}`, expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateCreated": "2016-07-27T15:57:58Z","state": "active","version": "1","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId)},
		{oAuthToken: oAuthToken, targetVerb: http.MethodPut, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: `{"id": "%s","name":"test2","state": "active""}`, expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateCreated": "2016-07-27T15:57:58Z","state": "active","version": "3","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId)},
		{oAuthToken: oAuthToken, targetVerb: http.MethodPatch, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: `{"name":"test4"}`, expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateCreated": "2016-07-27T15:57:58Z","state": "active","version": "4","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId)},
		{oAuthToken: oAuthToken, targetVerb: http.MethodDelete, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusOK, targetBody: "", expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: ""},
		//Error condition - Check to make sure we are return the httpStatusCode when there is an error
		{oAuthToken: oAuthToken, targetVerb: http.MethodGet, targetEnv: "mypurecloud.com", targetPath: fmt.Sprintf("api/v2/routing/skills/%s", skillId), targetStatusCode: http.StatusInternalServerError, targetBody: "", expectedHeaderToken: fmt.Sprintf("Bearer %s", oAuthToken), expectedHost: "api.mypurecloud.com", expectedPath: fmt.Sprintf("/api/v2/routing/skills/%s", skillId),
			expectedResponse: fmt.Sprintf(`{"id": "%s","name":"test2","dateModified": "2016-07-27T15:57:58Z","state": "active","version": "1","selfUri": "/api/v2/routing/skills/7eba08c7-e62b-49bb-867f-ca69bbab66f0"}`, skillId), expectedStatusCode: http.StatusInternalServerError},
	}

	return tests
}

func TestLowLevelRestClient(t *testing.T) {
	tests := buildTestCaseTable()

	for _, tc := range tests {
		restClient := &RESTClient{
			environment: tc.targetEnv,
			token:       tc.oAuthToken,
		}

		Client = buildRestClientDoMock(t, tc)

		//First checking the low level API call
		results, err := restClient.callAPI(tc.targetVerb, tc.targetPath, "")

		//Testing to see if we got an http status code error.  If we got an http status code error we should get an HttpStatusError struct and the status code should match the status code on the response
		//Later on checks like this will be important when we add
		if err != nil {
			//Check to see if its an HTTP error and if its check to see if its what we are expecting
			if e, ok := err.(*models.HttpStatusError); ok && e.StatusCode != tc.expectedStatusCode {
				t.Errorf("Did not get the right HttpStatus Code for the error expected, got: %d, want: %d.", e.StatusCode, tc.expectedStatusCode)
			}
		} else {
			if tc.expectedResponse != results {
				t.Errorf("Retrieved the incorrect response calling the restClient.Get, got: %s, want: %s.", results, tc.expectedResponse)
			}
		}
	}
}

func TestHighLevelRestClient(t *testing.T) {
	tests := buildTestCaseTable()

	for _, tc := range tests {
		restClient := &RESTClient{
			environment: tc.targetEnv,
			token:       tc.oAuthToken,
		}

		Client = buildRestClientDoMock(t, tc)
		var results string
		var err error

		//Calling the higher levl API functions
		switch tc.targetVerb {
		case http.MethodGet:
			results, err = restClient.Get(tc.targetPath)
		case http.MethodPost:
			results, err = restClient.Post(tc.targetPath, tc.targetBody)
		case http.MethodPut:
			results, err = restClient.Put(tc.targetPath, tc.targetBody)
		case http.MethodPatch:
			results, err = restClient.Patch(tc.targetPath, tc.targetBody)
		case http.MethodDelete:
			results, err = restClient.Delete(tc.targetPath)
		}

		//Rechecking the error codes for the higher level RestClient functions
		if err != nil {
			//Check to see if its an HTTP error and if its check to see if its what we are expecting
			if e, ok := err.(*models.HttpStatusError); ok && e.StatusCode != tc.expectedStatusCode {
				t.Errorf("Did not get the right HttpStatus Code for the error expected, got: %d, want: %d.", e.StatusCode, tc.expectedStatusCode)
			}
		} else {
			if tc.expectedResponse != results {
				t.Errorf("Retrieved the incorrect response calling the restClient.Get, got: %s, want: %s.", results, tc.expectedResponse)
			}
		}
	}
}
