package users

import (
	"gc/cmd/queue"
	"gc/cmd/skill"
)

func init() {
	usersCmd.AddCommand(queue.Cmdqueue())
	usersCmd.AddCommand(skill.Cmdskill())
}