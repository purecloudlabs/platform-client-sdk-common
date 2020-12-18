package subscriptions

import (
	"fmt"
	"log"
	"gc/utils"

	"github.com/spf13/cobra"
)

var deleteSubscriptionsCmd = &cobra.Command{
	Use:   "delete [channel id]",
	Short: "Deletes a subscription by Genesys Cloud channel id",
	Long:  `Deletes a subscription by skill by Genesys Cloud id`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		targetURI := fmt.Sprintf("%s/channels/%s/subscriptions", BaseURI, args[0])
		response, err := CommandService.Delete(targetURI)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(response)
	},
}
