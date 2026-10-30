package auth

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/http_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/rate_limiter"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/sessions"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users"
	"github.com/lyweze/femin-xd-lol/backend/internal/valkey"
	"github.com/samber/do"
)

func InvokeHttpHandlers(i *do.Injector) *http_handlers.AuthHttpHandlers {
	return do.MustInvoke[*http_handlers.AuthHttpHandlers](i)
}

func InvokeMiddleware(i *do.Injector) *middleware.Middleware {
	return do.MustInvoke[*middleware.Middleware](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*http_handlers.AuthHttpHandlers, error) {
		cfg := di.InvokeConfig(i)

		return http_handlers.New(&http_handlers.NewArgs{
			Usecases:     do.MustInvoke[*usecases.AuthUsecases](i),
			SessionTTL:   cfg.Session.TTL,
			CookieSecure: cfg.Session.CookieSecure,
		}), nil
	})

	do.Provide(i, func(i *do.Injector) (*middleware.Middleware, error) {
		return middleware.New(&middleware.NewArgs{
			Usecases: do.MustInvoke[*usecases.AuthUsecases](i),
			Logger:   di.InvokeLogger(i),
		}), nil
	})

	do.Provide(i, func(i *do.Injector) (*usecases.AuthUsecases, error) {
		cfg := di.InvokeConfig(i)
		client := valkey.InvokeValkeyClient(i)

		return usecases.New(&usecases.NewArgs{
			Users: users.InvokeUsecases(i),
			Sessions: sessions.New(&sessions.NewArgs{
				Client:  client,
				TTL:     cfg.Session.TTL,
				Timeout: cfg.Valkey.Timeout,
			}),
			RateLimiter: rate_limiter.New(&rate_limiter.NewArgs{
				Client:  client,
				Timeout: cfg.Valkey.Timeout,
			}),
			Limits: usecases.Limits{
				LoginPerEmail: cfg.AuthLimits.LoginPerEmail,
				LoginPerIP:    cfg.AuthLimits.LoginPerIP,
				RegisterPerIP: cfg.AuthLimits.RegisterPerIP,
				Window:        cfg.AuthLimits.Window,
			},
		}), nil
	})
}
