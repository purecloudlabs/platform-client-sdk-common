package profiles

import (
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/mocks"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/models"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/restclient"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func constructConfig(profileName string, environment string, clientID string, clientSecret string, redirectURI string) config.Configuration {
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

	c.ClientIDFunc = func() string {
		return clientID
	}

	c.ClientSecretFunc = func() string {
		return clientSecret
	}

	c.RedirectURIFunc = func() string {
		return redirectURI
	}

	c.OAuthTokenDataFunc = func() string {
		return ""
	}

	return c
}

func requestUserInput() config.Configuration {
	var name string
	var environment string
	var clientID string
	var clientSecret string
	var authChoice string
	var redirectURI string

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

	for true {
		fmt.Print("Are you using client credentials? [Y/N]: ")
		fmt.Scanln(&authChoice)
		if authChoice == "" || strings.ToUpper(authChoice) == "Y" {
			redirectURI = ""
			break
		}
		if strings.ToUpper(authChoice) == "N" {
			redirectURI = requestRedirectURI()
			fmt.Printf("Redirect URI: %v\n", redirectURI)
			break
		}
	}

	for true {
		fmt.Printf("Client ID: ")
		fmt.Scanln(&clientID)
		if len(strings.TrimSpace(clientID)) != 0 {
			break
		}
	}

	for true {
		fmt.Printf("Client Secret: ")
		fmt.Scanln(&clientSecret)
		if len(strings.TrimSpace(clientSecret)) != 0 {
			break
		}
	}

	return constructConfig(name, environment, clientID, clientSecret, redirectURI)
}

func requestRedirectURI() string {
	var inputPort string
	var inputPath string
	redirectURI := "http://localhost:"
	defaultPort := "8000"
	defaultPath := "cli-redirect"

	fmt.Printf("Redirect URI port [%v]: ", defaultPort)
	fmt.Scanln(&inputPort)
	if inputPort != "" {
		redirectURI += inputPort
	} else {
		redirectURI += defaultPort
	}

	fmt.Printf("Redirect URI path [%v]: ", defaultPath)
	fmt.Scanln(&inputPath)
	if inputPath == "" {
		inputPath = defaultPath
	}
	redirectURI = fmt.Sprintf("%v/%v", redirectURI, inputPath)

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

		if validateCredentials(newConfig) == false {
			logger.Fatal("The credentials provided are not valid.")
		}

		if err := config.SaveConfig(newConfig); err != nil {
			logger.Fatal(err)
		}

		fmt.Printf("Profile %s saved.\n", newConfig.ProfileName())
	},
}
