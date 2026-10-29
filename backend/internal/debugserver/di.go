package debugserver

import (
	"context"
	"fmt"

	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/samber/do"
)

func InvokeDebugServer(i *do.Injector) *Server {
	return do.MustInvoke[*Server](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*Server, error) {
		cfg := di.InvokeConfig(i)

		pool := db.InvokeMaster(i)

		return New(&NewArgs{
			Port: cfg.DebugServerListenPort,
			HealthChecks: map[string]HealthChecker{
				"postgres": func(ctx context.Context) error {
					if err := pool.Ping(ctx); err != nil {
						return fmt.Errorf("failed to ping postgres: %w", err)
					}

					return nil
				},
			},
		}), nil
	})
}
