package topics

import (
	"gc/services"

	"github.com/spf13/cobra"
)

var BaseURI = "api/v2/notifications"
var CommandService services.CommandService

var topicsCmd = &cobra.Command{
	Use:   "topics",
	Short: "Manages Genesys Cloud notification topics",
	Long:  `Manages Genesys Cloud notification topics`,
}

func TopicsCmd() *cobra.Command {
	topicsCmd.AddCommand(listAvailableTopicsCmd)

	listAvailableTopicsCmd.Flags().BoolP("details", "d", false, "List the details for all notifications (description, requiresPermissions, schema, transports, publicApiTemplateUriPaths)")
	return topicsCmd
}

func init() {
	CommandService = services.NewCommandService(topicsCmd)
}
