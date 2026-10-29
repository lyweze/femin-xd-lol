package cmd

import (
	"github.com/spf13/cobra"
)

var RootCMD = &cobra.Command{ //nolint:exhaustruct,gochecknoglobals
	Use:           "femin",
	SilenceErrors: true,
	SilenceUsage:  true,
}
