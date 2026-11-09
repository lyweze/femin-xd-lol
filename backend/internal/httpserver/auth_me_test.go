//go:build tests

package httpserver

import (
	"encoding/json"
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func (s *HttpHandlersTestSuite) Test_handlersFacade_GetMe() {
	s.Run("ok: returns the session owner", func() {
		r := s.Require()
		user := s.createUser(models.UserRoleUser)

		res := s.newAPI().login(user).do(http.MethodGet, mePath, nil)

		r.Equal(http.StatusOK, res.status, res.text())

		var reply serverhttp.UserReply
		r.NoError(json.Unmarshal(res.body, &reply))

		r.Equal(user.ID, reply.User.Id)
		r.Equal(user.Email, string(reply.User.Email))
		r.Equal(user.Username, reply.User.Username)
		r.Equal("user", string(reply.User.Role))
	})
}
