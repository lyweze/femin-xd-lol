package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
	"go.uber.org/zap"
)

const (
	// SessionCookieName совпадает с securitySchemes в OpenAPI.
	SessionCookieName = "femin_session"

	codeUnauthorized  = "UNAUTHORIZED"
	codeForbidden     = "FORBIDDEN"
	codeInternalError = "INTERNAL_ERROR"
)

type Usecases interface {
	Authenticate(ctx context.Context, token string) (uuid.UUID, error)
	RequireAdmin(ctx context.Context, userID uuid.UUID) error
}

type Middleware struct {
	usecases Usecases
	logger   *zap.Logger
}

type NewArgs struct {
	Usecases Usecases
	Logger   *zap.Logger
}

func New(args *NewArgs) *Middleware {
	return &Middleware{
		usecases: args.Usecases,
		logger:   args.Logger,
	}
}

// RequireSession пропускает только запросы с действующей сессией. Закрыто по
// умолчанию: новый маршрут защищён, пока его явно не отметят в isPublic.
func (m *Middleware) RequireSession(isPublic func(r *http.Request) bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublic(r) {
				next.ServeHTTP(w, r)

				return
			}

			cookie, err := r.Cookie(SessionCookieName)
			if err != nil {
				writeError(w, http.StatusUnauthorized, codeUnauthorized)

				return
			}

			userID, err := m.usecases.Authenticate(r.Context(), cookie.Value)
			if err != nil {
				m.fail(w, r, err)

				return
			}

			next.ServeHTTP(w, r.WithContext(requestctx.WithSession(r.Context(), userID, cookie.Value)))
		})
	}
}

// RequireAdmin должен стоять после RequireSession.
func (m *Middleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := requestctx.UserID(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, codeUnauthorized)

			return
		}

		if err := m.usecases.RequireAdmin(r.Context(), userID); err != nil {
			m.fail(w, r, err)

			return
		}

		next.ServeHTTP(w, r)
	})
}

func (m *Middleware) fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, usecases.ErrUnauthorized):
		writeError(w, http.StatusUnauthorized, codeUnauthorized)
	case errors.Is(err, usecases.ErrForbidden):
		writeError(w, http.StatusForbidden, codeForbidden)
	case errors.Is(err, context.Canceled):
		// Клиент ушёл, отвечать некому.
	default:
		m.logger.Error("failed to check access", zap.Error(err), zap.String("path", r.URL.Path))
		writeError(w, http.StatusInternalServerError, codeInternalError)
	}
}

// ClientIP кладёт IP клиента в контекст. Заголовок читается, только если он задан
// в конфиге, иначе клиент мог бы подделать IP и обойти лимиты.
func ClientIP(header string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(requestctx.WithClientIP(r.Context(), clientIP(r, header))))
		})
	}
}

func clientIP(r *http.Request, header string) string {
	if header != "" {
		if value := strings.TrimSpace(r.Header.Get(header)); value != "" {
			return value
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}

	return host
}

func writeError(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"code": code})
}
