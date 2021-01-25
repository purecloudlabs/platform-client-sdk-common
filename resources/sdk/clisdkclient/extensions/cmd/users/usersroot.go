package users

import "gc/cmd/queue"

func init() {
	usersCmd.AddCommand(queue.Cmdqueue())
}