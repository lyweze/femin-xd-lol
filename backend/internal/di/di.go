package di

import (
	"context"
	"fmt"

	"github.com/lyweze/femin-xd-lol/backend/internal/config"
	"github.com/samber/do"
	"github.com/samber/lo"
	"go.uber.org/zap"
)

func InvokeConfig(i *do.Injector) *config.Config {
	return do.MustInvoke[*config.Config](i)
}

func InvokeLogger(i *do.Injector) *zap.Logger {
	return do.MustInvoke[*zap.Logger](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*config.Config, error) {
		config, err := config.GetConfig[config.Config]()
		if err != nil {
			return nil, fmt.Errorf("error while providing env config: %w", err)
		}

		return config, nil
	})

	do.Provide(i, func(i *do.Injector) (*zap.Logger, error) {
		cfg := InvokeConfig(i)

		if cfg.Debug {
			logger, err := provideDebugLogger()
			if err != nil {
				return nil, fmt.Errorf("error while providing logger: %w", err)
			}

			return logger, nil
		}

		return provideLogger(cfg), nil
	})
}

func Shutdown(i *do.Injector, ctx context.Context) {
	logger := InvokeLogger(i)

	select {
	case <-ctx.Done():
		logger.Warn("shutdown context done")
	case err := <-lo.Async(func() error { return i.Shutdown() }):
		if err != nil {
			logger.Error("error while shutting down injector", zap.Error(err))
		}
	}
}
