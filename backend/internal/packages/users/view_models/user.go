package view_models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	UserRoleUser  UserRole = "user"
	UserRoleAdmin UserRole = "admin"
)

// User то, что usecase отдаёт наружу. Хэша пароля здесь нет намеренно.
type User struct {
	ID       uuid.UUID
	Email    string
	Username string
	Role     UserRole

	CreatedAt time.Time
	UpdatedAt time.Time
}
