package entities

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID          uuid.UUID `db:"id"`
	Title       string    `db:"title"`
	Description string    `db:"description"`

	CreatedAt time.Time           `db:"created_at"`
	UpdatedAt time.Time           `db:"updated_at"`
	DeletedAt sql.Null[time.Time] `db:"deleted_at"`
}

const (
	ItemTableName = "items"

	ItemIDCol          = "id"
	ItemTitleCol       = "title"
	ItemDescriptionCol = "description"
	ItemCreatedAtCol   = "created_at"
	ItemUpdatedAtCol   = "updated_at"
	ItemDeletedAtCol   = "deleted_at"
)

var ItemCols = []string{ //nolint:gochecknoglobals
	ItemIDCol,
	ItemTitleCol,
	ItemDescriptionCol,
	ItemCreatedAtCol,
	ItemUpdatedAtCol,
	ItemDeletedAtCol,
}
