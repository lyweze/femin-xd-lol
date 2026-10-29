package httpserver

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	server *http.Server
}

func NewServer(port int, handler http.Handler) *Server {
	return &Server{
		server: &http.Server{ //nolint:exhaustruct
			Addr:              fmt.Sprintf(":%d", port),
			Handler:           handler,
			ReadHeaderTimeout: 5 * time.Second, //nolint:mnd
		},
	}
}

func (s *Server) Serve() error {
	return s.server.ListenAndServe() //nolint:wrapcheck
}

func (s *Server) Shutdown() error {
	return s.server.Shutdown(context.Background()) //nolint:wrapcheck
}
