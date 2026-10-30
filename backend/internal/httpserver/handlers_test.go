package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newTestFacade() *handlersFacade {
	return &handlersFacade{ //nolint:exhaustruct
		middleware: middleware.New(&middleware.NewArgs{Usecases: nil, Logger: zap.NewNop()}),
		logger:     zap.NewNop(),
	}
}

// Каждый метод контракта, которого нет в publicRoutes, без cookie отвечает 401
// ещё до хендлеров, поэтому nil-хендлеры в фасаде здесь не вызываются.
func TestProtectedRoutesRejectAnonymous(t *testing.T) {
	t.Parallel()

	handler := newTestFacade().routes()

	routes := []struct{ method, path string }{
		{http.MethodPost, "/api/v1/auth/logout"},
		{http.MethodPost, "/api/v1/auth/logout-all"},
		{http.MethodGet, "/api/v1/me"},
		{http.MethodGet, "/admin/v1/users"},
		{http.MethodPost, "/admin/v1/users"},
		{http.MethodPut, "/admin/v1/users/" + uuid.NewString() + "/role"},
	}

	for _, route := range routes {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			t.Parallel()

			w := httptest.NewRecorder()
			handler.ServeHTTP(w, httptest.NewRequest(route.method, route.path, strings.NewReader(`{}`)))

			require.Equal(t, http.StatusUnauthorized, w.Code)

			var body map[string]string
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			require.Equal(t, "UNAUTHORIZED", body["code"])
		})
	}
}

func TestPublicRoutesAreExactlyRegisterAndLogin(t *testing.T) {
	t.Parallel()

	require.Len(t, publicRoutes, 2)
	require.Contains(t, publicRoutes, "POST /api/v1/auth/register")
	require.Contains(t, publicRoutes, "POST /api/v1/auth/login")
}
