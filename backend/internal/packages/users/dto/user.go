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

type GetUserQuery struct {
	ID uuid.UUID
}

type GetUserResult struct {
	Result *models.User
}

type GetUserByEmailQuery struct {
	Email string
}

type GetUserByEmailResult struct {
	Result *models.User
}

type ListUsersQuery struct {
	Search *string
	Role   *models.UserRole
	// AfterID курсор: страница начинается со следующего после него пользователя.
	AfterID *uuid.UUID
	Limit   int
}

type ListUsersResult struct {
	Items []*models.User
}

type LockAdminsResult struct {
	IDs []uuid.UUID
}

type UpdateUserRoleCommand struct {
	ID        uuid.UUID
	Role      models.UserRole
	UpdatedAt time.Time
}

type UpdateUserRoleResult struct {
	Result *models.User
}
