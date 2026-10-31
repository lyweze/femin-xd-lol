//go:build tests

package httpserver

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

func (s *HttpHandlersTestSuite) Test_SessionStorage() {
	s.Run("ok: valkey holds no raw token and no email", func() {
		r := s.Require()
		user := s.createUser(models.UserRoleUser)

		c := s.newAPI().login(user)
		r.NotEmpty(c.session)

		keys := s.valkeyKeys()
		r.NotEmpty(keys)

		for _, key := range keys {
			r.NotContains(key, c.session)
			r.NotContains(key, user.Email)

			if !strings.HasPrefix(key, "session:") {
				continue
			}

			value, err := s.valkey.Do(context.Background(), s.valkey.B().Get().Key(key).Build()).ToString()
			r.NoError(err)
			r.Equal(user.ID.String(), value)
		}
	})

	s.Run("ok: every key expires", func() {
		r := s.Require()
		api := s.newAPI()
		user := s.createUser(models.UserRoleUser)

		api.login(user)
		api.client().do(http.MethodPost, loginPath, loginBody(randomEmail(), "wrong password"))

		keys := s.valkeyKeys()
		r.NotEmpty(keys)

		for _, key := range keys {
			ttl := s.valkeyTTL(key)

			r.Positive(ttl, key)

			if strings.Contains(key, "session") {
				r.InDelta(sessionTTL.Seconds(), ttl.Seconds(), time.Minute.Seconds(), key)
			}
		}
	})
}
