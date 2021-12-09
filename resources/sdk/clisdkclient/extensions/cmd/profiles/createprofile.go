package profiles

import (
	"fmt"
	"strings"

	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/mocks"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/models"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/restclient"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

type GrantType string

const (
	None              GrantType = "0"
	ClientCredentials           = "1"
	ImplicitGrant               = "2"
)

func isValidGrantType(t GrantType) bool {
	if t == None || t == ClientCredentials || t == ImplicitGrant {
		return true
	}
	return false
}

func constructConfig(profileName string, environment string, clientID string, clientSecret string, redirectURI string, secureLoginEnabled bool, accessToken string) config.Configuration {
	c := &mocks.MockClientConfig{}

	c.ProfileNameFunc = func() string {
		return profileName
	}

	c.EnvironmentFunc = func() string {
		return config.MapEnvironment(environment)
	}

	c.LogFilePathFunc = func() string {
		return ""
	}

	c.LoggingEnabledFunc = func() bool {
		return false
	}

	c.AutoPaginationEnabledFunc = func() bool {
		return false
	}

	c.ClientIDFunc = func() string {
		return clientID
	}

	c.ClientSecretFunc = func() string {
		return clientSecret
	}

	c.RedirectURIFunc = func() string {
		return redirectURI
	}

	c.SecureLoginEnabledFunc = func() bool {
		return secureLoginEnabled
	}

	c.OAuthTokenDataFunc = func() string {
		return ""
	}

	c.AccessTokenFunc = func() string {
		return accessToken
	}

	return c
}

func requestUserInput() config.Configuration {
	var name string
	var environment string
	var clientID string
	var clientSecret string
	var accessToken string
	var authChoice string
	var redirectURI string
	var grantType GrantType
	secureLoginEnabled := false

	fmt.Print("Profile Name [DEFAULT]: ")
	fmt.Scanln(&name)

	if name == "" {
		name = "DEFAULT"
	}

	fmt.Printf("Environment [mypurecloud.com]: ")
	fmt.Scanln(&environment)

	if environment == "" {
		environment = "mypurecloud.com"
	}

	fmt.Print("Note: If you provide an access token, this will take precedence over any authorization grant type.\n")
	fmt.Print("Access Token (Optional): ")
	fmt.Scanln(&accessToken)

	for true {
		fmt.Print("Select your authorization grant type.\n")
		fmt.Print("\t0. None\n\t1. Client Credentials\n\t2. Implicit Grant\nGrant Type: ")
		fmt.Scanln(&grantType)

		if accessToken == "" && grantType == None {
			fmt.Print("If you have not provided an access token, you must select a grant type.\n")
			continue
		}
		if isValidGrantType(grantType) {
			break
		}
	}

	clientID, clientSecret = requestClientCreds(accessToken, grantType)

	if grantType == ImplicitGrant {
		for true {
			fmt.Print("Would you like to use a secure HTTP connection? [Y/N]: ")
			fmt.Scanln(&authChoice)
			if strings.ToUpper(authChoice) == "Y" {
				secureLoginEnabled = true
				break
			} else if strings.ToUpper(authChoice) == "N" {
				secureLoginEnabled = false
				break
			}
		}
		redirectURI = requestRedirectURI(secureLoginEnabled)
		fmt.Printf("Redirect URI: %s\n", redirectURI)
	}

	return constructConfig(name, environment, clientID, clientSecret, redirectURI, secureLoginEnabled, accessToken)
}

func requestClientCreds(accessToken string, grantType GrantType) (string, string) {
	id := ""
	secret := ""

	if grantType == ClientCredentials {
		if accessToken != "" {
			fmt.Print("Client ID: ")
			fmt.Scanln(&id)

			fmt.Print("Client Secret: ")
			fmt.Scanln(&secret)
		} else {
			for id == "" {
				fmt.Print("Client ID: ")
				fmt.Scanln(&id)
			}
			for secret == "" {
				fmt.Print("Client Secret: ")
				fmt.Scanln(&secret)
			}
		}
	} else if grantType == ImplicitGrant {
		// Implicit Grant
		for id == "" {
			fmt.Print("Client ID: ")
			fmt.Scanln(&id)
		}

		fmt.Print("Client Secret (Optional): ")
		fmt.Scanln(&secret)
	}

	return id, secret
}

func requestRedirectURI(secure bool) string {
	var inputPort string
	var redirectURI string
	defaultPort := "8080"

	if secure {
		redirectURI = "https://localhost:"
	} else {
		redirectURI = "http://localhost:"
	}

	fmt.Printf("Redirect URI port [%s]: ", defaultPort)
	fmt.Scanln(&inputPort)
	if inputPort != "" {
		redirectURI += inputPort
	} else {
		redirectURI += defaultPort
	}

	return redirectURI
}

func overrideConfig(name string) bool {
	//The file does not exist and therefore can not be overridden
	if err := viper.ReadInConfig(); err != nil {
		return true
	}

	config, err := config.GetConfig(name)

	//profile already exists we will get a nil back and we must resolve the results
	if err == nil && config.ProfileName() != "" {
		for true {
			var overwrite string
			fmt.Printf("Profile name %s already exists in the config file. Overwrite (Y/N): ", name)
			fmt.Scanln(&overwrite)

			if strings.ToUpper(overwrite) == "N" {
				return false
			}

			if strings.ToUpper(overwrite) == "Y" {
				break
			}
		}
	}

	return true
}

func validateCredentials(config config.Configuration) bool {
	oauthToken, err := restclient.Authorize(config)
	if err != nil || oauthToken.AccessToken == "" {
		//Check to see if its an HTTP error and if its check to see if its what we are expecting
		if _, ok := err.(*models.HttpStatusError); ok {
			return false
		}
		logger.Fatal(err)
	}

	return true
}

var createProfilesCmd = &cobra.Command{
	Use:   "new",
	Short: "Creates a new profile",
	Long:  `Creates a new profile`,

	Run: func(cmd *cobra.Command, args []string) {

		newConfig := requestUserInput()

		if overrideConfig(newConfig.ProfileName()) == false {
			logger.Fatal("Exiting profile creation process")
		}

		if newConfig.AccessToken() == "" && validateCredentials(newConfig) == false {
			logger.Fatal("The credentials provided are not valid.")
		}

		if err := config.SaveConfig(newConfig); err != nil {
			logger.Fatal(err)
		}

		fmt.Printf("Profile %s saved.\n", newConfig.ProfileName())
	},
}
