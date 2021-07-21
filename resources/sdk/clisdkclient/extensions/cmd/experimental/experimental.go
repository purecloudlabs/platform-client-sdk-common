package experimental

import (
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/spf13/cobra"
)

var experimentalCmd = &cobra.Command{
	Use:   "experimental",
	Short: "Manages the experimental features for the CLI",
	Long:  `Manages the experimental features for the CLI`,
}

func Cmdexperimental() *cobra.Command {
	experimentalCmd.AddCommand(enableCmd)
	experimentalCmd.AddCommand(disableCmd)
	return experimentalCmd
}

var enableCmd = &cobra.Command {
	Use: "enable",
	Short: "Enables experimental features",
	Long: `Enables experimental features`,
	Args: cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		setExperimental(cmd, true)
	},
}

var disableCmd = &cobra.Command {
	Use: "disable",
	Short: "Disables experimental features",
	Long: `Disables experimental features`,
	Args: cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		setExperimental(cmd, false)
	},
}

func setExperimental(cmd *cobra.Command, experimentalEnabled bool) {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	c, err := config.GetConfig(profileName)
	if err != nil {
		fmt.Println(err)
	}

	err = config.SetExperimentalFeaturesEnabled(c, experimentalEnabled)
	if err != nil {
		fmt.Println(err)
	}
}