package config

import (
	"fmt"
	"log"

	"github.com/spf13/viper"
)

type Configuration struct {
	ProfileName  string
	Environment  string
	ClientID     string
	ClientSecret string
	Output       string
}

//Retrieves the config for the current profile
func GetConfig(profileName string) *Configuration {
	profile := viper.GetViper().Get(profileName)

	if profile == nil {
		log.Fatalf("The profile %s passed in does not exist in the configuration file", profileName)
	}

	return &Configuration{ProfileName: profileName,
		ClientID:     viper.GetString(fmt.Sprintf("%s.client_credentials", profileName)),
		ClientSecret: viper.GetString(fmt.Sprintf("%s.client_secret", profileName)),
		Environment:  viper.GetString(fmt.Sprintf("%s.environment", profileName)),
	}
}
