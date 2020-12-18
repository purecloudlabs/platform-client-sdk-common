package phones

import (
	"gc/utils"
	"log"
	"strings"

	"github.com/spf13/cobra"
)

func init() {
	phonesCmd.AddCommand(rebootPhonesCmd)
}

var rebootPhonesCmd = &cobra.Command{
	Use:   "reboot [phone id]",
	Short: "reboots a phone in Genesys Cloud",
	Long:  `reboots a phone in Genesys Cloud`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		data := utils.ResolveInputData(cmd)

		path := "/api/v2/telephony/providers/edges/phones/{phoneId}/reboot"
		path = strings.Replace(path, "{phoneId}", args[0], 1)

		results, err := CommandService.Post(path, data)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
