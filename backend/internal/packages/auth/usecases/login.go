package usecases

import (
	"context"
	"fmt"

	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

type LoginIn struct {
	Email    string
	Password string
	ClientIP string
}

type LoginOut struct {
	User  view_models.User
	Token string
}

func (u *AuthUsecases) Login(ctx context.Context, in LoginIn) (LoginOut, error) {
	emailKey := loginEmailKey(in.Email)

	allowed, err := u.rateLimiter.Allow(ctx, emailKey, u.limits.LoginPerEmail, u.limits.Window)
	if err != nil {
		return LoginOut{}, fmt.Errorf("failed to check email rate limit: %w", err)
	}

	if !allowed {
		return LoginOut{}, ErrTooManyAttempts
	}

	allowed, err = u.rateLimiter.Allow(ctx, loginIPKey(in.ClientIP), u.limits.LoginPerIP, u.limits.Window)
	if err != nil {
		return LoginOut{}, fmt.Errorf("failed to check ip rate limit: %w", err)
	}

	if !allowed {
		return LoginOut{}, ErrTooManyAttempts
	}

	// may return:
	// - [users.ErrInvalidCredentials] if email or password is wrong
	out, err := u.users.VerifyCredentials(ctx, users.VerifyCredentialsIn{
		Email:    in.Email,
		Password: in.Password,
	})
	if err != nil {
		return LoginOut{}, fmt.Errorf("failed to verify credentials: %w", err)
	}

	// Успешный вход обнуляет счётчик, чтобы старые опечатки не копились.
	if err := u.rateLimiter.Reset(ctx, emailKey); err != nil {
		return LoginOut{}, fmt.Errorf("failed to reset rate limit: %w", err)
	}

	token, err := u.sessions.Create(ctx, out.User.ID)
	if err != nil {
		return LoginOut{}, fmt.Errorf("failed to create session: %w", err)
	}

	return LoginOut{
		User:  out.User,
		Token: token,
	}, nil
}
