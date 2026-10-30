package usecases

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

// Authenticate находит пользователя по токену сессии.
func (u *AuthUsecases) Authenticate(ctx context.Context, token string) (uuid.UUID, error) {
	userID, err := u.sessions.Get(ctx, token)
	if err != nil {
		if errors.Is(err, ErrSessionNotFound) {
			return uuid.Nil, ErrUnauthorized
		}

		return uuid.Nil, fmt.Errorf("failed to get session: %w", err)
	}

	return userID, nil
}

type GetMeIn struct {
	UserID uuid.UUID
}

type GetMeOut struct {
	User view_models.User
}

func (u *AuthUsecases) GetMe(ctx context.Context, in GetMeIn) (GetMeOut, error) {
	out, err := u.users.GetUser(ctx, users.GetUserIn{ID: in.UserID})
	if err != nil {
		if errors.Is(err, users.ErrUserNotFound) {
			return GetMeOut{}, ErrUnauthorized
		}

		return GetMeOut{}, fmt.Errorf("failed to get user: %w", err)
	}

	return GetMeOut{User: out.User}, nil
}

// RequireAdmin проверяет роль по БД, а не по сессии: снятая роль действует сразу.
func (u *AuthUsecases) RequireAdmin(ctx context.Context, userID uuid.UUID) error {
	out, err := u.GetMe(ctx, GetMeIn{UserID: userID})
	if err != nil {
		return err
	}

	if out.User.Role != view_models.UserRole(models.UserRoleAdmin) {
		return ErrForbidden
	}

	return nil
}
