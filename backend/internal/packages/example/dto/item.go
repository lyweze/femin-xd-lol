package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/models"
)

type GetItemQuery struct {
	ID uuid.UUID
}

type GetItemResult struct {
	Result *models.Item
}

type CreateItemCommand struct {
	ID          uuid.UUID
	Title       string
	Description string

	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateItemResult struct {
	Result *models.Item
}
