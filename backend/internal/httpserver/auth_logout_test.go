//go:build tests

package httpserver

import (
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func (s *HttpHandlersTestSuite) Test_handlersFacade_Logout() {
	s.Run("ok: closes the session and clears the cookie", func() {
		r := s.Require()
		api := s.newAPI()
		c := api.login(s.createUser(models.UserRoleUser))
		stale := api.client()
		stale.session = c.session

		res := c.do(http.MethodPost, logoutPath, nil)

		r.Equal(http.StatusNoContent, res.status, res.text())

		cookie := res.sessionCookie()
		r.NotNil(cookie)
		r.Negative(cookie.MaxAge)
		r.Empty(cookie.Value)

		r.Equal(http.StatusUnauthorized, stale.do(http.MethodGet, mePath, nil).status)
	})

	s.Run("ok: other sessions of the user stay alive", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)
		first, second := api.login(user), api.login(user)

		r.Equal(http.StatusNoContent, first.do(http.MethodPost, logoutPath, nil).status)
		r.Equal(http.StatusOK, second.do(http.MethodGet, mePath, nil).status)
	})

	s.Run("error: session already closed", func() {
		r := s.Require()
		api := s.newAPI()
		c := api.login(s.createUser(models.UserRoleUser))
		stale := api.client()
		stale.session = c.session

		r.Equal(http.StatusNoContent, c.do(http.MethodPost, logoutPath, nil).status)
		r.Equal(http.StatusUnauthorized, stale.do(http.MethodPost, logoutPath, nil).status)
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_LogoutAll() {
	s.Run("ok: closes every session of the user", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)
		first, second, third := api.login(user), api.login(user), api.login(user)

		res := first.do(http.MethodPost, logoutAllPath, nil)

		r.Equal(http.StatusNoContent, res.status, res.text())
		r.NotNil(res.sessionCookie())
		r.Negative(res.sessionCookie().MaxAge)
		r.Equal(http.StatusUnauthorized, second.do(http.MethodGet, mePath, nil).status)
		r.Equal(http.StatusUnauthorized, third.do(http.MethodGet, mePath, nil).status)
	})

	s.Run("ok: leaves nothing of the user in valkey", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)
		first := api.login(user)
		api.login(user)

		r.Equal(http.StatusNoContent, first.do(http.MethodPost, logoutAllPath, nil).status)

		for _, key := range s.valkeyKeys() {
			r.NotContains(key, "session", key)
		}
	})

	s.Run("ok: other users are not touched", func() {
		r := s.Require()
		api := s.newAPI()
		user, other := s.createUser(models.UserRoleUser), s.createUser(models.UserRoleUser)
		c, otherClient := api.login(user), api.login(other)

		r.Equal(http.StatusNoContent, c.do(http.MethodPost, logoutAllPath, nil).status)
		r.Equal(http.StatusOK, otherClient.do(http.MethodGet, mePath, nil).status)
	})
}
