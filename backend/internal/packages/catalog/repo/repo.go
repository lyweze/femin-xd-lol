package repo

import (
	"database/sql"
	"fmt"

	"github.com/huandu/go-sqlbuilder"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
)

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

func applyLock(query *sqlbuilder.SelectBuilder, table string, lock dto.Lock) {
	switch lock {
	case dto.LockShare:
		query.SQL(spf("FOR SHARE OF %s", table))
	case dto.LockUpdate:
		query.SQL(spf("FOR UPDATE OF %s", table))
	case dto.LockNone:
	}
}

// applyPage сортирует по id по убыванию: UUIDv7 растёт со временем, новые идут первыми.
func applyPage(query *sqlbuilder.SelectBuilder, idCol string, page dto.Page) {
	if page.AfterID != nil {
		query.Where(query.LessThan(idCol, *page.AfterID))
	}

	query.OrderByDesc(idCol)
	query.Limit(page.Limit)
}

func nullToPtr[T any](v sql.Null[T]) *T {
	if !v.Valid {
		return nil
	}

	return &v.V
}
