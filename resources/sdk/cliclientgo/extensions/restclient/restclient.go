package restclient

import (
	"gc/utils"
	"net/http"
	"os"

	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"gc/config"
	"io/ioutil"
	"log"
	"net/url"
	"strings"
)

var (
	Client HTTPClient
)

// HTTPClient interface
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type RESTClient struct {
	environment string
	token       string
}

type oAuthToken struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   string `json:"expires_in"`
	Error       string `json:"error"`
}

func (this *RESTClient) Get(uri string) string {
	return this.callAPI(http.MethodGet, uri, "")
}

func (this *RESTClient) Put(uri string, data string) string {
	return this.callAPI(http.MethodPut, uri, data)
}

func (this *RESTClient) Post(uri string, data string) string {
	return this.callAPI(http.MethodPost, uri, data)
}

func (this *RESTClient) Patch(uri string, data string) string {
	return this.callAPI(http.MethodPatch, uri, data)
}

func (this *RESTClient) Delete(uri string) string {
	return this.callAPI(http.MethodDelete, uri, "")
}

func (this *RESTClient) callAPI(method string, uri string, data string) string {
	apiURI, _ := url.Parse(fmt.Sprintf("https://api.%s%s", this.environment, uri))
	fmt.Println("apiURI", apiURI)

	request := &http.Request{
		URL:    apiURI,
		Close:  true,
		Method: strings.ToUpper((method)),
		Header: make(map[string][]string),
	}

	//Setting up the auth header
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", this.token))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Cache-Control", "no-cache")

	if data != "" {
		request.Body = ioutil.NopCloser(bytes.NewBuffer([]byte(data)))
	}

	//Executing the request
	resp, err := Client.Do(request)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	response, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	responseData := string(response)

	if (resp.StatusCode != http.StatusOK) && (resp.StatusCode != http.StatusAccepted) {
		utils.Render(responseData)
		os.Exit(1)
	}

	return responseData
}

//login authenticates the user using the client credentials in their profile.
func login(config config.Configuration) oAuthToken {
	loginURI, _ := url.Parse(fmt.Sprintf("https://login.%s/oauth/token", config.Environment))

	request := &http.Request{
		URL:    loginURI,
		Close:  true,
		Method: "POST",
		Header: make(map[string][]string),
	}

	//Setting up the basic auth headers for the call
	authHeaderString := fmt.Sprintf("%s:%s", config.ClientID, config.ClientSecret)
	authHeader := base64.StdEncoding.EncodeToString([]byte(authHeaderString))
	request.Header.Set("Authorization", fmt.Sprintf("Basic %s", authHeader))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	//Setting up the form data
	form := url.Values{}
	form["grant_type"] = []string{"client_credentials"}
	request.Body = ioutil.NopCloser(strings.NewReader(form.Encode()))

	//Executing the request
	resp, err := Client.Do(request)

	if err != nil {
		log.Fatal(err)
	}

	defer resp.Body.Close()

	if (resp.StatusCode != http.StatusOK) && (resp.StatusCode != http.StatusAccepted) {
		log.Fatalf("HTTP error code %d returned while to uri %s\n", resp.StatusCode, loginURI)
	}

	// Read Response Body
	responseData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	oAuthTokenResponse := &oAuthToken{}
	json.Unmarshal(responseData, &oAuthTokenResponse)

	return *oAuthTokenResponse
}

//NewRESTClient is a constructor function to build an APIClient
func NewRESTClient(config config.Configuration) *RESTClient {
	oAuthToken := login(config)

	return &RESTClient{environment: config.Environment, token: oAuthToken.AccessToken}
}

func init() {
	Client = &http.Client{}
}
