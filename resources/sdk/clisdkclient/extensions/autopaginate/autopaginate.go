package autopaginate

import (
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/utils"
	"github.com/spf13/cobra"
)

var autopaginateCmd = &cobra.Command{
	Use:   "autopaginate",
	Short: "autopaginate",
	Long:  `automatic pagination`,
}

var enableAutopaginateCmd = &cobra.Command{
	Use:   "enable",
	Short: "Permanently enable autopaginate.",
	Long:  `Permanently enable automatic pagination.`,
	Args:  utils.DetermineArgs([]string{ }),

	Run: func(cmd *cobra.Command, args []string) {
		profileName, _ := cmd.Root().Flags().GetString("profile")
		const enable = true
		err := config.SetAutopaginate(profileName, enable)
		if err != nil {
			logger.Fatal(err)
		}
		fmt.Printf("Autopaginate set to %t in configuration file.\n", enable)
	},
}

var disableAutopaginateCmd = &cobra.Command{
	Use:   "disable",
	Short: "Permanently disable autopaginate.",
	Long:  `Permanently disable automatic pagination.`,
	Args:  utils.DetermineArgs([]string{ }),

	Run: func(cmd *cobra.Command, args []string) {
		profileName, _ := cmd.Root().Flags().GetString("profile")
		const disable = false
		err := config.SetAutopaginate(profileName, disable)
		if err != nil {
			logger.Fatal(err)
		}
		fmt.Printf("Autopaginate set to %t in configuration file.\n", disable)
	},
}

func CmdAutopaginate() *cobra.Command {
	autopaginateCmd.AddCommand(enableAutopaginateCmd)
	autopaginateCmd.AddCommand(disableAutopaginateCmd)
	return autopaginateCmd
}