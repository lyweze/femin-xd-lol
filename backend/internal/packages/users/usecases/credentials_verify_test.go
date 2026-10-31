//go:build tests

package usecases

import (
	"errors"
	"testing"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUsersUsecases_VerifyCredentials(t *testing.T) {
	t.Parallel()

	in := VerifyCredentialsIn{Email: "user@femin.test", Password: "long enough"}

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(models.UserRoleUser)

		d.repo.EXPECT().GetUserByEmail(mock.Anything, dto.GetUserByEmailQuery{Email: in.Email}).
			Return(dto.GetUserByEmailResult{Result: user}, nil).Once()
		d.passwordHasher.EXPECT().Verify(in.Password, user.PasswordHash()).Return(true, nil).Once()

		out, err := newUsecase(d).VerifyCredentials(t.Context(), in)
		r.NoError(err)
		r.Equal(user.ID(), out.User.ID)
	})

	t.Run("ok: trims email", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		user := buildUser(models.UserRoleUser)

		d.repo.EXPECT().GetUserByEmail(mock.Anything, dto.GetUserByEmailQuery{Email: in.Email}).
			Return(dto.GetUserByEmailResult{Result: user}, nil).Once()
		d.passwordHasher.EXPECT().Verify(mock.Anything, mock.Anything).Return(true, nil).Once()

		_, err := newUsecase(d).VerifyCredentials(t.Context(), VerifyCredentialsIn{Email: " " + in.Email + " ", Password: in.Password})
		require.NoError(t, err)
	})

	t.Run("error: wrong password", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.repo.EXPECT().GetUserByEmail(mock.Anything, mock.Anything).
			Return(dto.GetUserByEmailResult{Result: buildUser(models.UserRoleUser)}, nil).Once()
		d.passwordHasher.EXPECT().Verify(mock.Anything, mock.Anything).Return(false, nil).Once()

		_, err := newUsecase(d).VerifyCredentials(t.Context(), in)
		require.ErrorIs(t, err, ErrInvalidCredentials)
	})

	// Without Hash on this path, response time reveals which emails are registered.
	t.Run("error: unknown email still spends time on hashing", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.repo.EXPECT().GetUserByEmail(mock.Anything, mock.Anything).
			Return(dto.GetUserByEmailResult{}, ErrUserNotFound).Once()
		d.passwordHasher.EXPECT().Hash(in.Password).Return("hashed", nil).Once()

		_, err := newUsecase(d).VerifyCredentials(t.Context(), in)
		require.ErrorIs(t, err, ErrInvalidCredentials)
	})

	t.Run("error: storage failure is not invalid credentials", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		dbErr := errors.New("db is down")
		d.repo.EXPECT().GetUserByEmail(mock.Anything, mock.Anything).Return(dto.GetUserByEmailResult{}, dbErr).Once()

		_, err := newUsecase(d).VerifyCredentials(t.Context(), in)
		r.ErrorIs(err, dbErr)
		r.NotErrorIs(err, ErrInvalidCredentials)
	})

	t.Run("error: corrupted hash", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		verifyErr := errors.New("invalid hash")
		d.repo.EXPECT().GetUserByEmail(mock.Anything, mock.Anything).
			Return(dto.GetUserByEmailResult{Result: buildUser(models.UserRoleUser)}, nil).Once()
		d.passwordHasher.EXPECT().Verify(mock.Anything, mock.Anything).Return(false, verifyErr).Once()

		_, err := newUsecase(d).VerifyCredentials(t.Context(), in)
		require.ErrorIs(t, err, verifyErr)
	})
}
