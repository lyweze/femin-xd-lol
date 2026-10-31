//go:build tests

package usecases

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestAuthUsecases_Authenticate(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		userID := uuid.New()
		d.sessions.EXPECT().Get(mock.Anything, testToken).Return(userID, nil).Once()

		got, err := newUsecase(d).Authenticate(t.Context(), testToken)
		r.NoError(err)
		r.Equal(userID, got)
	})

	t.Run("error: unknown token", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.sessions.EXPECT().Get(mock.Anything, mock.Anything).Return(uuid.Nil, ErrSessionNotFound).Once()

		_, err := newUsecase(d).Authenticate(t.Context(), testToken)
		require.ErrorIs(t, err, ErrUnauthorized)
	})

	// A storage outage must not look like a logout to every user.
	t.Run("error: storage failure is not unauthorized", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		storageErr := errors.New("valkey is down")
		d.sessions.EXPECT().Get(mock.Anything, mock.Anything).Return(uuid.Nil, storageErr).Once()

		_, err := newUsecase(d).Authenticate(t.Context(), testToken)
		r.ErrorIs(err, storageErr)
		r.NotErrorIs(err, ErrUnauthorized)
	})
}

func TestAuthUsecases_GetMe(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(view_models.UserRoleUser)
		d.users.EXPECT().GetUser(mock.Anything, users.GetUserIn{ID: user.ID}).Return(users.GetUserOut{User: user}, nil).Once()

		out, err := newUsecase(d).GetMe(t.Context(), GetMeIn{UserID: user.ID})
		r.NoError(err)
		r.Equal(user.ID, out.User.ID)
	})

	t.Run("error: user is gone", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.users.EXPECT().GetUser(mock.Anything, mock.Anything).Return(users.GetUserOut{}, users.ErrUserNotFound).Once()

		_, err := newUsecase(d).GetMe(t.Context(), GetMeIn{UserID: uuid.New()})
		require.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestAuthUsecases_RequireAdmin(t *testing.T) {
	t.Parallel()

	t.Run("ok: admin", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		user := buildUser(view_models.UserRoleAdmin)
		d.users.EXPECT().GetUser(mock.Anything, mock.Anything).Return(users.GetUserOut{User: user}, nil).Once()

		require.NoError(t, newUsecase(d).RequireAdmin(t.Context(), user.ID))
	})

	t.Run("error: plain user", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		user := buildUser(view_models.UserRoleUser)
		d.users.EXPECT().GetUser(mock.Anything, mock.Anything).Return(users.GetUserOut{User: user}, nil).Once()

		require.ErrorIs(t, newUsecase(d).RequireAdmin(t.Context(), user.ID), ErrForbidden)
	})

	t.Run("error: user is gone", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.users.EXPECT().GetUser(mock.Anything, mock.Anything).Return(users.GetUserOut{}, users.ErrUserNotFound).Once()

		require.ErrorIs(t, newUsecase(d).RequireAdmin(t.Context(), uuid.New()), ErrUnauthorized)
	})
}
