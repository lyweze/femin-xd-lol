//go:build tests

package httpserver

import (
	"net/http"
	"strings"

	auth_usecases "github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func registerBody() map[string]string {
	return map[string]string{
		"email":    randomEmail(),
		"username": randomUsername(),
		"password": testPassword,
	}
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_Register() {
	s.Run("ok: creates user and opens session", func() {
		r := s.Require()
		c := s.newAPI().client()
		body := registerBody()

		res := c.do(http.MethodPost, registerPath, body)

		r.Equal(http.StatusCreated, res.status, res.text())
		r.Equal(http.StatusOK, c.do(http.MethodGet, mePath, nil).status)
		r.Equal("user", s.queryString("SELECT role FROM users WHERE email = $1", body["email"]))
	})

	s.Run("ok: role from the body is ignored", func() {
		r := s.Require()
		body := registerBody()
		body["role"] = "admin"

		res := s.newAPI().client().do(http.MethodPost, registerPath, body)

		r.Equal(http.StatusCreated, res.status, res.text())
		r.Contains(res.text(), `"role":"user"`)
		r.Equal("user", s.queryString("SELECT role FROM users WHERE email = $1", body["email"]))
	})

	s.Run("ok: password is stored only as argon2id", func() {
		r := s.Require()
		body := registerBody()

		res := s.newAPI().client().do(http.MethodPost, registerPath, body)

		r.Equal(http.StatusCreated, res.status)
		r.NotContains(res.text(), "argon2")
		r.NotContains(res.text(), "password")

		hash := s.queryString("SELECT password_hash FROM users WHERE email = $1", body["email"])
		r.True(strings.HasPrefix(hash, "$argon2id$"), hash)
		r.NotContains(hash, testPassword)
	})

	s.Run("ok: cookie attributes", func() {
		r := s.Require()

		cookie := s.newAPI().client().do(http.MethodPost, registerPath, registerBody()).sessionCookie()

		r.NotNil(cookie)
		r.True(cookie.HttpOnly)
		r.Equal(http.SameSiteLaxMode, cookie.SameSite)
		r.Equal(int(sessionTTL.Seconds()), cookie.MaxAge)
		r.Equal("/", cookie.Path)
		r.False(cookie.Secure)
	})

	s.Run("ok: cookie is Secure when enabled", func() {
		cookie := s.newAPI(withSecureCookie()).client().do(http.MethodPost, registerPath, registerBody()).sessionCookie()

		s.Require().NotNil(cookie)
		s.True(cookie.Secure)
	})

	s.Run("error: email taken, other case", func() {
		r := s.Require()
		user := s.createUser(models.UserRoleUser)
		body := registerBody()
		body["email"] = strings.ToUpper(user.Email)

		res := s.newAPI().client().do(http.MethodPost, registerPath, body)

		r.Equal(http.StatusConflict, res.status)
		r.Equal("CONFLICT", res.code())
		r.Nil(res.sessionCookie())
	})

	s.Run("error: username taken, other case", func() {
		user := s.createUser(models.UserRoleUser)
		body := registerBody()
		body["username"] = strings.ToUpper(user.Username)

		s.Equal(http.StatusConflict, s.newAPI().client().do(http.MethodPost, registerPath, body).status)
	})

	validation := map[string]any{
		"bad email":      map[string]string{"email": "nope", "username": "user1", "password": testPassword},
		"short password": map[string]string{"email": "a@femin.test", "username": "user1", "password": "short"},
		"short username": map[string]string{"email": "a@femin.test", "username": "ab", "password": testPassword},
		"missing fields": map[string]string{},
		"broken json":    rawBody("{oops"),
	}

	for name, body := range validation {
		s.Run("error: "+name, func() {
			r := s.Require()

			res := s.newAPI().client().do(http.MethodPost, registerPath, body)

			r.Equal(http.StatusUnprocessableEntity, res.status, res.text())
			r.Equal("VALIDATION_ERROR", res.code())
			r.Nil(res.sessionCookie())
			r.Equal(0, s.queryInt("SELECT count(*) FROM users"))
		})
	}

	// Тело валидно во всём, кроме размера, поэтому 422 здесь даёт только лимит.
	s.Run("error: body over 1 MB", func() {
		r := s.Require()
		body := registerBody()
		body["padding"] = strings.Repeat("a", 2_000_000)

		res := s.newAPI().client().do(http.MethodPost, registerPath, body)

		r.Equal(http.StatusUnprocessableEntity, res.status, res.text())
		r.Contains(res.text(), "too large")
		r.Equal(0, s.queryInt("SELECT count(*) FROM users"))
	})

	s.Run("error: rate limit by ip", func() {
		r := s.Require()
		api := s.newAPI(withLimits(func(l *auth_usecases.Limits) { l.RegisterPerIP = 2 }))

		r.Equal(http.StatusCreated, api.client().do(http.MethodPost, registerPath, registerBody()).status)
		r.Equal(http.StatusCreated, api.client().do(http.MethodPost, registerPath, registerBody()).status)

		res := api.client().do(http.MethodPost, registerPath, registerBody())

		r.Equal(http.StatusTooManyRequests, res.status)
		r.Equal("TOO_MANY_REQUESTS", res.code())
		r.Equal(2, s.queryInt("SELECT count(*) FROM users"))
	})
}
