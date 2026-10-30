package repo

import (
	"fmt"

	"github.com/huandu/go-sqlbuilder"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

const pgUniqueViolation = "23505"

var spf = fmt.Sprintf //nolint:gochecknoglobals

func builder() sqlbuilder.Flavor {
	return sqlbuilder.PostgreSQL
}

type PgxRepo struct {
	db repositories.DBTX
}

func NewPgxRepo(db repositories.DBTX) *PgxRepo {
	return &PgxRepo{
		db: db,
	}
}

func userToModel(entity entities.User) *models.User {
	user := models.NewUser(entity.ID)
	user.SetEmail(entity.Email)
	user.SetUsername(entity.Username)
	user.SetRole(models.UserRole(entity.Role))
	user.SetPasswordHash(entity.PasswordHash)
	user.SetCreatedAt(entity.CreatedAt)
	user.SetUpdatedAt(entity.UpdatedAt)

	return user
}
