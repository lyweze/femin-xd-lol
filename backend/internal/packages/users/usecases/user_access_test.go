package usecases_test

import (
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/require"
)

// seqUUID выдаёт растущие id, как UUIDv7 в проде.
type seqUUID struct{ n atomic.Int64 }

func (s *seqUUID) New() uuid.UUID {
	var id uuid.UUID
	id[15] = byte(s.n.Add(1))

	return id
}

// countingHasher считает вызовы Hash, чтобы проверить защиту от подбора адресов по времени.
type countingHasher struct {
	fakeHasher
	hashes atomic.Int64
}

func (h *countingHasher) Hash(password string) (string, error) {
	h.hashes.Add(1)

	return h.fakeHasher.Hash(password)
}

func newSeqUsecases(repo *fakeRepo) *usecases.UsersUsecases {
	return usecases.New(&usecases.NewArgs{
		RepoHandler:    &fakeRepoHandler{repo: repo},
		TimeProvider:   fixedTime{t: time.Now()},
		UUIDProvider:   &seqUUID{},
		PasswordHasher: fakeHasher{},
	})
}

func createUser(t *testing.T, u *usecases.UsersUsecases, name string, role models.UserRole) view_models.User {
	t.Helper()

	out, err := u.CreateUser(t.Context(), usecases.CreateUserIn{
		Email:    name + "@femin.test",
		Username: name,
		Password: "long enough",
		Role:     role,
	})
	require.NoError(t, err)

	return out.User
}

func TestVerifyCredentials(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())
	created := createUser(t, u, "user", models.UserRoleUser)

	out, err := u.VerifyCredentials(t.Context(), usecases.VerifyCredentialsIn{
		Email:    created.Email,
		Password: "long enough",
	})
	require.NoError(t, err)
	require.Equal(t, created.ID, out.User.ID)

	_, err = u.VerifyCredentials(t.Context(), usecases.VerifyCredentialsIn{
		Email:    created.Email,
		Password: "wrong password",
	})
	require.ErrorIs(t, err, usecases.ErrInvalidCredentials)
}

func TestVerifyCredentialsUnknownEmailStillHashes(t *testing.T) {
	t.Parallel()

	hasher := &countingHasher{}
	u := usecases.New(&usecases.NewArgs{
		RepoHandler:    &fakeRepoHandler{repo: newRepo()},
		TimeProvider:   fixedTime{t: time.Now()},
		UUIDProvider:   &seqUUID{},
		PasswordHasher: hasher,
	})

	_, err := u.VerifyCredentials(t.Context(), usecases.VerifyCredentialsIn{
		Email:    "nobody@femin.test",
		Password: "whatever",
	})
	require.ErrorIs(t, err, usecases.ErrInvalidCredentials)
	require.EqualValues(t, 1, hasher.hashes.Load())
}

func TestSetUserRole(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())
	admin := createUser(t, u, "admin", models.UserRoleAdmin)
	user := createUser(t, u, "user", models.UserRoleUser)

	out, err := u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: admin.ID,
		UserID:  user.ID,
		Role:    models.UserRoleAdmin,
	})
	require.NoError(t, err)
	require.Equal(t, view_models.UserRoleAdmin, out.User.Role)

	out, err = u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: admin.ID,
		UserID:  user.ID,
		Role:    models.UserRoleUser,
	})
	require.NoError(t, err)
	require.Equal(t, view_models.UserRoleUser, out.User.Role)
}

func TestSetUserRoleCannotDemoteSelf(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())
	admin := createUser(t, u, "admin", models.UserRoleAdmin)

	_, err := u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: admin.ID,
		UserID:  admin.ID,
		Role:    models.UserRoleUser,
	})
	require.ErrorIs(t, err, usecases.ErrCannotDemoteSelf)
}

func TestSetUserRoleActorLostAdmin(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())
	first := createUser(t, u, "first", models.UserRoleAdmin)
	second := createUser(t, u, "second", models.UserRoleAdmin)

	_, err := u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: first.ID,
		UserID:  second.ID,
		Role:    models.UserRoleUser,
	})
	require.NoError(t, err)

	// second прошёл проверку роли до этого, но транзакция видит актуальную роль.
	_, err = u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: second.ID,
		UserID:  first.ID,
		Role:    models.UserRoleUser,
	})
	require.ErrorIs(t, err, usecases.ErrActorNotAdmin)
}

func TestSetUserRoleNotFound(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())
	admin := createUser(t, u, "admin", models.UserRoleAdmin)

	_, err := u.SetUserRole(t.Context(), usecases.SetUserRoleIn{
		ActorID: admin.ID,
		UserID:  uuid.New(),
		Role:    models.UserRoleAdmin,
	})
	require.ErrorIs(t, err, usecases.ErrUserNotFound)
}

func TestListUsersPagination(t *testing.T) {
	t.Parallel()

	repo := newRepo()
	u := newSeqUsecases(repo)

	for _, name := range []string{"aaa", "bbb", "ccc"} {
		createUser(t, u, name, models.UserRoleUser)
	}

	limit := 2

	first, err := u.ListUsers(t.Context(), usecases.ListUsersIn{Limit: &limit})
	require.NoError(t, err)
	require.Len(t, first.Items, 2)
	require.NotNil(t, first.NextCursor)

	second, err := u.ListUsers(t.Context(), usecases.ListUsersIn{Limit: &limit, Cursor: first.NextCursor})
	require.NoError(t, err)
	require.Nil(t, second.NextCursor)
}

func TestListUsersValidation(t *testing.T) {
	t.Parallel()

	u := newSeqUsecases(newRepo())

	cursor := "not-a-uuid"
	_, err := u.ListUsers(t.Context(), usecases.ListUsersIn{Cursor: &cursor})
	require.ErrorIs(t, err, usecases.ErrValidation)

	limit := 1000
	_, err = u.ListUsers(t.Context(), usecases.ListUsersIn{Limit: &limit})
	require.ErrorIs(t, err, usecases.ErrValidation)
}
