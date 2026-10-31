//go:build tests

package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
	mocks "github.com/lyweze/femin-xd-lol/backend/tests/mocks/packages/auth/middleware"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newMiddleware(t *testing.T) (*Middleware, *mocks.MockUsecases) {
	m := mocks.NewMockUsecases(t)

	return New(&NewArgs{Usecases: m, Logger: zap.NewNop()}), m
}

func never(_ *http.Request) bool { return false }

func newRequest(withCookie bool) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if withCookie {
		r.AddCookie(&http.Cookie{Name: SessionCookieName, Value: "token"}) //nolint:exhaustruct
	}

	return r
}

func serve(h http.Handler, r *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()

	h.ServeHTTP(w, r)

	return w
}

// mustNotRun fails the test if the protected handler is reached.
func mustNotRun(t *testing.T) http.Handler {
	return http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Error("handler must not be reached")
	})
}

func TestMiddleware_RequireSession(t *testing.T) {
	t.Parallel()

	t.Run("ok: puts the session into context", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, u := newMiddleware(t)

		userID := uuid.New()
		u.EXPECT().Authenticate(mock.Anything, "token").Return(userID, nil).Once()

		var (
			gotUser  uuid.UUID
			gotToken string
		)

		w := serve(m.RequireSession(never)(http.HandlerFunc(func(_ http.ResponseWriter, req *http.Request) {
			gotUser, _ = requestctx.UserID(req.Context())
			gotToken, _ = requestctx.SessionToken(req.Context())
		})), newRequest(true))

		r.Equal(http.StatusOK, w.Code)
		r.Equal(userID, gotUser)
		r.Equal("token", gotToken)
	})

	t.Run("ok: public route needs no session", func(t *testing.T) {
		t.Parallel()

		m, _ := newMiddleware(t)

		called := false

		serve(m.RequireSession(func(*http.Request) bool { return true })(
			http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }),
		), newRequest(false))

		require.True(t, called)
	})

	t.Run("error: no cookie", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, _ := newMiddleware(t)

		w := serve(m.RequireSession(never)(mustNotRun(t)), newRequest(false))

		r.Equal(http.StatusUnauthorized, w.Code)
		r.JSONEq(`{"code":"UNAUTHORIZED"}`, w.Body.String())
	})

	t.Run("error: unknown token", func(t *testing.T) {
		t.Parallel()

		m, u := newMiddleware(t)

		u.EXPECT().Authenticate(mock.Anything, mock.Anything).Return(uuid.Nil, usecases.ErrUnauthorized).Once()

		w := serve(m.RequireSession(never)(mustNotRun(t)), newRequest(true))

		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("error: storage failure is 500 and hides details", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, u := newMiddleware(t)

		u.EXPECT().Authenticate(mock.Anything, mock.Anything).Return(uuid.Nil, errors.New("valkey is down")).Once()

		w := serve(m.RequireSession(never)(mustNotRun(t)), newRequest(true))

		r.Equal(http.StatusInternalServerError, w.Code)
		r.NotContains(w.Body.String(), "valkey")
	})

	t.Run("error: cancelled request writes nothing", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, u := newMiddleware(t)

		u.EXPECT().Authenticate(mock.Anything, mock.Anything).Return(uuid.Nil, context.Canceled).Once()

		w := serve(m.RequireSession(never)(mustNotRun(t)), newRequest(true))

		r.Empty(w.Body.String())
	})
}

func TestMiddleware_RequireAdmin(t *testing.T) {
	t.Parallel()

	withSession := func() *http.Request {
		r := newRequest(true)

		return r.WithContext(requestctx.WithSession(r.Context(), uuid.New(), "token"))
	}

	t.Run("ok: admin", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, u := newMiddleware(t)

		u.EXPECT().RequireAdmin(mock.Anything, mock.Anything).Return(nil).Once()

		called := false

		w := serve(m.RequireAdmin(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true })), withSession())

		r.Equal(http.StatusOK, w.Code)
		r.True(called)
	})

	t.Run("error: plain user", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		m, u := newMiddleware(t)

		u.EXPECT().RequireAdmin(mock.Anything, mock.Anything).Return(usecases.ErrForbidden).Once()

		w := serve(m.RequireAdmin(mustNotRun(t)), withSession())

		r.Equal(http.StatusForbidden, w.Code)
		r.JSONEq(`{"code":"FORBIDDEN"}`, w.Body.String())
	})

	t.Run("error: user is gone", func(t *testing.T) {
		t.Parallel()

		m, u := newMiddleware(t)

		u.EXPECT().RequireAdmin(mock.Anything, mock.Anything).Return(usecases.ErrUnauthorized).Once()

		w := serve(m.RequireAdmin(mustNotRun(t)), withSession())

		require.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("error: no session in context never reaches the role check", func(t *testing.T) {
		t.Parallel()

		m, _ := newMiddleware(t)

		w := serve(m.RequireAdmin(mustNotRun(t)), newRequest(false))

		require.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestClientIP(t *testing.T) {
	t.Parallel()

	newReq := func() *http.Request {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = "192.0.2.1:1234"
		r.Header.Set("X-Real-IP", "203.0.113.9")

		return r
	}

	ip := func(header string, r *http.Request) string {
		got := ""

		ClientIP(header)(http.HandlerFunc(func(_ http.ResponseWriter, req *http.Request) {
			got = requestctx.ClientIP(req.Context())
		})).ServeHTTP(httptest.NewRecorder(), r)

		return got
	}

	t.Run("ok: header is ignored unless configured", func(t *testing.T) {
		t.Parallel()

		require.Equal(t, "192.0.2.1", ip("", newReq()))
	})

	t.Run("ok: configured header wins", func(t *testing.T) {
		t.Parallel()

		require.Equal(t, "203.0.113.9", ip("X-Real-IP", newReq()))
	})

	t.Run("ok: falls back to the connection when the header is empty", func(t *testing.T) {
		t.Parallel()

		r := newReq()
		r.Header.Del("X-Real-IP")

		require.Equal(t, "192.0.2.1", ip("X-Real-IP", r))
	})
}
