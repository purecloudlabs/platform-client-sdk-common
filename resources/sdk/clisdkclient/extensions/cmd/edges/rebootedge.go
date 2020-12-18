package edges

import (
	"gc/utils"
	"log"
	"strings"

	"github.com/spf13/cobra"
)

func init() {
	edgesCmd.AddCommand(rebootEdgesCmd)
}

var rebootEdgesCmd = &cobra.Command{
	Use:   "reboot [edge id]",
	Short: "reboots a edge in Genesys Cloud",
	Long:  `reboots a edge in Genesys Cloud`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		data := utils.ResolveInputData(cmd)

		path := "/api/v2/telephony/providers/edges/{edgeId}/reboot"
		path = strings.Replace(path, "{edgeId}", args[0], 1)

		results, err := CommandService.Post(path, data)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
