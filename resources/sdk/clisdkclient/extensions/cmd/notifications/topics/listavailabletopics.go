package topics

import (
	"fmt"
	"gc/utils"
	"log"

	"github.com/spf13/cobra"
)

var listAvailableTopicsCmd = &cobra.Command{
	Use: "list",

	Short: "Lists all available notification topics",
	Long:  `Lists all available notification topics`,
	Args:  cobra.NoArgs,

	Run: func(cmd *cobra.Command, args []string) {
		//This really sucks.  AvailableTopics does not implement the entities pagination
		details, _ := cmd.Flags().GetBool("details")
		targetURI := fmt.Sprintf("%s/availabletopics", BaseURI)
		if details {
			targetURI = fmt.Sprintf("%s/availabletopics?expand=description,requiresPermissions,schema,transports,publicApiTemplateUriPaths", BaseURI)
		}

		results, err := CommandService.Get(targetURI)
		if err != nil {
			log.Fatal(err)
		}
		utils.Render(results)
	},
}
