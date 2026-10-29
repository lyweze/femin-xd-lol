package repo

import (
	"database/sql"

	"github.com/huandu/go-sqlbuilder"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/models"
)

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

func itemToModel(entity entities.Item) *models.Item {
	item := models.NewItem(entity.ID)
	item.SetTitle(entity.Title)
	item.SetDescription(entity.Description)
	item.SetCreatedAt(entity.CreatedAt)
	item.SetUpdatedAt(entity.UpdatedAt)
	item.SetDeletedAt(nullToPtr(entity.DeletedAt))

	return item
}

func nullToPtr[T any](v sql.Null[T]) *T {
	if !v.Valid {
		return nil
	}

	return &v.V
}
