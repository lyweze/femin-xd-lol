package commands

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/signal"
	"syscall"

	"github.com/lyweze/femin-xd-lol/backend/cmd"
	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/debugserver"
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/httpserver"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users"
	"github.com/lyweze/femin-xd-lol/backend/internal/valkey"
	"github.com/samber/do"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

func init() { //nolint:gochecknoinits
	cmd.RootCMD.AddCommand(Serve)
}

var Serve = &cobra.Command{ //nolint:exhaustruct,gochecknoglobals
	Use:  "serve",
	RunE: runE,
}

func provideServe(container *do.Injector) {
	di.Provide(container)
	valkey.Provide(container)
	db.ProvideServe(container)
	users.Provide(container)
	auth.Provide(container)
	example.Provide(container)
	httpserver.Provide(container)
	debugserver.Provide(container)
}

func runE(_ *cobra.Command, _ []string) error {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	container := do.New()

	provideServe(container)

	config := di.InvokeConfig(container)

	logger := di.InvokeLogger(container)
	zap.ReplaceGlobals(logger)

	ch := make(chan error, 2) //nolint:mnd

	debugServer := debugserver.InvokeDebugServer(container)

	go func() {
		if err := debugServer.Serve(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			ch <- fmt.Errorf("can't start debug server: %w", err)
		}
	}()

	httpServer := httpserver.InvokeServer(container)

	go func() {
		if err := httpServer.Serve(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			ch <- fmt.Errorf("can't start http server: %w", err)
		}
	}()

	logger.Info("server started",
		zap.Int("http_port", config.HTTPServer.Port),
		zap.Int("debug_port", config.DebugServerListenPort),
	)

	select {
	case err := <-ch:
		logger.Error("job finished with error", zap.Error(err))

		return err
	case <-ctx.Done():
		logger.Info("shutting down server due to signal")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()

	di.Shutdown(container, shutdownCtx)

	return nil
}
