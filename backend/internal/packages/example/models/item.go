package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/pkg/opt"
)

// Item доменная модель. Поля приватные, доступ через геттеры/сеттеры,
// чтобы слой usecases не зависел от того, откуда модель собрана.
type Item struct {
	id          uuid.UUID
	title       opt.Optional[string]
	description opt.Optional[string]

	createdAt opt.Optional[time.Time]
	updatedAt opt.Optional[time.Time]
	deletedAt opt.Optional[*time.Time]
}

func NewItem(id uuid.UUID) *Item {
	return &Item{ //nolint:exhaustruct
		id: id,
	}
}

func (i *Item) ID() uuid.UUID {
	return i.id
}

func (i *Item) Title() string {
	return i.title.MustGet()
}

func (i *Item) SetTitle(title string) {
	i.title = opt.New(title)
}

func (i *Item) Description() string {
	return i.description.MustGet()
}

func (i *Item) SetDescription(description string) {
	i.description = opt.New(description)
}

func (i *Item) CreatedAt() time.Time {
	return i.createdAt.MustGet()
}

func (i *Item) SetCreatedAt(createdAt time.Time) {
	i.createdAt = opt.New(createdAt)
}

func (i *Item) UpdatedAt() time.Time {
	return i.updatedAt.MustGet()
}

func (i *Item) SetUpdatedAt(updatedAt time.Time) {
	i.updatedAt = opt.New(updatedAt)
}

func (i *Item) DeletedAt() *time.Time {
	return i.deletedAt.MustGet()
}

func (i *Item) SetDeletedAt(deletedAt *time.Time) {
	i.deletedAt = opt.New(deletedAt)
}
