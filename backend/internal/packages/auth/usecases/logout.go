package usecases

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type LogoutIn struct {
	UserID uuid.UUID
	Token  string
}

func (u *AuthUsecases) Logout(ctx context.Context, in LogoutIn) error {
	if err := u.sessions.Delete(ctx, in.UserID, in.Token); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

type LogoutAllIn struct {
	UserID uuid.UUID
}

func (u *AuthUsecases) LogoutAll(ctx context.Context, in LogoutAllIn) error {
	if err := u.sessions.DeleteAll(ctx, in.UserID); err != nil {
		return fmt.Errorf("failed to delete sessions: %w", err)
	}

	return nil
}
