package view_models

import (
	"time"

	"github.com/google/uuid"
)

// Item то, что usecase отдаёт наружу (транспортному слою).
type Item struct {
	ID          uuid.UUID
	Title       string
	Description string

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}
