package channels

import (
	"fmt"
	"gc/utils"
	"gc/services"
	"log"

	"github.com/spf13/cobra"
)

var createChannelCmd = &cobra.Command{
	Use:   "create",
	Short: "Creates a notification channel",
	Long:  `Creates a notification channel`,
	Args:  cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		targetURI := fmt.Sprintf("%s/channels", BaseURI)
		retryFunc := services.RetryWithData(targetURI, "{}", CommandService.Post)
		results, err := retryFunc(nil)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
