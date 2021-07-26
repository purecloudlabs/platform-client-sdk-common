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
		listAllFeatures()
	},
}

func listAllFeatures() {
	if allExperimentalFeatures == nil {
		fmt.Println("No experimental features have been added yet.")
	} else {
		for _, f := range allExperimentalFeatures {
			fmt.Println(f)
		}
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
	listAllFeatures()
}
