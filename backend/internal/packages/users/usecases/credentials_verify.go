package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

type VerifyCredentialsIn struct {
	Email    string
	Password string
}

type VerifyCredentialsOut struct {
	User view_models.User
}

func (u *UsersUsecases) VerifyCredentials(ctx context.Context, in VerifyCredentialsIn) (VerifyCredentialsOut, error) {
	// Читаем с мастера: пользователь мог зарегистрироваться только что.
	repo := u.repoHandler.GetRepoRW()

	result, err := repo.GetUserByEmail(ctx, dto.GetUserByEmailQuery{Email: strings.TrimSpace(in.Email)})
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			// Считаем хэш и для неизвестного email, иначе по времени ответа
			// можно узнать, какие адреса зарегистрированы.
			if _, hashErr := u.passwordHasher.Hash(in.Password); hashErr != nil {
				return VerifyCredentialsOut{}, fmt.Errorf("failed to hash password: %w", hashErr)
			}

			return VerifyCredentialsOut{}, ErrInvalidCredentials
		}

		return VerifyCredentialsOut{}, fmt.Errorf("failed to get user: %w", err)
	}

	ok, err := u.passwordHasher.Verify(in.Password, result.Result.PasswordHash())
	if err != nil {
		return VerifyCredentialsOut{}, fmt.Errorf("failed to verify password: %w", err)
	}

	if !ok {
		return VerifyCredentialsOut{}, ErrInvalidCredentials
	}

	presenter := &Presenter{}

	return VerifyCredentialsOut{
		User: presenter.User(result.Result),
	}, nil
}
