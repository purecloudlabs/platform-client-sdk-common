package experimental

import (
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/spf13/cobra"
)

var (
	allExperimentalFeatures []string
	featureCommands         = []string{"dummy_command"}
)

var experimentalCmd = &cobra.Command{
	Use:   "experimental",
	Short: "Manages the experimental features for the CLI",
	Long:  `Manages the experimental features for the CLI`,
}

func Cmdexperimental() *cobra.Command {
	experimentalCmd.AddCommand(enableCmd)
	experimentalCmd.AddCommand(disableCmd)
	experimentalCmd.AddCommand(listExperimentalFeaturesCmd)
	return experimentalCmd
}

var enableCmd = &cobra.Command{
	Use:   "enable [feature]",
	Short: "Enables specified experimental feature",
	Long:  `Enables specified experimental feature`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		setFeature(cmd, args[0], true)
	},
}

var disableCmd = &cobra.Command{
	Use:   "disable [feature]",
	Short: "Disables specified experimental feature",
	Long:  `Disables specified experimental feature`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		setFeature(cmd, args[0], false)
	},
}

var listExperimentalFeaturesCmd = &cobra.Command{
	Use:   "list",
	Short: "Lists all experimental features",
	Long:  `Lists all experimental features`,
	Args:  cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		listAllFeatures(cmd)
	},
}

func listAllFeatures(cmd *cobra.Command) {
	if allExperimentalFeatures == nil {
		fmt.Println("No experimental features have been added yet.")
	} else {
		for _, f := range allExperimentalFeatures {
			printFeatureDescription(cmd, f)
		}
	}
}

func printFeatureDescription(cmd *cobra.Command, feature string) {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	switch feature {
	// this case is just for future reference - it can be removed after more features have been added
	case "dummy_command":
		fmt.Printf("dummy_command - %v - Does nothing.\n", classifyFeatureAvailability(config.GetDummyFeatureEnabled(profileName)))
		break
	default:
		fmt.Printf("Command description unimplemented - '%v'\n", feature)
	}
}

func classifyFeatureAvailability(enabled bool) string {
	if enabled {
		return "enabled"
	} else {
		return "disabled"
	}
}

func setFeature(cmd *cobra.Command, featureCommand string, enabled bool) {
	profileName, _ := cmd.Root().Flags().GetString("profile")
	c, err := config.GetConfig(profileName)
	if err != nil {
		fmt.Println(err)
	}

	switch featureCommand {
	case "dummy_command":
		err = config.SetDummyFeatureEnabled(c, enabled)
		if err != nil {
			fmt.Println(err)
		}
		return
	}

	fmt.Printf("Feature '%v' does not exist. All available experimental features are listed below:\n", featureCommand)
	listAllFeatures(cmd)
}
