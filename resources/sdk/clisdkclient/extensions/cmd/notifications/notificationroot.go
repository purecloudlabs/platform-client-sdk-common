package notifications

import (
	"gc/cmd/notifications/channels"
	"gc/cmd/notifications/topics"
	"gc/cmd/notifications/subscriptions"
	"gc/services"

	// "gc/notifications/subscriptions"

	"github.com/spf13/cobra"
)

var BaseURI = "api/v2/notifications"
var CommandService services.CommandService

var notificationsCmd = &cobra.Command{
	Use:   "notifications",
	Short: "Manages Genesys Cloud notifications",
	Long:  `Manages Genesys Cloud notifications`,
}

func Cmdnotifications() *cobra.Command {
	notificationsCmd.AddCommand(topics.TopicsCmd())
	notificationsCmd.AddCommand(channels.ChannelsCmd())
	notificationsCmd.AddCommand(subscriptions.SubscriptionsCmd())

	return notificationsCmd
}

func init() {
	CommandService = services.NewCommandService(notificationsCmd)
}
