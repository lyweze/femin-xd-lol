package usecases_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/require"
)

const password = "long enough"

type fakeUsers struct {
	byID      map[uuid.UUID]view_models.User
	createdIn users.CreateUserIn
}

func (f *fakeUsers) CreateUser(_ context.Context, in users.CreateUserIn) (users.CreateUserOut, error) {
	f.createdIn = in

	user := view_models.User{ID: uuid.New(), Email: in.Email, Role: view_models.UserRole(in.Role)} //nolint:exhaustruct
	f.byID[user.ID] = user

	return users.CreateUserOut{User: user}, nil
}

func (f *fakeUsers) GetUser(_ context.Context, in users.GetUserIn) (users.GetUserOut, error) {
	user, ok := f.byID[in.ID]
	if !ok {
		return users.GetUserOut{}, users.ErrUserNotFound
	}

	return users.GetUserOut{User: user}, nil
}

func (f *fakeUsers) VerifyCredentials(_ context.Context, in users.VerifyCredentialsIn) (users.VerifyCredentialsOut, error) {
	for _, user := range f.byID {
		if user.Email == in.Email && in.Password == password {
			return users.VerifyCredentialsOut{User: user}, nil
		}
	}

	return users.VerifyCredentialsOut{}, users.ErrInvalidCredentials
}

type fakeSessions struct {
	tokens map[string]uuid.UUID
}

func (f *fakeSessions) Create(_ context.Context, userID uuid.UUID) (string, error) {
	token := uuid.NewString()
	f.tokens[token] = userID

	return token, nil
}

func (f *fakeSessions) Get(_ context.Context, token string) (uuid.UUID, error) {
	userID, ok := f.tokens[token]
	if !ok {
		return uuid.Nil, usecases.ErrSessionNotFound
	}

	return userID, nil
}

func (f *fakeSessions) Delete(_ context.Context, _ uuid.UUID, token string) error {
	delete(f.tokens, token)

	return nil
}

func (f *fakeSessions) DeleteAll(_ context.Context, userID uuid.UUID) error {
	for token, owner := range f.tokens {
		if owner == userID {
			delete(f.tokens, token)
		}
	}

	return nil
}

type fakeLimiter struct {
	counts map[string]int64
}

func (f *fakeLimiter) Allow(_ context.Context, key string, limit int64, _ time.Duration) (bool, error) {
	f.counts[key]++

	return f.counts[key] <= limit, nil
}

func (f *fakeLimiter) Reset(_ context.Context, key string) error {
	delete(f.counts, key)

	return nil
}

type fixture struct {
	usecases *usecases.AuthUsecases
	users    *fakeUsers
	sessions *fakeSessions
}

func newFixture() *fixture {
	fu := &fakeUsers{byID: map[uuid.UUID]view_models.User{}} //nolint:exhaustruct
	fs := &fakeSessions{tokens: map[string]uuid.UUID{}}

	return &fixture{
		users:    fu,
		sessions: fs,
		usecases: usecases.New(&usecases.NewArgs{
			Users:       fu,
			Sessions:    fs,
			RateLimiter: &fakeLimiter{counts: map[string]int64{}},
			Limits: usecases.Limits{
				LoginPerEmail: 3,
				LoginPerIP:    5,
				RegisterPerIP: 2,
				Window:        time.Minute,
			},
		}),
	}
}

func (f *fixture) register(t *testing.T, email string) usecases.RegisterOut {
	t.Helper()

	out, err := f.usecases.Register(t.Context(), usecases.RegisterIn{
		Email:    email,
		Username: "user",
		Password: password,
		ClientIP: "10.0.0.1",
	})
	require.NoError(t, err)

	return out
}

func TestRegisterAlwaysCreatesPlainUser(t *testing.T) {
	t.Parallel()

	f := newFixture()

	out := f.register(t, "a@femin.test")

	require.Equal(t, models.UserRoleUser, f.users.createdIn.Role)

	userID, err := f.usecases.Authenticate(t.Context(), out.Token)
	require.NoError(t, err)
	require.Equal(t, out.User.ID, userID)
}

func TestRegisterRateLimit(t *testing.T) {
	t.Parallel()

	f := newFixture()

	f.register(t, "a@femin.test")
	f.register(t, "b@femin.test")

	_, err := f.usecases.Register(t.Context(), usecases.RegisterIn{
		Email:    "c@femin.test",
		Username: "user",
		Password: password,
		ClientIP: "10.0.0.1",
	})
	require.ErrorIs(t, err, usecases.ErrTooManyAttempts)
}

