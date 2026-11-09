//go:build tests

package usecases

import (
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUsersUsecases_GetUser(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(models.UserRoleUser)

		d.repo.EXPECT().GetUser(mock.Anything, dto.GetUserQuery{ID: user.ID()}).
			Return(dto.GetUserResult{Result: user}, nil).Once()

		out, err := newUsecase(d).GetUser(t.Context(), GetUserIn{ID: user.ID()})
		r.NoError(err)
		r.Equal(user.ID(), out.User.ID)
		r.Equal(user.Email(), out.User.Email)
	})

	t.Run("error: nil id", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).GetUser(t.Context(), GetUserIn{ID: uuid.Nil})
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: not found", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.repo.EXPECT().GetUser(mock.Anything, mock.Anything).Return(dto.GetUserResult{}, ErrUserNotFound).Once()

		_, err := newUsecase(d).GetUser(t.Context(), GetUserIn{ID: uuid.New()})
		require.ErrorIs(t, err, ErrUserNotFound)
	})
}
