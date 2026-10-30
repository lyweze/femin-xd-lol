package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/pkg/opt"
)

type UserRole string

const (
	UserRoleUser  UserRole = "user"
	UserRoleAdmin UserRole = "admin"
)

type User struct {
	id       uuid.UUID
	email    opt.Optional[string]
	username opt.Optional[string]
	role     opt.Optional[UserRole]

	passwordHash opt.Optional[string]

	createdAt opt.Optional[time.Time]
	updatedAt opt.Optional[time.Time]
}

func NewUser(id uuid.UUID) *User {
	return &User{ //nolint:exhaustruct
		id: id,
	}
}

func (u *User) ID() uuid.UUID {
	return u.id
}

func (u *User) Email() string {
	return u.email.MustGet()
}

func (u *User) SetEmail(email string) {
	u.email = opt.New(email)
}

func (u *User) Username() string {
	return u.username.MustGet()
}

func (u *User) SetUsername(username string) {
	u.username = opt.New(username)
}

func (u *User) Role() UserRole {
	return u.role.MustGet()
}

func (u *User) SetRole(role UserRole) {
	u.role = opt.New(role)
}

func (u *User) PasswordHash() string {
	return u.passwordHash.MustGet()
}

func (u *User) SetPasswordHash(passwordHash string) {
	u.passwordHash = opt.New(passwordHash)
}

func (u *User) CreatedAt() time.Time {
	return u.createdAt.MustGet()
}

func (u *User) SetCreatedAt(createdAt time.Time) {
	u.createdAt = opt.New(createdAt)
}

func (u *User) UpdatedAt() time.Time {
	return u.updatedAt.MustGet()
}

func (u *User) SetUpdatedAt(updatedAt time.Time) {
	u.updatedAt = opt.New(updatedAt)
}
