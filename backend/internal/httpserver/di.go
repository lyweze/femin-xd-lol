package httpserver

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users"
	"github.com/samber/do"
)

func InvokeServer(i *do.Injector) *Server {
	return do.MustInvoke[*Server](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*Server, error) {
		cfg := di.InvokeConfig(i)

		handlers := &handlersFacade{
			public:         publicHandlers{AuthHttpHandlers: auth.InvokeHttpHandlers(i)},
			admin:          adminHandlers{AdminHandlers: users.InvokeAdminHandlers(i)},
			example:        example.InvokeHttpHandlers(i),
			middleware:     auth.InvokeMiddleware(i),
			logger:         di.InvokeLogger(i),
			clientIPHeader: cfg.HTTPServer.ClientIPHeader,
		}

		return NewServer(cfg.HTTPServer.Port, handlers.routes()), nil
	})
}
