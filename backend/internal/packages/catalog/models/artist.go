package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/pkg/opt"
)

// Artist артист.
type Artist struct {
	id uuid.UUID

	name      opt.Optional[string]
	bio       opt.Optional[string]
	avatarKey opt.Optional[*string]
	createdAt opt.Optional[time.Time]
	updatedAt opt.Optional[time.Time]
}

func NewArtist(id uuid.UUID) *Artist {
	return &Artist{ //nolint:exhaustruct
		id: id,
	}
}

func (m *Artist) ID() uuid.UUID {
	return m.id
}

func (m *Artist) Name() string {
	return m.name.MustGet()
}

func (m *Artist) SetName(name string) {
	m.name = opt.New(name)
}

func (m *Artist) Bio() string {
	return m.bio.MustGet()
}

func (m *Artist) SetBio(bio string) {
	m.bio = opt.New(bio)
}

func (m *Artist) AvatarKey() *string {
	return m.avatarKey.MustGet()
}

func (m *Artist) SetAvatarKey(avatarKey *string) {
	m.avatarKey = opt.New(avatarKey)
}

func (m *Artist) CreatedAt() time.Time {
	return m.createdAt.MustGet()
}

func (m *Artist) SetCreatedAt(createdAt time.Time) {
	m.createdAt = opt.New(createdAt)
}

func (m *Artist) UpdatedAt() time.Time {
	return m.updatedAt.MustGet()
}

func (m *Artist) SetUpdatedAt(updatedAt time.Time) {
	m.updatedAt = opt.New(updatedAt)
}
