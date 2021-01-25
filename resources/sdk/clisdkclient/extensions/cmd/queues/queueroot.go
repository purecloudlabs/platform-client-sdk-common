package queues

import "gc/cmd/user"

func init() {
	queuesCmd.AddCommand(user.Cmduser())
}