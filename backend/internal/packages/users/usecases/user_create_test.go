//go:build tests

package usecases

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func validCreateUserIn() CreateUserIn {
	return CreateUserIn{
		Email:    "admin@femin.test",
		Username: "admin",
		Password: "long enough",
		Role:     models.UserRoleAdmin,
	}
}

func TestCreateUserIn_Validate(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		require.NoError(t, validCreateUserIn().Validate())
	})

	errorCases := map[string]func(in *CreateUserIn){
		"error: empty email":    func(in *CreateUserIn) { in.Email = "" },
		"error: bad email":      func(in *CreateUserIn) { in.Email = "nope" },
		"error: long email":     func(in *CreateUserIn) { in.Email = strings.Repeat("a", 321) + "@femin.test" },
		"error: short username": func(in *CreateUserIn) { in.Username = "ab" },
		"error: long username":  func(in *CreateUserIn) { in.Username = strings.Repeat("a", 33) },
		"error: short password": func(in *CreateUserIn) { in.Password = "short" },
		"error: long password":  func(in *CreateUserIn) { in.Password = strings.Repeat("a", 129) },
		"error: unknown role":   func(in *CreateUserIn) { in.Role = "root" },
		"error: empty role":     func(in *CreateUserIn) { in.Role = "" },
	}

	for name, mutate := range errorCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			in := validCreateUserIn()
			mutate(&in)

			require.Error(t, in.Validate())
		})
	}
}

func TestUsersUsecases_CreateUser(t *testing.T) {
	t.Parallel()

	t.Run("ok: trims input and stores only the hash", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		id := uuid.Must(uuid.NewV7())
		now := time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC)

		user := models.NewUser(id)
		user.SetEmail("admin@femin.test")
		user.SetUsername("admin")
		user.SetRole(models.UserRoleAdmin)
		user.SetPasswordHash("hashed")
		user.SetCreatedAt(now)
		user.SetUpdatedAt(now)

		d.passwordHasher.EXPECT().Hash("long enough").Return("hashed", nil).Once()
		d.timeProvider.EXPECT().Now().Return(now).Once()
		d.uuidProvider.EXPECT().New().Return(id).Once()
		d.repo.EXPECT().CreateUser(mock.Anything, dto.CreateUserCommand{
			ID:           id,
			Email:        "admin@femin.test",
			Username:     "admin",
			PasswordHash: "hashed",
			Role:         models.UserRoleAdmin,
			CreatedAt:    now,
			UpdatedAt:    now,
		}).Return(dto.CreateUserResult{Result: user}, nil).Once()

		in := validCreateUserIn()
		in.Email = "  admin@femin.test "
		in.Username = " admin "

		out, err := newUsecase(d).CreateUser(t.Context(), in)
		r.NoError(err)
		r.Equal(id, out.User.ID)
		r.Equal(view_models.UserRoleAdmin, out.User.Role)
		r.Equal(now, out.User.CreatedAt)
	})

	t.Run("error: validation stops before hashing", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		in := validCreateUserIn()
		in.Password = "short"

		_, err := newUsecase(d).CreateUser(t.Context(), in)
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: user already exists", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.passwordHasher.EXPECT().Hash(mock.Anything).Return("hashed", nil).Once()
		d.timeProvider.EXPECT().Now().Return(time.Now()).Once()
		d.uuidProvider.EXPECT().New().Return(uuid.New()).Once()
		d.repo.EXPECT().CreateUser(mock.Anything, mock.Anything).
			Return(dto.CreateUserResult{}, ErrUserAlreadyExists).Once()

		_, err := newUsecase(d).CreateUser(t.Context(), validCreateUserIn())
		require.ErrorIs(t, err, ErrUserAlreadyExists)
	})

	t.Run("error: hasher failed", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		hashErr := errors.New("no entropy")
		d.passwordHasher.EXPECT().Hash(mock.Anything).Return("", hashErr).Once()

		_, err := newUsecase(d).CreateUser(t.Context(), validCreateUserIn())
		require.ErrorIs(t, err, hashErr)
	})
}
