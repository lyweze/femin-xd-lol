package entities

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `db:"id"`
	Email        string    `db:"email"`
	Username     string    `db:"username"`
	PasswordHash string    `db:"password_hash"`
	Role         string    `db:"role"`

	CreatedAt time.Time           `db:"created_at"`
	UpdatedAt time.Time           `db:"updated_at"`
	DeletedAt sql.Null[time.Time] `db:"deleted_at"`
}

const (
	UserTableName = "users"

	UserIDCol           = "id"
	UserEmailCol        = "email"
	UserUsernameCol     = "username"
	UserPasswordHashCol = "password_hash"
	UserRoleCol         = "role"
	UserCreatedAtCol    = "created_at"
	UserUpdatedAtCol    = "updated_at"
	UserDeletedAtCol    = "deleted_at"
)

var UserCols = []string{ //nolint:gochecknoglobals
	UserIDCol,
	UserEmailCol,
	UserUsernameCol,
	UserPasswordHashCol,
	UserRoleCol,
	UserCreatedAtCol,
	UserUpdatedAtCol,
	UserDeletedAtCol,
}
