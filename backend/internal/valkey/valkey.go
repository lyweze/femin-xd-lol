package valkey

import (
	"fmt"

	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/samber/do"
	"github.com/valkey-io/valkey-go"
)

type clientShutdowner struct {
	valkey.Client
}

func (c clientShutdowner) Shutdown() error {
	c.Close()

	return nil
}

func InvokeValkeyClient(i *do.Injector) valkey.Client {
	return do.MustInvoke[clientShutdowner](i).Client
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (clientShutdowner, error) {
		cfg := di.InvokeConfig(i)

		client, err := valkey.NewClient(valkey.ClientOption{ //nolint:exhaustruct
			InitAddress: []string{
				cfg.Valkey.Address,
			},
			Password: cfg.Valkey.Password,
			SelectDB: cfg.Valkey.DB,
		})
		if err != nil {
			return clientShutdowner{}, fmt.Errorf("failed to create valkey client: %w", err)
		}

		return clientShutdowner{Client: client}, nil
	})
}
