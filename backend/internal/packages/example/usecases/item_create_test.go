//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestExampleUsecases_CreateItem(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		id := uuid.New()
		now := time.Date(2026, 10, 29, 12, 0, 0, 0, time.UTC)

		item := models.NewItem(id)
		item.SetTitle("xd")
		item.SetDescription("lol")
		item.SetCreatedAt(now)
		item.SetUpdatedAt(now)
		item.SetDeletedAt(nil)

		d.timeProvider.EXPECT().Now().Return(now).Once()
		d.uuidProvider.EXPECT().New().Return(id).Once()
		d.repo.EXPECT().CreateItem(mock.Anything, dto.CreateItemCommand{
			ID:          id,
			Title:       "xd",
			Description: "lol",
			CreatedAt:   now,
			UpdatedAt:   now,
		}).Return(dto.CreateItemResult{Result: item}, nil).Once()

		out, err := newUsecase(d).CreateItem(t.Context(), CreateItemIn{Title: "xd", Description: "lol"})
		r.NoError(err)
		r.Equal(id, out.Item.ID)
		r.Equal(now, out.Item.CreatedAt)
	})

	t.Run("error: empty title", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).CreateItem(t.Context(), CreateItemIn{Title: ""})
		require.ErrorIs(t, err, ErrValidation)
	})
}
