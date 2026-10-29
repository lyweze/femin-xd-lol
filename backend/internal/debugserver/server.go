package debugserver

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type HealthChecker func(ctx context.Context) error

type NewArgs struct {
	Port         int
	HealthChecks map[string]HealthChecker
}

type Server struct {
	server *http.Server
}

func New(args *NewArgs) *Server {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /alive", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, r *http.Request) {
		status := http.StatusOK
		res := make(map[string]string, len(args.HealthChecks))

		for name, check := range args.HealthChecks {
			if err := check(r.Context()); err != nil {
				status = http.StatusInternalServerError
				res[name] = err.Error()

				continue
			}

			res[name] = "OK"
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(res)
	})

	return &Server{
		server: &http.Server{ //nolint:exhaustruct
			Addr:              fmt.Sprintf(":%d", args.Port),
			Handler:           mux,
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
