//go:build tests

package usecases

import (
	"errors"
	"testing"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestAuthUsecases_Register(t *testing.T) {
	t.Parallel()

	in := RegisterIn{Email: "user@femin.test", Username: "user", Password: "long enough", ClientIP: testIP}

	allow := func(d *deps) {
		d.rateLimiter.EXPECT().Allow(mock.Anything, registerIPKey(testIP), testLimits.RegisterPerIP, testLimits.Window).
			Return(true, nil).Once()
	}

	t.Run("ok: always creates a plain user", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(view_models.UserRoleUser)

		allow(d)
		d.users.EXPECT().CreateUser(mock.Anything, users.CreateUserIn{
			Email:    in.Email,
			Username: in.Username,
			Password: in.Password,
			Role:     models.UserRoleUser,
		}).Return(users.CreateUserOut{User: user}, nil).Once()
		d.sessions.EXPECT().Create(mock.Anything, user.ID).Return(testToken, nil).Once()

		out, err := newUsecase(d).Register(t.Context(), in)
		r.NoError(err)
		r.Equal(user.ID, out.User.ID)
		r.Equal(testToken, out.Token)
	})

	t.Run("error: rate limit stops before creating a user", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.rateLimiter.EXPECT().Allow(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(false, nil).Once()

		_, err := newUsecase(d).Register(t.Context(), in)
		require.ErrorIs(t, err, ErrTooManyAttempts)
	})

	t.Run("error: limiter failure", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		limiterErr := errors.New("valkey is down")
		d.rateLimiter.EXPECT().Allow(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(false, limiterErr).Once()

		_, err := newUsecase(d).Register(t.Context(), in)
		require.ErrorIs(t, err, limiterErr)
	})

	t.Run("error: user already exists, no session", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		allow(d)
		d.users.EXPECT().CreateUser(mock.Anything, mock.Anything).
			Return(users.CreateUserOut{}, users.ErrUserAlreadyExists).Once()

		_, err := newUsecase(d).Register(t.Context(), in)
		require.ErrorIs(t, err, users.ErrUserAlreadyExists)
	})

	t.Run("error: session not created", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		sessionErr := errors.New("valkey is down")

		allow(d)
		d.users.EXPECT().CreateUser(mock.Anything, mock.Anything).
			Return(users.CreateUserOut{User: buildUser(view_models.UserRoleUser)}, nil).Once()
		d.sessions.EXPECT().Create(mock.Anything, mock.Anything).Return("", sessionErr).Once()

		_, err := newUsecase(d).Register(t.Context(), in)
		require.ErrorIs(t, err, sessionErr)
	})
}
