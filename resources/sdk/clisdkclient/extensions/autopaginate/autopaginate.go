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
		fmt.Print("Autopagination enabled.\n")
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
		fmt.Print("Autopagination disabled.\n")
	},
}

var checkAutopaginateCmd = &cobra.Command{
	Use:   "status",
	Short: "Check autopaginate status.",
	Long:  `Check autopaginate status in config.`,
	Args:  utils.DetermineArgs([]string{ }),

	Run: func(cmd *cobra.Command, args []string) {
		profileName, _ := cmd.Root().Flags().GetString("profile")
		status, err := config.GetAutopaginate(profileName)
		if err != nil {
			logger.Fatal(err)
		}
		if status {
			fmt.Print("Autopagination is currently enabled.\n")
		} else {
			fmt.Print("Autopagination is currently disabled.\n")
		}
	},
}

func CmdAutopaginate() *cobra.Command {
	autopaginateCmd.AddCommand(enableAutopaginateCmd)
	autopaginateCmd.AddCommand(disableAutopaginateCmd)
	autopaginateCmd.AddCommand(checkAutopaginateCmd)
	return autopaginateCmd
}