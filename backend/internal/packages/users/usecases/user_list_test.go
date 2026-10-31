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

func TestListUsersIn_Validate(t *testing.T) {
	t.Parallel()

	t.Run("ok: empty", func(t *testing.T) {
		t.Parallel()

		require.NoError(t, ListUsersIn{}.Validate())
	})

	t.Run("ok: limit on the boundary", func(t *testing.T) {
		t.Parallel()

		require.NoError(t, ListUsersIn{Limit: new(100)}.Validate())
	})

	// ozzo treats zero as empty, without an explicit check limit=0 used to panic.
	t.Run("error: zero limit", func(t *testing.T) {
		t.Parallel()

		require.Error(t, ListUsersIn{Limit: new(0)}.Validate())
	})

	t.Run("error: negative limit", func(t *testing.T) {
		t.Parallel()

		require.Error(t, ListUsersIn{Limit: new(-1)}.Validate())
	})

	t.Run("error: limit above maximum", func(t *testing.T) {
		t.Parallel()

		require.Error(t, ListUsersIn{Limit: new(101)}.Validate())
	})

	t.Run("error: unknown role", func(t *testing.T) {
		t.Parallel()

		require.Error(t, ListUsersIn{Role: new(models.UserRole("root"))}.Validate())
	})
}

func TestUsersUsecases_ListUsers(t *testing.T) {
	t.Parallel()

	t.Run("ok: default limit and no next page", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(models.UserRoleUser)

		d.repo.EXPECT().ListUsers(mock.Anything, dto.ListUsersQuery{Limit: usersPageDefaultLimit + 1}).
			Return(dto.ListUsersResult{Items: []*models.User{user}}, nil).Once()

		out, err := newUsecase(d).ListUsers(t.Context(), ListUsersIn{})
		r.NoError(err)
		r.Len(out.Items, 1)
		r.Nil(out.NextCursor)
	})

	t.Run("ok: extra row becomes the next page", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		users := []*models.User{
			buildUser(models.UserRoleUser),
			buildUser(models.UserRoleUser),
			buildUser(models.UserRoleUser),
		}

		d.repo.EXPECT().ListUsers(mock.Anything, dto.ListUsersQuery{Limit: 3}).
			Return(dto.ListUsersResult{Items: users}, nil).Once()

		out, err := newUsecase(d).ListUsers(t.Context(), ListUsersIn{Limit: new(2)})
		r.NoError(err)
		r.Len(out.Items, 2)
		r.NotNil(out.NextCursor)
		r.Equal(users[1].ID().String(), *out.NextCursor)
	})

	t.Run("ok: passes filters and cursor to the repo", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		after := uuid.New()
		search := "user"
		role := models.UserRoleAdmin

		d.repo.EXPECT().ListUsers(mock.Anything, dto.ListUsersQuery{
			Search:  &search,
			Role:    &role,
			AfterID: &after,
			Limit:   usersPageDefaultLimit + 1,
		}).Return(dto.ListUsersResult{}, nil).Once()

		_, err := newUsecase(d).ListUsers(t.Context(), ListUsersIn{
			Search: &search,
			Role:   &role,
			Cursor: new(after.String()),
		})
		require.NoError(t, err)
	})

	t.Run("error: bad cursor", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).ListUsers(t.Context(), ListUsersIn{Cursor: new("zzz")})
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: limit too big", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).ListUsers(t.Context(), ListUsersIn{Limit: new(1000)})
		require.ErrorIs(t, err, ErrValidation)
	})
}
