package subscriptions
import (
	"fmt"
	"gc/utils"
	"gc/services"
	"log"

	"github.com/spf13/cobra"
)

var createSubscriptionsCmd = &cobra.Command{
	Use:   "subscribe [channel id]",
	Short: "Subscribes to a channel with a list of topics",
	Long:  `Subscribes to a channel with a list of topics`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		data := utils.ResolveInputData(cmd)

		targetURI := fmt.Sprintf("%s/channels/%s/subscriptions", BaseURI, args[0])
		retryFunc := services.RetryWithData(targetURI, data, CommandService.Post)
		results, err := retryFunc(nil)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
