package http_handlers

import (
	"errors"
	"net/http"
	"time"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

var (
	_ g.StrictServerInterface = (*AuthHttpHandlers)(nil)

	errNoSession = errors.New("no session in context")
)

type AuthHttpHandlers struct {
	usecases     *usecases.AuthUsecases
	sessionTTL   time.Duration
	cookieSecure bool
}

type NewArgs struct {
	Usecases     *usecases.AuthUsecases
	SessionTTL   time.Duration
	CookieSecure bool
}

func New(args *NewArgs) *AuthHttpHandlers {
	return &AuthHttpHandlers{
		usecases:     args.Usecases,
		sessionTTL:   args.SessionTTL,
		cookieSecure: args.CookieSecure,
	}
}

func (h *AuthHttpHandlers) sessionCookie(token string) *string {
	cookie := h.baseCookie()
	cookie.Value = token
	cookie.MaxAge = int(h.sessionTTL.Seconds())

	return new(cookie.String())
}

func (h *AuthHttpHandlers) clearedCookie() *string {
	cookie := h.baseCookie()
	cookie.MaxAge = -1

	return new(cookie.String())
}

func (h *AuthHttpHandlers) baseCookie() *http.Cookie {
	return &http.Cookie{ //nolint:exhaustruct
		Name:     middleware.SessionCookieName,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	}
}

func userToHttp(user view_models.User) g.User {
	return g.User{
		Id:       user.ID,
		Email:    openapi_types.Email(user.Email),
		Username: user.Username,
		Role:     g.UserRole(user.Role),
	}
}
