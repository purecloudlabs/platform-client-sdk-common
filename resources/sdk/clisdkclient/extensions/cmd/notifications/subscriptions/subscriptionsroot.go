package subscriptions

import (
	"gc/services"

	// "gc/notifications/subscriptions"

	"github.com/spf13/cobra"
)

var BaseURI = "api/v2/notifications"
var CommandService services.CommandService

var subscriptionsCmd = &cobra.Command{
	Use:   "subscriptions",
	Short: "Manages Genesys Cloud notification subscriptions",
	Long:  `Manages Genesys Cloud notification subscriptions`,
}

func SubscriptionsCmd() *cobra.Command {
	subscriptionsCmd.AddCommand(createSubscriptionsCmd)
	subscriptionsCmd.AddCommand(getSubscriptionsCmd)
	subscriptionsCmd.AddCommand(deleteSubscriptionsCmd)

	createSubscriptionsCmd.Flags().StringP("file", "f", "", "File name containing the JSON for creating subscriptions")
	return subscriptionsCmd
}

func init() {
	CommandService = services.NewCommandService(subscriptionsCmd)
}
