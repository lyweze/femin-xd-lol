package httpserver

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example"
	"github.com/samber/do"
)

func InvokeServer(i *do.Injector) *Server {
	return do.MustInvoke[*Server](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*Server, error) {
		cfg := di.InvokeConfig(i)

		handlers := &handlersFacade{
			example: example.InvokeHttpHandlers(i),
		}

		return NewServer(cfg.HTTPServer.Port, handlers.routes()), nil
	})
}
