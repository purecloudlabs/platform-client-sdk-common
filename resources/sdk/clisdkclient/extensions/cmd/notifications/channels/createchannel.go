package channels

import (
	"fmt"
	"gc/utils"
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
		results, err := CommandService.Post(targetURI, "{}")
		if err != nil {
			log.Fatal(err)
		}

		utils.Render(results)
	},
}
