//go:build tests

package usecases

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestAuthUsecases_Logout(t *testing.T) {
	t.Parallel()

	t.Run("ok: closes only the given session", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		userID := uuid.New()
		d.sessions.EXPECT().Delete(mock.Anything, userID, testToken).Return(nil).Once()

		require.NoError(t, newUsecase(d).Logout(t.Context(), LogoutIn{UserID: userID, Token: testToken}))
	})

	t.Run("error: storage failure", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		deleteErr := errors.New("valkey is down")
		d.sessions.EXPECT().Delete(mock.Anything, mock.Anything, mock.Anything).Return(deleteErr).Once()

		err := newUsecase(d).Logout(t.Context(), LogoutIn{UserID: uuid.New(), Token: testToken})
		require.ErrorIs(t, err, deleteErr)
	})
}

func TestAuthUsecases_LogoutAll(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		userID := uuid.New()
		d.sessions.EXPECT().DeleteAll(mock.Anything, userID).Return(nil).Once()

		require.NoError(t, newUsecase(d).LogoutAll(t.Context(), LogoutAllIn{UserID: userID}))
	})

	t.Run("error: storage failure", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		deleteErr := errors.New("valkey is down")
		d.sessions.EXPECT().DeleteAll(mock.Anything, mock.Anything).Return(deleteErr).Once()

		err := newUsecase(d).LogoutAll(t.Context(), LogoutAllIn{UserID: uuid.New()})
		require.ErrorIs(t, err, deleteErr)
	})
}
