package usecases_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"github.com/stretchr/testify/require"
)

type fakeRepo struct {
	items map[uuid.UUID]*models.Item
}

func (r *fakeRepo) GetItem(_ context.Context, q dto.GetItemQuery) (dto.GetItemResult, error) {
	item, ok := r.items[q.ID]
	if !ok {
		return dto.GetItemResult{}, usecases.ErrItemNotFound
	}

	return dto.GetItemResult{Result: item}, nil
}

func (r *fakeRepo) CreateItem(_ context.Context, cmd dto.CreateItemCommand) (dto.CreateItemResult, error) {
	item := models.NewItem(cmd.ID)
	item.SetTitle(cmd.Title)
	item.SetDescription(cmd.Description)
	item.SetCreatedAt(cmd.CreatedAt)
	item.SetUpdatedAt(cmd.UpdatedAt)
	item.SetDeletedAt(nil)

	r.items[cmd.ID] = item

	return dto.CreateItemResult{Result: item}, nil
}

type fakeRepoHandler struct {
	repo *fakeRepo
}

func (h *fakeRepoHandler) WithTxRW(_ context.Context, fn func(usecases.Repo, usecases.Outbox) error) error {
	return fn(h.repo, nil)
}

func (h *fakeRepoHandler) WithTxRO(_ context.Context, fn func(usecases.Repo) error) error {
	return fn(h.repo)
}

func (h *fakeRepoHandler) GetRepoRO() usecases.Repo { return h.repo }
func (h *fakeRepoHandler) GetRepoRW() usecases.Repo { return h.repo }

type fixedTime struct{ t time.Time }

func (f fixedTime) Now() time.Time { return f.t }

type fixedUUID struct{ id uuid.UUID }

func (f fixedUUID) New() uuid.UUID { return f.id }

func newUsecases(id uuid.UUID, now time.Time) *usecases.Usecases {
	return usecases.New(&usecases.NewArgs{
		RepoHandler:  &fakeRepoHandler{repo: &fakeRepo{items: map[uuid.UUID]*models.Item{}}},
		TimeProvider: fixedTime{t: now},
		UUIDProvider: fixedUUID{id: id},
	})
}

func TestCreateAndGetItem(t *testing.T) {
	t.Parallel()

	id := uuid.New()
	now := time.Date(2026, 10, 29, 12, 0, 0, 0, time.UTC)
	u := newUsecases(id, now)

	created, err := u.CreateItem(t.Context(), usecases.CreateItemIn{Title: "xd", Description: "lol"})
	require.NoError(t, err)
	require.Equal(t, id, created.Item.ID)
	require.Equal(t, now, created.Item.CreatedAt)

	got, err := u.GetItem(t.Context(), usecases.GetItemIn{ID: id})
	require.NoError(t, err)
	require.Equal(t, created.Item, got.Item)
}

func TestCreateItemValidation(t *testing.T) {
	t.Parallel()

	u := newUsecases(uuid.New(), time.Now())

	_, err := u.CreateItem(t.Context(), usecases.CreateItemIn{Title: ""})
	require.ErrorIs(t, err, usecases.ErrValidation)
}

func TestGetItemNotFound(t *testing.T) {
	t.Parallel()

	u := newUsecases(uuid.New(), time.Now())

	_, err := u.GetItem(t.Context(), usecases.GetItemIn{ID: uuid.New()})
	require.ErrorIs(t, err, usecases.ErrItemNotFound)

	_, err = u.GetItem(t.Context(), usecases.GetItemIn{ID: uuid.Nil})
	require.ErrorIs(t, err, usecases.ErrValidation)
}
