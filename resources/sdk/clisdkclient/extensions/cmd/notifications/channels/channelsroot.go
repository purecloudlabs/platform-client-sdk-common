package channels

import (
	"gc/services"

	"github.com/spf13/cobra"
)

var BaseURI = "api/v2/notifications"
var CommandService services.CommandService

var channelsCmd = &cobra.Command{
	Use:   "channels",
	Short: "Manages Genesys Cloud notification channels",
	Long:  `Manages Genesys Cloud notification channels`,
}

func ChannelsCmd() *cobra.Command {
	channelsCmd.AddCommand(createChannelCmd)
	channelsCmd.AddCommand(listAvailableChannelsCmd)
	channelsCmd.AddCommand(listenChannelCmd)

	return channelsCmd
}

func init() {
	CommandService = services.NewCommandService(channelsCmd)
}
