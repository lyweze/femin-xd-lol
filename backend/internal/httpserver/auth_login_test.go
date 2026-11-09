//go:build tests

package httpserver

import (
	"net/http"
	"strings"

	auth_usecases "github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func loginBody(email, password string) map[string]string {
	return map[string]string{"email": email, "password": password}
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_Login() {
	const wrongPassword = "wrong password"

	s.Run("ok", func() {
		r := s.Require()
		user := s.createUser(models.UserRoleAdmin)
		c := s.newAPI().client()

		res := c.do(http.MethodPost, loginPath, loginBody(user.Email, testPassword))

		r.Equal(http.StatusOK, res.status, res.text())
		r.Contains(res.text(), `"role":"admin"`)
		r.NotContains(res.text(), "argon2")
		r.Equal(http.StatusOK, c.do(http.MethodGet, mePath, nil).status)
	})

	s.Run("ok: email is case-insensitive", func() {
		user := s.createUser(models.UserRoleUser)

		res := s.newAPI().client().do(http.MethodPost, loginPath, loginBody(strings.ToUpper(user.Email), testPassword))

		s.Equal(http.StatusOK, res.status, res.text())
	})

	s.Run("ok: every login is a separate session", func() {
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		s.NotEqual(api.login(user).session, api.login(user).session)
	})

	s.Run("error: wrong password", func() {
		r := s.Require()
		user := s.createUser(models.UserRoleUser)

		res := s.newAPI().client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword))

		r.Equal(http.StatusUnauthorized, res.status)
		r.Equal("UNAUTHORIZED", res.code())
		r.Nil(res.sessionCookie())
	})

	s.Run("error: reply does not reveal whether the email exists", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		known := api.client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword))
		unknown := api.client().do(http.MethodPost, loginPath, loginBody(randomEmail(), wrongPassword))

		r.Equal(http.StatusUnauthorized, unknown.status)
		r.Equal(known.status, unknown.status)
		r.Equal(known.text(), unknown.text())
	})

	s.Run("error: deleted user cannot log in", func() {
		user := s.createUser(models.UserRoleUser)

		s.exec("UPDATE users SET deleted_at = now() WHERE id = $1", user.ID)

		res := s.newAPI().client().do(http.MethodPost, loginPath, loginBody(user.Email, testPassword))

		s.Equal(http.StatusUnauthorized, res.status, res.text())
	})

	s.Run("error: rate limit by email", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		for range 5 {
			r.Equal(http.StatusUnauthorized, api.client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword)).status)
		}

		limited := api.client().do(http.MethodPost, loginPath, loginBody(user.Email, testPassword))

		r.Equal(http.StatusTooManyRequests, limited.status, "correct password must not pass while limited")
		r.Equal("TOO_MANY_REQUESTS", limited.code())
		r.Nil(limited.sessionCookie())
	})

	s.Run("ok: limit of one email does not touch another", func() {
		r := s.Require()
		api := s.newAPI()
		victim, other := s.createUser(models.UserRoleUser), s.createUser(models.UserRoleUser)

		for range 6 {
			api.client().do(http.MethodPost, loginPath, loginBody(victim.Email, wrongPassword))
		}

		r.Equal(http.StatusOK, api.client().do(http.MethodPost, loginPath, loginBody(other.Email, testPassword)).status)
	})

	s.Run("ok: other spelling of the email hits the same limit", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		for range 5 {
			api.client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword))
		}

		res := api.client().do(http.MethodPost, loginPath, loginBody(strings.ToUpper(user.Email), wrongPassword))

		r.Equal(http.StatusTooManyRequests, res.status)
	})

	s.Run("ok: successful login resets the email counter", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		for range 4 {
			r.Equal(http.StatusUnauthorized, api.client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword)).status)
		}

		r.Equal(http.StatusOK, api.client().do(http.MethodPost, loginPath, loginBody(user.Email, testPassword)).status)

		for range 4 {
			r.Equal(http.StatusUnauthorized, api.client().do(http.MethodPost, loginPath, loginBody(user.Email, wrongPassword)).status)
		}
	})

	s.Run("error: rate limit by ip", func() {
		r := s.Require()
		api := s.newAPI(withLimits(func(l *auth_usecases.Limits) { l.LoginPerIP = 2 }))

		for range 2 {
			r.Equal(http.StatusUnauthorized, api.client().do(http.MethodPost, loginPath, loginBody(randomEmail(), wrongPassword)).status)
		}

		res := api.client().do(http.MethodPost, loginPath, loginBody(randomEmail(), wrongPassword))

		r.Equal(http.StatusTooManyRequests, res.status)
	})

	// Иначе подменой заголовка обходится лимит по IP.
	s.Run("error: X-Real-IP is ignored unless configured", func() {
		r := s.Require()
		api := s.newAPI(withLimits(func(l *auth_usecases.Limits) { l.LoginPerIP = 1 }))

		spoofed := func(ip string) int {
			c := api.client()
			c.headers = map[string]string{"X-Real-IP": ip}

			return c.do(http.MethodPost, loginPath, loginBody(randomEmail(), wrongPassword)).status
		}

		r.Equal(http.StatusUnauthorized, spoofed("203.0.113.1"))
		r.Equal(http.StatusTooManyRequests, spoofed("203.0.113.2"))
	})

	s.Run("ok: configured header separates clients", func() {
		r := s.Require()
		api := s.newAPI(
			withClientIPHeader("X-Real-IP"),
			withLimits(func(l *auth_usecases.Limits) { l.LoginPerIP = 1 }),
		)

		fromIP := func(ip string) int {
			c := api.client()
			c.headers = map[string]string{"X-Real-IP": ip}

			return c.do(http.MethodPost, loginPath, loginBody(randomEmail(), wrongPassword)).status
		}

		r.Equal(http.StatusUnauthorized, fromIP("203.0.113.1"))
		r.Equal(http.StatusUnauthorized, fromIP("203.0.113.2"))
		r.Equal(http.StatusTooManyRequests, fromIP("203.0.113.1"))
	})
}
