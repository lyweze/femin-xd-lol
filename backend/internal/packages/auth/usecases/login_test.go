//go:build tests

package usecases

import (
	"errors"
	"testing"

	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestAuthUsecases_Login(t *testing.T) {
	t.Parallel()

	in := LoginIn{Email: "user@femin.test", Password: "long enough", ClientIP: testIP}

	allowEmail := func(d *deps, allowed bool) {
		d.rateLimiter.EXPECT().Allow(mock.Anything, loginEmailKey(in.Email), testLimits.LoginPerEmail, testLimits.Window).
			Return(allowed, nil).Once()
	}
	allowIP := func(d *deps, allowed bool) {
		d.rateLimiter.EXPECT().Allow(mock.Anything, loginIPKey(testIP), testLimits.LoginPerIP, testLimits.Window).
			Return(allowed, nil).Once()
	}

	t.Run("ok: resets the email counter and opens a session", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		user := buildUser(view_models.UserRoleUser)

		allowEmail(d, true)
		allowIP(d, true)
		d.users.EXPECT().VerifyCredentials(mock.Anything, users.VerifyCredentialsIn{Email: in.Email, Password: in.Password}).
			Return(users.VerifyCredentialsOut{User: user}, nil).Once()
		d.rateLimiter.EXPECT().Reset(mock.Anything, loginEmailKey(in.Email)).Return(nil).Once()
		d.sessions.EXPECT().Create(mock.Anything, user.ID).Return(testToken, nil).Once()

		out, err := newUsecase(d).Login(t.Context(), in)
		r.NoError(err)
		r.Equal(user.ID, out.User.ID)
		r.Equal(testToken, out.Token)
	})

	t.Run("error: email limit stops before checking the password", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		allowEmail(d, false)

		_, err := newUsecase(d).Login(t.Context(), in)
		require.ErrorIs(t, err, ErrTooManyAttempts)
	})

	t.Run("error: ip limit stops before checking the password", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		allowEmail(d, true)
		allowIP(d, false)

		_, err := newUsecase(d).Login(t.Context(), in)
		require.ErrorIs(t, err, ErrTooManyAttempts)
	})

	t.Run("error: wrong password keeps the counter and opens no session", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		allowEmail(d, true)
		allowIP(d, true)
		d.users.EXPECT().VerifyCredentials(mock.Anything, mock.Anything).
			Return(users.VerifyCredentialsOut{}, users.ErrInvalidCredentials).Once()

		_, err := newUsecase(d).Login(t.Context(), in)
		require.ErrorIs(t, err, users.ErrInvalidCredentials)
	})

	t.Run("error: counter reset failed, no session", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		resetErr := errors.New("valkey is down")

		allowEmail(d, true)
		allowIP(d, true)
		d.users.EXPECT().VerifyCredentials(mock.Anything, mock.Anything).
			Return(users.VerifyCredentialsOut{User: buildUser(view_models.UserRoleUser)}, nil).Once()
		d.rateLimiter.EXPECT().Reset(mock.Anything, mock.Anything).Return(resetErr).Once()

		_, err := newUsecase(d).Login(t.Context(), in)
		require.ErrorIs(t, err, resetErr)
	})
}
