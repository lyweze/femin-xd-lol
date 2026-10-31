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

func TestExampleUsecases_GetItem(t *testing.T) {
	t.Parallel()

	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		id := uuid.New()
		now := time.Now()

		item := models.NewItem(id)
		item.SetTitle("xd")
		item.SetDescription("lol")
		item.SetCreatedAt(now)
		item.SetUpdatedAt(now)
		item.SetDeletedAt(nil)

		d.repo.EXPECT().GetItem(mock.Anything, dto.GetItemQuery{ID: id}).Return(dto.GetItemResult{Result: item}, nil).Once()

		out, err := newUsecase(d).GetItem(t.Context(), GetItemIn{ID: id})
		r.NoError(err)
		r.Equal(id, out.Item.ID)
	})

	t.Run("error: not found", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.repo.EXPECT().GetItem(mock.Anything, mock.Anything).Return(dto.GetItemResult{}, ErrItemNotFound).Once()

		_, err := newUsecase(d).GetItem(t.Context(), GetItemIn{ID: uuid.New()})
		require.ErrorIs(t, err, ErrItemNotFound)
	})

	t.Run("error: nil id", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).GetItem(t.Context(), GetItemIn{ID: uuid.Nil})
		require.ErrorIs(t, err, ErrValidation)
	})
}
