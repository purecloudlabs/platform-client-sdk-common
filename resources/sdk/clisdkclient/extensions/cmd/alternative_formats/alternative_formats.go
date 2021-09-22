package alternative_formats

import (
	"fmt"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/config"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/logger"
	"github.com/spf13/cobra"
	"strings"
)

var validTypes = [...]string{"JSON", "YAML"}

func isValidDataType(arg string) bool {
	for _, v := range validTypes {
		if strings.EqualFold(v, arg) {
			return true
		}
	}

	fmt.Printf("The data format you entered is either invalid or not supported. Supported types: ")
	for i, v := range validTypes {
		if i != 0 {
			fmt.Print(", ")
		}
		fmt.Printf("%v", v)
	}
	fmt.Printf("\n")
	return false
}

var alternative_formatsCmd = &cobra.Command{
	Use:   "alternative_formats",
	Short: "Used to specify the desired input and output formats",
	Long:  `Used to specify the desired input and output formats`,
}

var setOutputFormatCmd = &cobra.Command{
	Use:   "set_output [format]",
	Short: "Pins the specified output format in the configuration file.",
	Long:  `Pins the specified output format in the configuration file.`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		if isValidDataType(args[0]) {
			profileName, _ := cmd.Root().Flags().GetString("profile")
			err := config.SetOutputFormat(profileName, args[0])
			if err != nil {
				logger.Fatal(err)
			}
			fmt.Printf("Preffered output format set to %v in configurations.\n", strings.ToUpper(args[0]))
		}
	},
}

var setInputFormatCmd = &cobra.Command{
	Use:   "set_input [format]",
	Short: "Pins the specified input format in the configuration file.",
	Long:  `Pins the specified input format in the configuration file.`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		if isValidDataType(args[0]) {
			profileName, _ := cmd.Root().Flags().GetString("profile")
			err := config.SetInputFormat(profileName, args[0])
			if err != nil {
				logger.Fatal(err)
			}
			fmt.Printf("Preffered input format set to %v in configurations.\n", strings.ToUpper(args[0]))
		}
	},
}

func Cmdalternative_formats() *cobra.Command {
	alternative_formatsCmd.AddCommand(setOutputFormatCmd)
	alternative_formatsCmd.AddCommand(setInputFormatCmd)
	return alternative_formatsCmd
}
