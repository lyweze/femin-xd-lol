package stubs

import "context"

type RepoHandlerStub[T any] struct {
	repo T
}

func NewRepoHandlerStub[T any](repo T) *RepoHandlerStub[T] {
	return &RepoHandlerStub[T]{repo: repo}
}

func (r *RepoHandlerStub[T]) WithTxRW(_ context.Context, fn func(repo T) error) error {
	return fn(r.repo)
}

func (r *RepoHandlerStub[T]) WithTxRO(_ context.Context, fn func(repo T) error) error {
	return fn(r.repo)
}

func (r *RepoHandlerStub[T]) GetRepoRO() T {
	return r.repo
}

func (r *RepoHandlerStub[T]) GetRepoRW() T {
	return r.repo
}
