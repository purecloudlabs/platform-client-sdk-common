package queues

import (
	"gc/utils"
	"gc/services"
	"log"
	"strings"

	"github.com/spf13/cobra"
)

func init() {
	queuesCmd.AddCommand(getUsersQueuesCmd)
}

var getUsersQueuesCmd = &cobra.Command{
	Use:   "users [queue id]",
	Short: "Retrieves the users assigned to a queue by genesys cloud queue id",
	Long:  `Retrieves the users assigned to a queue by genesys cloud queue id`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		path := "/api/v2/routing/queues/{queueId}/users"
		path = strings.Replace(path, "{queueId}", args[0], 1)

		retryFunc := services.Retry(path, CommandService.List)
		results, err := retryFunc(nil)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
