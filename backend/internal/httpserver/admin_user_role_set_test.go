//go:build tests

package httpserver

import (
	"net/http"
	"slices"
	"sync"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func setRole(c *testClient, id uuid.UUID, role string) testResponse {
	return c.do(http.MethodPut, adminUsers+"/"+id.String()+"/role", map[string]string{"role": role})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminSetUserRole() {
	s.Run("ok: promotion works without a new login", func() {
		r := s.Require()
		api := s.newAPI()
		admin, user := s.createUser(models.UserRoleAdmin), s.createUser(models.UserRoleUser)
		userClient := api.login(user)

		r.Equal(http.StatusForbidden, userClient.do(http.MethodGet, adminUsers, nil).status)

		res := setRole(api.login(admin), user.ID, "admin")

		r.Equal(http.StatusOK, res.status, res.text())
		r.Equal(http.StatusOK, userClient.do(http.MethodGet, adminUsers, nil).status)
	})

	s.Run("ok: demotion works at once and keeps the session", func() {
		r := s.Require()
		api := s.newAPI()
		admin, other := s.createUser(models.UserRoleAdmin), s.createUser(models.UserRoleAdmin)
		otherClient := api.login(other)

		r.Equal(http.StatusOK, otherClient.do(http.MethodGet, adminUsers, nil).status)

		r.Equal(http.StatusOK, setRole(api.login(admin), other.ID, "user").status)

		r.Equal(http.StatusForbidden, otherClient.do(http.MethodGet, adminUsers, nil).status)
		r.Equal(http.StatusOK, otherClient.do(http.MethodGet, mePath, nil).status)
	})

	s.Run("error: cannot demote self", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)

		res := setRole(s.newAPI().login(admin), admin.ID, "user")

		r.Equal(http.StatusConflict, res.status)
		r.Equal("CONFLICT", res.code())
		r.Equal("admin", s.queryString("SELECT role FROM users WHERE id = $1", admin.ID))
	})

	s.Run("error: unknown user", func() {
		res := setRole(s.newAPI().login(s.createUser(models.UserRoleAdmin)), uuid.New(), "admin")

		s.Equal(http.StatusNotFound, res.status)
		s.Equal("NOT_FOUND", res.code())
	})

	s.Run("error: deleted user", func() {
		admin, user := s.createUser(models.UserRoleAdmin), s.createUser(models.UserRoleUser)

		s.exec("UPDATE users SET deleted_at = now() WHERE id = $1", user.ID)

		s.Equal(http.StatusNotFound, setRole(s.newAPI().login(admin), user.ID, "admin").status)
	})

	s.Run("error: bad role", func() {
		r := s.Require()
		admin, user := s.createUser(models.UserRoleAdmin), s.createUser(models.UserRoleUser)

		r.Equal(http.StatusUnprocessableEntity, setRole(s.newAPI().login(admin), user.ID, "root").status)
		r.Equal("user", s.queryString("SELECT role FROM users WHERE id = $1", user.ID))
	})

	s.Run("error: bad uuid", func() {
		res := s.newAPI().login(s.createUser(models.UserRoleAdmin)).
			do(http.MethodPut, adminUsers+"/nope/role", map[string]string{"role": "admin"})

		s.Equal(http.StatusUnprocessableEntity, res.status)
	})

	// Без блокировки оба запроса видят двух админов, и система остаётся без единого.
	s.Run("ok: two admins demoting each other leave exactly one", func() {
		r := s.Require()
		api := s.newAPI()
		first, second := s.createUser(models.UserRoleAdmin), s.createUser(models.UserRoleAdmin)
		firstClient, secondClient := api.login(first), api.login(second)

		for round := range 20 {
			statuses := make([]int, 2)

			var wg sync.WaitGroup

			wg.Go(func() { statuses[0] = setRole(firstClient, second.ID, "user").status })
			wg.Go(func() { statuses[1] = setRole(secondClient, first.ID, "user").status })
			wg.Wait()

			slices.Sort(statuses)

			r.Equal([]int{http.StatusOK, http.StatusForbidden}, statuses, "round %d", round)
			r.Equal(1, s.queryInt("SELECT count(*) FROM users WHERE role = 'admin'"), "round %d", round)

			s.exec("UPDATE users SET role = 'admin' WHERE id IN ($1, $2)", first.ID, second.ID)
		}
	})
}
