package repositories

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (commandTag pgconn.CommandTag, err error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	SendBatch(ctx context.Context, b *pgx.Batch) pgx.BatchResults
	CopyFrom(ctx context.Context, tableName pgx.Identifier, columnNames []string, rowSrc pgx.CopyFromSource) (int64, error)
}

type RepoHandler[R any] struct {
	rw *pgxpool.Pool
	ro *pgxpool.Pool

	factory func(DBTX) R
}

func (r *RepoHandler[R]) WithTxRW(ctx context.Context, fn func(repo R) error) error {
	return withTx(ctx, r.rw, r.factory, fn)
}

func (r *RepoHandler[R]) WithTxRO(ctx context.Context, fn func(repo R) error) error {
	return withTx(ctx, r.ro, r.factory, fn)
}

func (r *RepoHandler[R]) GetRepoRO() R {
	return r.factory(r.ro)
}

func (r *RepoHandler[R]) GetRepoRW() R {
	return r.factory(r.rw)
}

func NewRepoHandler[R any](rw, ro *pgxpool.Pool, factory func(DBTX) R) *RepoHandler[R] {
	return &RepoHandler[R]{
		rw:      rw,
		ro:      ro,
		factory: factory,
	}
}

func withTx[R any](ctx context.Context, pool *pgxpool.Pool, factory func(DBTX) R, fn func(repo R) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer tx.Rollback(ctx) //nolint:errcheck

	if err := fn(factory(tx)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
