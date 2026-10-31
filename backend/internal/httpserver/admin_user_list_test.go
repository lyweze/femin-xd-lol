//go:build tests

package httpserver

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/samber/lo"
)

func (s *HttpHandlersTestSuite) listUsers(c *testClient, query url.Values) serveradminhttp.AdminListUsers200Reply {
	r := s.Require()

	res := c.do(http.MethodGet, adminUsers+"?"+query.Encode(), nil)
	r.Equal(http.StatusOK, res.status, res.text())

	var reply serveradminhttp.AdminListUsers200Reply
	r.NoError(json.Unmarshal(res.body, &reply))

	return reply
}

func usernames(items []serveradminhttp.AdminUser) []string {
	return lo.Map(items, func(item serveradminhttp.AdminUser, _ int) string { return item.Username })
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminListUsers() {
	s.Run("ok: newest first, no password hash", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		first, second := s.createUser(models.UserRoleUser), s.createUser(models.UserRoleUser)
		c := s.newAPI().login(admin)

		reply := s.listUsers(c, nil)

		r.Equal([]string{second.Username, first.Username, admin.Username}, usernames(reply.Items))
		r.Nil(reply.NextCursor)
		r.NotContains(c.do(http.MethodGet, adminUsers, nil).text(), "argon2")
	})

	s.Run("ok: pages do not overlap and end", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)

		for range 4 {
			s.createUser(models.UserRoleUser)
		}

		c := s.newAPI().login(admin)

		first := s.listUsers(c, url.Values{"limit": {"2"}})
		r.Len(first.Items, 2)
		r.NotNil(first.NextCursor)

		second := s.listUsers(c, url.Values{"limit": {"2"}, "cursor": {*first.NextCursor}})
		r.Len(second.Items, 2)
		r.NotNil(second.NextCursor)

		third := s.listUsers(c, url.Values{"limit": {"2"}, "cursor": {*second.NextCursor}})
		r.Len(third.Items, 1)
		r.Nil(third.NextCursor)

		all := append(append(usernames(first.Items), usernames(second.Items)...), usernames(third.Items)...)
		r.Len(lo.Uniq(all), 5)
	})

	s.Run("ok: exactly a full page has no next cursor", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		s.createUser(models.UserRoleUser)

		reply := s.listUsers(s.newAPI().login(admin), url.Values{"limit": {"2"}})

		r.Len(reply.Items, 2)
		r.Nil(reply.NextCursor)
	})

	s.Run("ok: filter by role", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		s.createUser(models.UserRoleUser)

		reply := s.listUsers(s.newAPI().login(admin), url.Values{"role": {"admin"}})

		r.Equal([]string{admin.Username}, usernames(reply.Items))
	})

	s.Run("ok: search by username and email", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		user := s.createUser(models.UserRoleUser)
		c := s.newAPI().login(admin)

		r.Equal([]string{user.Username}, usernames(s.listUsers(c, url.Values{"q": {user.Username}}).Items))
		r.Equal([]string{user.Username}, usernames(s.listUsers(c, url.Values{"q": {user.Email}}).Items))
	})

	for _, q := range []string{"%", "_", `\`} {
		s.Run("ok: "+q+" in search is a literal character", func() {
			admin := s.createUser(models.UserRoleAdmin)

			s.Empty(s.listUsers(s.newAPI().login(admin), url.Values{"q": {q}}).Items)
		})
	}

	s.Run("ok: deleted users are hidden", func() {
		r := s.Require()
		admin := s.createUser(models.UserRoleAdmin)
		user := s.createUser(models.UserRoleUser)

		s.exec("UPDATE users SET deleted_at = now() WHERE id = $1", user.ID)

		r.Equal([]string{admin.Username}, usernames(s.listUsers(s.newAPI().login(admin), nil).Items))
	})

	for name, query := range map[string]string{
		"limit too big": "?limit=1000",
		"limit zero":    "?limit=0",
		"bad cursor":    "?cursor=zzz",
		"bad role":      "?role=root",
	} {
		s.Run("error: "+name, func() {
			admin := s.createUser(models.UserRoleAdmin)

			res := s.newAPI().login(admin).do(http.MethodGet, adminUsers+query, nil)

			s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
			s.Equal("VALIDATION_ERROR", res.code())
		})
	}
}