func TestLogin(t *testing.T) {
	t.Parallel()

	f := newFixture()
	registered := f.register(t, "a@femin.test")

	out, err := f.usecases.Login(t.Context(), usecases.LoginIn{
		Email:    "a@femin.test",
		Password: password,
		ClientIP: "10.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, registered.User.ID, out.User.ID)
	require.NotEqual(t, registered.Token, out.Token)

	_, err = f.usecases.Login(t.Context(), usecases.LoginIn{
		Email:    "a@femin.test",
		Password: "wrong",
		ClientIP: "10.0.0.1",
	})
	require.ErrorIs(t, err, users.ErrInvalidCredentials)
}

func TestLoginRateLimitByEmailIgnoresCase(t *testing.T) {
	t.Parallel()

	f := newFixture()
	f.register(t, "a@femin.test")

	attempt := func(email, ip string) error {
		_, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: email, Password: "wrong", ClientIP: ip})

		return err
	}

	require.ErrorIs(t, attempt("a@femin.test", "10.0.0.1"), users.ErrInvalidCredentials)
	require.ErrorIs(t, attempt("A@FEMIN.test", "10.0.0.2"), users.ErrInvalidCredentials)
	require.ErrorIs(t, attempt(" a@femin.test ", "10.0.0.3"), users.ErrInvalidCredentials)
	require.ErrorIs(t, attempt("a@femin.test", "10.0.0.4"), usecases.ErrTooManyAttempts)
}

func TestLoginRateLimitByIP(t *testing.T) {
	t.Parallel()

	f := newFixture()

	for i := range 5 {
		email := string(rune('a'+i)) + "@femin.test"

		_, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: email, Password: "wrong", ClientIP: "10.0.0.1"})
		require.ErrorIs(t, err, users.ErrInvalidCredentials)
	}

	_, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: "z@femin.test", Password: "wrong", ClientIP: "10.0.0.1"})
	require.ErrorIs(t, err, usecases.ErrTooManyAttempts)
}

func TestSuccessfulLoginResetsEmailCounter(t *testing.T) {
	t.Parallel()

	f := newFixture()
	f.register(t, "a@femin.test")

	// Разные IP, чтобы сработать мог только счётчик по email.
	login := func(pass, ip string) error {
		_, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: "a@femin.test", Password: pass, ClientIP: ip})

		return err
	}

	require.ErrorIs(t, login("wrong", "10.0.0.1"), users.ErrInvalidCredentials)
	require.ErrorIs(t, login("wrong", "10.0.0.2"), users.ErrInvalidCredentials)
	require.NoError(t, login(password, "10.0.0.3"))

	// Без сброса это были бы попытки 4 и 5 при лимите 3.
	require.ErrorIs(t, login("wrong", "10.0.0.4"), users.ErrInvalidCredentials)
	require.ErrorIs(t, login("wrong", "10.0.0.5"), users.ErrInvalidCredentials)
	require.NoError(t, login(password, "10.0.0.6"))
}

func TestLogout(t *testing.T) {
	t.Parallel()

	f := newFixture()
	first := f.register(t, "a@femin.test")

	second, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: "a@femin.test", Password: password, ClientIP: "10.0.0.1"})
	require.NoError(t, err)

	require.NoError(t, f.usecases.Logout(t.Context(), usecases.LogoutIn{UserID: first.User.ID, Token: first.Token}))

	_, err = f.usecases.Authenticate(t.Context(), first.Token)
	require.ErrorIs(t, err, usecases.ErrUnauthorized)

	_, err = f.usecases.Authenticate(t.Context(), second.Token)
	require.NoError(t, err)
}

func TestLogoutAll(t *testing.T) {
	t.Parallel()

	f := newFixture()
	first := f.register(t, "a@femin.test")
	other := f.register(t, "b@femin.test")

	second, err := f.usecases.Login(t.Context(), usecases.LoginIn{Email: "a@femin.test", Password: password, ClientIP: "10.0.0.1"})
	require.NoError(t, err)

	require.NoError(t, f.usecases.LogoutAll(t.Context(), usecases.LogoutAllIn{UserID: first.User.ID}))

	for _, token := range []string{first.Token, second.Token} {
		_, err = f.usecases.Authenticate(t.Context(), token)
		require.ErrorIs(t, err, usecases.ErrUnauthorized)
	}

	_, err = f.usecases.Authenticate(t.Context(), other.Token)
	require.NoError(t, err)
}

func TestRequireAdmin(t *testing.T) {
	t.Parallel()

	f := newFixture()

	admin := view_models.User{ID: uuid.New(), Role: view_models.UserRoleAdmin} //nolint:exhaustruct
	user := view_models.User{ID: uuid.New(), Role: view_models.UserRoleUser}   //nolint:exhaustruct
	f.users.byID[admin.ID] = admin
	f.users.byID[user.ID] = user

	require.NoError(t, f.usecases.RequireAdmin(t.Context(), admin.ID))
	require.ErrorIs(t, f.usecases.RequireAdmin(t.Context(), user.ID), usecases.ErrForbidden)
	require.ErrorIs(t, f.usecases.RequireAdmin(t.Context(), uuid.New()), usecases.ErrUnauthorized)
}
