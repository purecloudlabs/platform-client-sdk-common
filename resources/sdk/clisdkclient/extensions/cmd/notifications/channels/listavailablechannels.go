package channels

import (
	"fmt"
	"gc/utils"
	"gc/services"
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
		retryFunc := services.Retry(targetURI, CommandService.List)
		results, err := retryFunc(nil)
		if err != nil {
			log.Fatal(err)
		}
		utils.Render(results)
	},
}
