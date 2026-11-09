//go:build tests

package debugserver

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestServer(t *testing.T) {
	t.Parallel()

	get := func(checks map[string]HealthChecker, path string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()

		New(&NewArgs{Port: 0, HealthChecks: checks}).server.Handler.
			ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))

		return w
	}

	ok := func(context.Context) error { return nil }

	t.Run("ok: alive does not depend on checks", func(t *testing.T) {
		t.Parallel()

		w := get(map[string]HealthChecker{"valkey": func(context.Context) error { return errors.New("down") }}, "/alive")

		require.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("ok: ready when every check passes", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)

		w := get(map[string]HealthChecker{"postgres": ok, "valkey": ok}, "/ready")

		r.Equal(http.StatusOK, w.Code)
		r.JSONEq(`{"postgres":"OK","valkey":"OK"}`, w.Body.String())
	})

	t.Run("error: one failed check fails ready", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)

		w := get(map[string]HealthChecker{
			"postgres": ok,
			"valkey":   func(context.Context) error { return errors.New("down") },
		}, "/ready")

		r.Equal(http.StatusInternalServerError, w.Code)
		r.JSONEq(`{"postgres":"OK","valkey":"down"}`, w.Body.String())
	})

	// Hung dependency must not hang the readiness probe.
	t.Run("error: hung check is cut off by the timeout", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)

		started := time.Now()

		w := get(map[string]HealthChecker{"valkey": func(ctx context.Context) error {
			<-ctx.Done()

			return ctx.Err()
		}}, "/ready")

		r.Equal(http.StatusInternalServerError, w.Code)
		r.Less(time.Since(started), readyTimeout+time.Second)
	})
}
