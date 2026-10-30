package usecases

import (
	"context"
	"fmt"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

type RegisterIn struct {
	Email    string
	Username string
	Password string
	ClientIP string
}

type RegisterOut struct {
	User  view_models.User
	Token string
}

func (u *AuthUsecases) Register(ctx context.Context, in RegisterIn) (RegisterOut, error) {
	allowed, err := u.rateLimiter.Allow(ctx, registerIPKey(in.ClientIP), u.limits.RegisterPerIP, u.limits.Window)
	if err != nil {
		return RegisterOut{}, fmt.Errorf("failed to check rate limit: %w", err)
	}

	if !allowed {
		return RegisterOut{}, ErrTooManyAttempts
	}

	// Роль всегда user: администратора можно создать только из админки или командой.
	out, err := u.users.CreateUser(ctx, users.CreateUserIn{
		Email:    in.Email,
		Username: in.Username,
		Password: in.Password,
		Role:     models.UserRoleUser,
	})
	if err != nil {
		return RegisterOut{}, fmt.Errorf("failed to create user: %w", err)
	}

	token, err := u.sessions.Create(ctx, out.User.ID)
	if err != nil {
		return RegisterOut{}, fmt.Errorf("failed to create session: %w", err)
	}

	return RegisterOut{
		User:  out.User,
		Token: token,
	}, nil
}
