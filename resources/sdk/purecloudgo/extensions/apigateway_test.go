package platformclientv2

import (
	"fmt"
	"testing"
	"time"
)

func TestAuthorizeWithGateWay(t *testing.T) {
	UpdateOAuthToken = mocks.UpdateOAuthToken

	mockConfig := buildMockConfig("DEFAULT", "mypurecloud.com", "", false, "1", utils.GenerateGuid(), utils.GenerateGuid(), "")
	mockConfig = buildMockConfigForGateWay(mockConfig)
	accessToken := "aJdvugb8k1kwnOovm2qX6LXTctJksYvdzcoXPrRDi-nL1phQhcKRN-bjcflq7CUDOmUCQv5OWuBSkPQr0peWhw"
	setRestClientDoMockForAuthorize(t, *mockConfig, accessToken, "/nonxml/login", "serviceproxy.net")

	oauthData, err := Authorize(mockConfig)
	if err != nil {
		t.Fatalf("err should be nil, got: %s", err)
	}
	if oauthData.AccessToken != accessToken {
		t.Errorf("OAuth Access Token incorrect, got: %s, want: %s.", oauthData.AccessToken, accessToken)
	}

	// Check that the same token is returned when the expiry time stamp is in the future
	mockConfig = buildMockConfig(mockConfig.ProfileName(), mockConfig.Environment(), mockConfig.RedirectURI(), false, "1", mockConfig.ClientID(), mockConfig.ClientSecret(), oauthData.String())
	mockConfig = buildMockConfigForGateWay(mockConfig)
	oauthData, err = Authorize(mockConfig)
	if err != nil {
		t.Fatalf("err should be nil, got: %s", err)
	}
	if oauthData.AccessToken != accessToken {
		t.Errorf("OAuth Access Token incorrect, got: %s, want: %s.", oauthData.AccessToken, accessToken)
	}

	// Check that a new token is retrieved when the expiry time stamp is in the past
	oauthData.OAuthTokenExpiry = time.Now().AddDate(0, 0, -1).Format(time.RFC3339)
	accessToken = "aJdvugb8k1kwnOovm2qX6LXTctJksYvdzcoXPrRDi-nL1phQhcKRN-bjcflq7CUDOmUCQv5OWuBSkPQr0peWhw"
	mockConfig = buildMockConfig(mockConfig.ProfileName(), mockConfig.Environment(), mockConfig.RedirectURI(), false, "1", mockConfig.ClientID(), mockConfig.ClientSecret(), oauthData.String())
	mockConfig = buildMockConfigForGateWay(mockConfig)
	oauthData, err = Authorize(mockConfig)
	if err != nil {
		t.Fatalf("err should be nil, got: %s", err)
	}
	if oauthData.AccessToken != accessToken {
		t.Errorf("OAuth Access Token incorrect, got: %s, want: %s.", oauthData.AccessToken, accessToken)
	}
}

func buildMockConfig(profileName string, environment string, redirectURI string, secureLoginEnabled bool, grantType string, clientID string, clientSecret string, oauthTokenData string) *mocks.MockClientConfig {
	mockConfig := &mocks.MockClientConfig{}

	mockConfig.ProfileNameFunc = func() string {
		return profileName
	}

	mockConfig.EnvironmentFunc = func() string {
		return environment
	}

	mockConfig.RedirectURIFunc = func() string {
		return redirectURI
	}

	mockConfig.LogFilePathFunc = func() string {
		return ""
	}

	mockConfig.LoggingEnabledFunc = func() bool {
		return false
	}

	mockConfig.AutoPaginationEnabledFunc = func() bool {
		return false
	}

	mockConfig.SecureLoginEnabledFunc = func() bool {
		return secureLoginEnabled
	}

	mockConfig.GrantTypeFunc = func() string {
		return grantType
	}

	mockConfig.ClientIDFunc = func() string {
		return clientID
	}

	mockConfig.ClientSecretFunc = func() string {
		return clientSecret
	}

	mockConfig.OAuthTokenDataFunc = func() string {
		return oauthTokenData
	}

	mockConfig.ProxyConfigurationFunc = func() string {
		return ""
	}

	mockConfig.GateWayConfigurationFunc = func() string {
		return ""
	}

	return mockConfig
}

func buildMockConfigForGateWay(mockConfig *mocks.MockClientConfig) *mocks.MockClientConfig {

	mockConfig.GateWayConfigurationFunc = func() string {
		return fmt.Sprintf(`
		  {
  		"host": "serviceproxy.net",
		"protocol": "https",
  		"port": "443",
  		"pathParams": {
    		"login": "nonxml/login",
    		"api": "nonxml/apis"
  		}
		}`)
	}

	return mockConfig
}
