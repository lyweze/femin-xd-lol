//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUsersUsecases_SetUserRole(t *testing.T) {
	t.Parallel()

	t.Run("ok: admin promotes user", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		actorID := uuid.New()
		user := buildUser(models.UserRoleAdmin)
		now := time.Now()

		d.timeProvider.EXPECT().Now().Return(now).Once()
		d.repo.EXPECT().LockAdmins(mock.Anything).Return(dto.LockAdminsResult{IDs: []uuid.UUID{actorID}}, nil).Once()
		d.repo.EXPECT().UpdateUserRole(mock.Anything, dto.UpdateUserRoleCommand{
			ID:        user.ID(),
			Role:      models.UserRoleAdmin,
			UpdatedAt: now,
		}).Return(dto.UpdateUserRoleResult{Result: user}, nil).Once()

		out, err := newUsecase(d).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: actorID,
			UserID:  user.ID(),
			Role:    models.UserRoleAdmin,
		})
		r.NoError(err)
		r.Equal(view_models.UserRoleAdmin, out.User.Role)
	})

	t.Run("ok: admin may reassign own admin role", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		user := buildUser(models.UserRoleAdmin)

		d.timeProvider.EXPECT().Now().Return(time.Now()).Once()
		d.repo.EXPECT().LockAdmins(mock.Anything).Return(dto.LockAdminsResult{IDs: []uuid.UUID{user.ID()}}, nil).Once()
		d.repo.EXPECT().UpdateUserRole(mock.Anything, mock.Anything).
			Return(dto.UpdateUserRoleResult{Result: user}, nil).Once()

		_, err := newUsecase(d).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: user.ID(),
			UserID:  user.ID(),
			Role:    models.UserRoleAdmin,
		})
		require.NoError(t, err)
	})

	t.Run("error: cannot demote self", func(t *testing.T) {
		t.Parallel()

		id := uuid.New()

		_, err := newUsecase(newDeps(t)).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: id,
			UserID:  id,
			Role:    models.UserRoleUser,
		})
		require.ErrorIs(t, err, ErrCannotDemoteSelf)
	})

	// Actor passed the middleware check, then another admin demoted them.
	t.Run("error: actor lost admin role, nothing is updated", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.timeProvider.EXPECT().Now().Return(time.Now()).Once()
		d.repo.EXPECT().LockAdmins(mock.Anything).Return(dto.LockAdminsResult{IDs: []uuid.UUID{uuid.New()}}, nil).Once()

		_, err := newUsecase(d).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: uuid.New(),
			UserID:  uuid.New(),
			Role:    models.UserRoleUser,
		})
		require.ErrorIs(t, err, ErrActorNotAdmin)
	})

	t.Run("error: user not found", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		actorID := uuid.New()

		d.timeProvider.EXPECT().Now().Return(time.Now()).Once()
		d.repo.EXPECT().LockAdmins(mock.Anything).Return(dto.LockAdminsResult{IDs: []uuid.UUID{actorID}}, nil).Once()
		d.repo.EXPECT().UpdateUserRole(mock.Anything, mock.Anything).
			Return(dto.UpdateUserRoleResult{}, ErrUserNotFound).Once()

		_, err := newUsecase(d).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: actorID,
			UserID:  uuid.New(),
			Role:    models.UserRoleAdmin,
		})
		require.ErrorIs(t, err, ErrUserNotFound)
	})

	t.Run("error: unknown role", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).SetUserRole(t.Context(), SetUserRoleIn{
			ActorID: uuid.New(),
			UserID:  uuid.New(),
			Role:    "root",
		})
		require.ErrorIs(t, err, ErrValidation)
	})
}
