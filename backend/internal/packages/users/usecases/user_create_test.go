package usecases_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/require"
)

type fakeRepo struct {
	emails map[string]struct{}
	last   dto.CreateUserCommand
}

func (r *fakeRepo) CreateUser(_ context.Context, cmd dto.CreateUserCommand) (dto.CreateUserResult, error) {
	if _, ok := r.emails[cmd.Email]; ok {
		return dto.CreateUserResult{}, usecases.ErrUserAlreadyExists
	}

	r.emails[cmd.Email] = struct{}{}
	r.last = cmd

	user := models.NewUser(cmd.ID)
	user.SetEmail(cmd.Email)
	user.SetUsername(cmd.Username)
	user.SetRole(cmd.Role)
	user.SetCreatedAt(cmd.CreatedAt)
	user.SetUpdatedAt(cmd.UpdatedAt)

	return dto.CreateUserResult{Result: user}, nil
}

type fakeRepoHandler struct {
	repo *fakeRepo
}

func (h *fakeRepoHandler) WithTxRW(_ context.Context, fn func(usecases.Repo) error) error {
	return fn(h.repo)
}

func (h *fakeRepoHandler) WithTxRO(_ context.Context, fn func(usecases.Repo) error) error {
	return fn(h.repo)
}

func (h *fakeRepoHandler) GetRepoRO() usecases.Repo { return h.repo }
func (h *fakeRepoHandler) GetRepoRW() usecases.Repo { return h.repo }

type fixedTime struct{ t time.Time }

func (f fixedTime) Now() time.Time { return f.t }

type fixedUUID struct{ id uuid.UUID }

func (f fixedUUID) New() uuid.UUID { return f.id }

type fakeHasher struct{}

func (fakeHasher) Hash(password string) (string, error) { return "hashed:" + password, nil }

func newUsecases(repo *fakeRepo, id uuid.UUID, now time.Time) *usecases.Usecases {
	return usecases.New(&usecases.NewArgs{
		RepoHandler:    &fakeRepoHandler{repo: repo},
		TimeProvider:   fixedTime{t: now},
		UUIDProvider:   fixedUUID{id: id},
		PasswordHasher: fakeHasher{},
	})
}

func newRepo() *fakeRepo {
	return &fakeRepo{emails: map[string]struct{}{}}
}

func validIn() usecases.CreateUserIn {
	return usecases.CreateUserIn{
		Email:    "admin@femin.test",
		Username: "admin",
		Password: "long enough",
		Role:     models.UserRoleAdmin,
	}
}

func TestCreateUser(t *testing.T) {
	t.Parallel()

	repo := newRepo()
	id := uuid.New()
	now := time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC)

	in := validIn()
	in.Email = "  admin@femin.test "

	out, err := newUsecases(repo, id, now).CreateUser(t.Context(), in)
	require.NoError(t, err)

	require.Equal(t, id, out.User.ID)
	require.Equal(t, "admin@femin.test", out.User.Email)
	require.Equal(t, view_models.UserRoleAdmin, out.User.Role)
	require.Equal(t, now, out.User.CreatedAt)
	require.Equal(t, "hashed:long enough", repo.last.PasswordHash)
}

func TestCreateUserValidation(t *testing.T) {
	t.Parallel()

	tests := map[string]func(in *usecases.CreateUserIn){
		"bad email":      func(in *usecases.CreateUserIn) { in.Email = "nope" },
		"short username": func(in *usecases.CreateUserIn) { in.Username = "ab" },
		"short password": func(in *usecases.CreateUserIn) { in.Password = "short" },
		"unknown role":   func(in *usecases.CreateUserIn) { in.Role = "root" },
		"empty role":     func(in *usecases.CreateUserIn) { in.Role = "" },
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			in := validIn()
			mutate(&in)

			repo := newRepo()

			_, err := newUsecases(repo, uuid.New(), time.Now()).CreateUser(t.Context(), in)
			require.ErrorIs(t, err, usecases.ErrValidation)
			require.Empty(t, repo.emails)
		})
	}
}

func TestCreateUserAlreadyExists(t *testing.T) {
	t.Parallel()

	u := newUsecases(newRepo(), uuid.New(), time.Now())

	_, err := u.CreateUser(t.Context(), validIn())
	require.NoError(t, err)

	_, err = u.CreateUser(t.Context(), validIn())
	require.ErrorIs(t, err, usecases.ErrUserAlreadyExists)
}
