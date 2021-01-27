package groups

import "gc/cmd/members"

func init() {
	groupsCmd.AddCommand(members.Cmdmembers())
}