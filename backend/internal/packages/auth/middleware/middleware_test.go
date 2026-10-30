package middleware_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type fakeUsecases struct {
	userID      uuid.UUID
	authErr     error
	adminErr    error
	adminCalled bool
}

func (f *fakeUsecases) Authenticate(_ context.Context, _ string) (uuid.UUID, error) {
	return f.userID, f.authErr
}

func (f *fakeUsecases) RequireAdmin(_ context.Context, _ uuid.UUID) error {
	f.adminCalled = true

	return f.adminErr
}

func newMiddleware(f *fakeUsecases) *middleware.Middleware {
	return middleware.New(&middleware.NewArgs{Usecases: f, Logger: zap.NewNop()})
}

func never(_ *http.Request) bool { return false }

func request(withCookie bool) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if withCookie {
		r.AddCookie(&http.Cookie{Name: middleware.SessionCookieName, Value: "token"}) //nolint:exhaustruct
	}

	return r
}

func serve(h http.Handler, r *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()

	h.ServeHTTP(w, r)

	return w
}

func TestRequireSessionWithoutCookie(t *testing.T) {
	t.Parallel()

	called := false
	h := newMiddleware(&fakeUsecases{}).RequireSession(never)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		called = true
	}))

	w := serve(h, request(false))

	require.Equal(t, http.StatusUnauthorized, w.Code)
	require.False(t, called)
	require.JSONEq(t, `{"code":"UNAUTHORIZED"}`, w.Body.String())
}

func TestRequireSessionUnknownToken(t *testing.T) {
	t.Parallel()

	h := newMiddleware(&fakeUsecases{authErr: usecases.ErrUnauthorized}).RequireSession(never)(http.NotFoundHandler())

	w := serve(h, request(true))

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireSessionStorageErrorIsNotUnauthorized(t *testing.T) {
	t.Parallel()

	h := newMiddleware(&fakeUsecases{authErr: errors.New("valkey is down")}).RequireSession(never)(http.NotFoundHandler())

	w := serve(h, request(true))

	require.Equal(t, http.StatusInternalServerError, w.Code)
	require.NotContains(t, w.Body.String(), "valkey")
}

func TestRequireSessionPutsSessionIntoContext(t *testing.T) {
	t.Parallel()

	userID := uuid.New()

	var (
		gotUser  uuid.UUID
		gotToken string
	)

	h := newMiddleware(&fakeUsecases{userID: userID}).RequireSession(never)(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		gotUser, _ = requestctx.UserID(r.Context())
		gotToken, _ = requestctx.SessionToken(r.Context())
	}))

	w := serve(h, request(true))

	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, userID, gotUser)
	require.Equal(t, "token", gotToken)
}

func TestRequireSessionPublicRoute(t *testing.T) {
	t.Parallel()

	called := false
	h := newMiddleware(&fakeUsecases{}).RequireSession(func(*http.Request) bool { return true })(
		http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }),
	)

	serve(h, request(false))

	require.True(t, called)
}

func TestRequireAdmin(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		adminErr error
		status   int
	}{
		"admin":        {adminErr: nil, status: http.StatusOK},
		"not admin":    {adminErr: usecases.ErrForbidden, status: http.StatusForbidden},
		"user deleted": {adminErr: usecases.ErrUnauthorized, status: http.StatusUnauthorized},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			f := &fakeUsecases{userID: uuid.New(), adminErr: tt.adminErr}
			m := newMiddleware(f)
			h := m.RequireSession(never)(m.RequireAdmin(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})))

			w := serve(h, request(true))

			require.Equal(t, tt.status, w.Code)
		})
	}
}

func TestRequireAdminWithoutSession(t *testing.T) {
	t.Parallel()

	f := &fakeUsecases{}

	w := serve(newMiddleware(f).RequireAdmin(http.NotFoundHandler()), request(false))

	require.Equal(t, http.StatusUnauthorized, w.Code)
	require.False(t, f.adminCalled)
}

func TestClientIP(t *testing.T) {
	t.Parallel()

	got := ""
	inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = requestctx.ClientIP(r.Context())
	})

	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "192.0.2.1:1234"
	r.Header.Set("X-Real-IP", "203.0.113.9")

	middleware.ClientIP("")(inner).ServeHTTP(httptest.NewRecorder(), r)
	require.Equal(t, "192.0.2.1", got, "header must be ignored unless configured")

	middleware.ClientIP("X-Real-IP")(inner).ServeHTTP(httptest.NewRecorder(), r)
	require.Equal(t, "203.0.113.9", got)
}
