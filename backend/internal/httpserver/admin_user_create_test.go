//go:build tests

package httpserver

import (
	"net/http"
	"strings"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func createUserBody(role string) map[string]string {
	body := registerBody()
	body["role"] = role

	return body
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminCreateUser() {
	s.Run("ok: new admin logs in and has access", func() {
		r := s.Require()
		api := s.newAPI()
		c := api.login(s.createUser(models.UserRoleAdmin))
		body := createUserBody("admin")

		res := c.do(http.MethodPost, adminUsers, body)

		r.Equal(http.StatusCreated, res.status, res.text())
		r.NotContains(res.text(), "argon2")
		r.NotContains(res.text(), "password")

		created := api.client()
		r.Equal(http.StatusOK, created.do(http.MethodPost, loginPath, loginBody(body["email"], testPassword)).status)
		r.Equal(http.StatusOK, created.do(http.MethodGet, adminUsers, nil).status)
	})

	s.Run("ok: can create a plain user", func() {
		r := s.Require()
		c := s.newAPI().login(s.createUser(models.UserRoleAdmin))
		body := createUserBody("user")

		r.Equal(http.StatusCreated, c.do(http.MethodPost, adminUsers, body).status)
		r.Equal("user", s.queryString("SELECT role FROM users WHERE email = $1", body["email"]))
	})

	s.Run("ok: reply keeps the admin session, not the new user", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		c := s.newAPI().login(admin)
		before := c.session

		res := c.do(http.MethodPost, adminUsers, createUserBody("user"))

		r.Nil(res.sessionCookie())
		r.Equal(before, c.session)
	})

	s.Run("error: email taken", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		body := createUserBody("admin")
		body["email"] = strings.ToUpper(admin.Email)

		res := s.newAPI().login(admin).do(http.MethodPost, adminUsers, body)

		r.Equal(http.StatusConflict, res.status)
		r.Equal("CONFLICT", res.code())
	})

	s.Run("error: unknown role", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)

		res := s.newAPI().login(admin).do(http.MethodPost, adminUsers, createUserBody("root"))

		r.Equal(http.StatusUnprocessableEntity, res.status, res.text())
		r.Equal(1, s.queryInt("SELECT count(*) FROM users"))
	})

	s.Run("error: short password", func() {
		body := createUserBody("admin")
		body["password"] = "short"

		res := s.newAPI().login(s.createUser(models.UserRoleAdmin)).do(http.MethodPost, adminUsers, body)

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: plain user creates nothing", func() {
		r := s.Require()
		c := s.newAPI().login(s.createUser(models.UserRoleUser))

		r.Equal(http.StatusForbidden, c.do(http.MethodPost, adminUsers, createUserBody("admin")).status)
		r.Equal(1, s.queryInt("SELECT count(*) FROM users"))
	})
}
