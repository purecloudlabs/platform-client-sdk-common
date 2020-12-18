package channels

import (
	"fmt"
	"gc/utils"
	"log"

	"github.com/spf13/cobra"
)

var listAvailableChannelsCmd = &cobra.Command{
	Use: "list",

	Short: "Lists all available channels for this oauth client",
	Long:  `Lists all available channels for this oauth client`,
	Args:  cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		targetURI := fmt.Sprintf("%s/channels", BaseURI)
		results, err := CommandService.List(targetURI)
		if err != nil {
			log.Fatal(err)
		}
		utils.Render(results)
	},
}
