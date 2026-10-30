package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

const (
	userEmailMaxLen    = 320
	userUsernameMinLen = 3
	userUsernameMaxLen = 32
	userPasswordMinLen = 8
	userPasswordMaxLen = 128
)

type CreateUserIn struct {
	Email    string
	Username string
	Password string
	Role     models.UserRole
}

func (i CreateUserIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.Email, validation.Required, validation.RuneLength(1, userEmailMaxLen), is.EmailFormat),
		validation.Field(&i.Username, validation.Required, validation.RuneLength(userUsernameMinLen, userUsernameMaxLen)),
		validation.Field(&i.Password, validation.Required, validation.RuneLength(userPasswordMinLen, userPasswordMaxLen)),
		validation.Field(&i.Role, validation.Required, validation.In(models.UserRoleUser, models.UserRoleAdmin)),
	)
}

type CreateUserOut struct {
	User view_models.User
}

func (u *Usecases) CreateUser(ctx context.Context, in CreateUserIn) (CreateUserOut, error) {
	in.Email = strings.TrimSpace(in.Email)
	in.Username = strings.TrimSpace(in.Username)

	if err := in.Validate(); err != nil {
		return CreateUserOut{}, errors.Join(ErrValidation, err)
	}

	passwordHash, err := u.passwordHasher.Hash(in.Password)
	if err != nil {
		return CreateUserOut{}, fmt.Errorf("failed to hash password: %w", err)
	}

	now := u.timeProvider.Now()

	repo := u.repoHandler.GetRepoRW()

	// may return:
	// - [ErrUserAlreadyExists] if email or username is already taken
	result, err := repo.CreateUser(ctx, dto.CreateUserCommand{
		ID:           u.uuidProvider.New(),
		Email:        in.Email,
		Username:     in.Username,
		PasswordHash: passwordHash,
		Role:         in.Role,
		CreatedAt:    now,
		UpdatedAt:    now,
	})
	if err != nil {
		return CreateUserOut{}, fmt.Errorf("failed to create user: %w", err)
	}

	presenter := &Presenter{}

	return CreateUserOut{
		User: presenter.User(result.Result),
	}, nil
}
