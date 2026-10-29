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

type RepoHandler[R any, O any] struct {
	rw *pgxpool.Pool
	ro *pgxpool.Pool

	factory func(DBTX) R

	outboxFactory func(pgx.Tx) O
}

func (r *RepoHandler[R, O]) WithTxRW(ctx context.Context, fn func(repo R, outbox O) error) error {
	tx, err := r.rw.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer tx.Rollback(ctx) //nolint:errcheck

	if err := fn(r.factory(tx), r.outboxFactory(tx)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *RepoHandler[R, O]) WithTxRO(ctx context.Context, fn func(repo R) error) error {
	tx, err := r.ro.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer tx.Rollback(ctx) //nolint:errcheck

	if err := fn(r.factory(tx)); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *RepoHandler[R, O]) GetRepoRO() R {
	return r.factory(r.ro)
}

func (r *RepoHandler[R, O]) GetRepoRW() R {
	return r.factory(r.rw)
}

func NewRepoHandler[R any, O any](rw, ro *pgxpool.Pool, factory func(DBTX) R, outboxFactory func(pgx.Tx) O) *RepoHandler[R, O] {
	return &RepoHandler[R, O]{
		rw:            rw,
		ro:            ro,
		factory:       factory,
		outboxFactory: outboxFactory,
	}
}
