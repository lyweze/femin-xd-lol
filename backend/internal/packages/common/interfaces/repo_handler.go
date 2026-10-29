package interfaces

import "context"

type RepoHandler[R any] interface {
	WithTxRW(ctx context.Context, fn func(repo R) error) error
	WithTxRO(ctx context.Context, fn func(repo R) error) error
	GetRepoRO() R
	GetRepoRW() R
}

type RepoHandlerOutbox[R any, O any] interface {
	WithTxRW(ctx context.Context, fn func(repo R, outbox O) error) error
	WithTxRO(ctx context.Context, fn func(repo R) error) error
	GetRepoRO() R
	GetRepoRW() R
}
