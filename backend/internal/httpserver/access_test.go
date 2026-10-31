//go:build tests

package httpserver

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

type testRoute struct {
	method string
	path   string
}

func protectedRoutes() []testRoute {
	return []testRoute{
		{http.MethodPost, logoutPath},
		{http.MethodPost, logoutAllPath},
		{http.MethodGet, mePath},
		{http.MethodGet, adminUsers},
		{http.MethodPost, adminUsers},
		{http.MethodPut, adminUsers + "/" + uuid.NewString() + "/role"},
	}
}

func adminRoutes() []testRoute {
	return []testRoute{
		{http.MethodGet, adminUsers},
		{http.MethodPost, adminUsers},
		{http.MethodPut, adminUsers + "/" + uuid.NewString() + "/role"},
	}
}

func (s *HttpHandlersTestSuite) Test_Access() {
	s.Run("ok: only register and login are public", func() {
		r := s.Require()

		r.Len(publicRoutes, 2)
		r.Contains(publicRoutes, "POST "+registerPath)
		r.Contains(publicRoutes, "POST "+loginPath)
	})

	s.Run("error: anonymous gets 401 on every protected route", func() {
		api := s.newAPI()

		for _, route := range protectedRoutes() {
			res := api.client().do(route.method, route.path, rawBody("{}"))

			s.Equal(http.StatusUnauthorized, res.status, "%s %s", route.method, route.path)
			s.Equal("UNAUTHORIZED", res.code(), "%s %s", route.method, route.path)
		}
	})

	s.Run("error: forged cookie gets 401 on every protected route", func() {
		api := s.newAPI()

		for _, route := range protectedRoutes() {
			c := api.client()
			c.session = "forged-token"

			s.Equal(http.StatusUnauthorized, c.do(route.method, route.path, rawBody("{}")).status, "%s %s", route.method, route.path)
		}
	})

	s.Run("error: plain user gets 403 on every admin route", func() {
		api := s.newAPI()
		c := api.login(s.createUser(models.UserRoleUser))

		for _, route := range adminRoutes() {
			res := c.do(route.method, route.path, rawBody("{}"))

			s.Equal(http.StatusForbidden, res.status, "%s %s", route.method, route.path)
			s.Equal("FORBIDDEN", res.code(), "%s %s", route.method, route.path)
		}
	})

	// Сессия живёт в Valkey, а пользователя могли удалить в Postgres.
	s.Run("error: session of a deleted user stops working", func() {
		api := s.newAPI()
		user := s.createUser(models.UserRoleAdmin)
		c := api.login(user)

		s.exec("UPDATE users SET deleted_at = now() WHERE id = $1", user.ID)

		s.Equal(http.StatusUnauthorized, c.do(http.MethodGet, mePath, nil).status)
		s.Equal(http.StatusUnauthorized, c.do(http.MethodGet, adminUsers, nil).status)
	})

	s.Run("ok: cookie name matches the contract", func() {
		s.Equal("femin_session", middleware.SessionCookieName)
	})
}
