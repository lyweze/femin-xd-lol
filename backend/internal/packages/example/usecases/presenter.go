package usecases

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/view_models"
)

type Presenter struct{}

func (p *Presenter) Item(item *models.Item) view_models.Item {
	return view_models.Item{
		ID:          item.ID(),
		Title:       item.Title(),
		Description: item.Description(),
		CreatedAt:   item.CreatedAt(),
		UpdatedAt:   item.UpdatedAt(),
		DeletedAt:   item.DeletedAt(),
	}
}
