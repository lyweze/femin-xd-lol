package main

import (
	"github.com/lyweze/femin-xd-lol/backend/cmd"
	_ "github.com/lyweze/femin-xd-lol/backend/cmd/commands"
	"github.com/spf13/cobra"
)

func main() {
	cobra.CheckErr(cmd.RootCMD.Execute())
}
