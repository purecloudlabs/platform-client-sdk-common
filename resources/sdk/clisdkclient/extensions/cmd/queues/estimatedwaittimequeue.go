package queues

import (
	"fmt"
	"gc/utils"
	"log"
	"net/url"
	"strings"

	"github.com/spf13/cobra"
)

func init() {
	getEstimatedWaitTimeQueuesCmd.Flags().String("conversationId", "", "filter by conversation id")
	queuesCmd.AddCommand(getEstimatedWaitTimeQueuesCmd)
}

var getEstimatedWaitTimeQueuesCmd = &cobra.Command{
	Use:   "estimatedwait [queue id]",
	Short: "Retrieves a queue's estimated wait time by genesys cloud queue id",
	Long:  `Retrieves a queue's estimated wait time by genesys cloud queue id`,
	Args:  cobra.ExactArgs(1),

	Run: func(cmd *cobra.Command, args []string) {
		path := "/api/v2/routing/queues/{queueId}/estimatedwaittime"
		path = strings.Replace(path, "{queueId}", args[0], 1)

		queryParams := make(map[string]string)
		conversationId := utils.GetFlag(cmd.Flags(), "string", "conversationId")
		if conversationId != "" {
			queryParams["conversationId"] = conversationId
		}
		urlString := path
		if len(queryParams) > 0 {
			urlString = fmt.Sprintf("%v?", path)
			for k, v := range queryParams {
				urlString += fmt.Sprintf("%v=%v&", url.QueryEscape(strings.TrimSpace(k)), url.QueryEscape(strings.TrimSpace(v)))
			}
			urlString = strings.TrimSuffix(urlString, "&")
		}

		results, err := CommandService.Get(urlString)
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
