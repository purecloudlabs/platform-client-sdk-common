package queues

import "github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/user"

func init() {
	queuesCmd.AddCommand(user.Cmduser())
}