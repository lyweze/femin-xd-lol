package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

type CreateUserCommand struct {
	ID           uuid.UUID
	Email        string
	Username     string
	PasswordHash string
	Role         models.UserRole

	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateUserResult struct {
	Result *models.User
}
