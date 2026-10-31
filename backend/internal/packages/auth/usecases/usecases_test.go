//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	mocks "github.com/lyweze/femin-xd-lol/backend/tests/mocks/packages/auth/usecases"
	"github.com/stretchr/testify/require"
)

const (
	testIP    = "10.0.0.1"
	testToken = "token"
)

//nolint:gochecknoglobals
var testLimits = Limits{
	LoginPerEmail: 3,
	LoginPerIP:    5,
	RegisterPerIP: 2,
	Window:        time.Minute,
}

type deps struct {
	users       *mocks.MockUsers
	sessions    *mocks.MockSessions
	rateLimiter *mocks.MockRateLimiter
}

func newDeps(t *testing.T) *deps {
	return &deps{
		users:       mocks.NewMockUsers(t),
		sessions:    mocks.NewMockSessions(t),
		rateLimiter: mocks.NewMockRateLimiter(t),
	}
}

func newUsecase(d *deps) *AuthUsecases {
	return New(&NewArgs{
		Users:       d.users,
		Sessions:    d.sessions,
		RateLimiter: d.rateLimiter,
		Limits:      testLimits,
	})
}

func buildUser(role view_models.UserRole) view_models.User {
	return view_models.User{ID: uuid.New(), Role: role} //nolint:exhaustruct
}

func TestLoginEmailKey(t *testing.T) {
	t.Parallel()

	t.Run("ok: one counter for any spelling of the email", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)

		key := loginEmailKey("user@femin.test")

		r.Equal(key, loginEmailKey("USER@femin.test"))
		r.Equal(key, loginEmailKey("  user@femin.test "))
	})

	t.Run("ok: email is not stored in the key", func(t *testing.T) {
		t.Parallel()

		require.NotContains(t, loginEmailKey("user@femin.test"), "femin.test")
	})
}
