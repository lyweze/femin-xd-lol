package uuid_provider

import "github.com/google/uuid"

type UUIDProvider struct {
}

func NewUUIDProvider() *UUIDProvider {
	return &UUIDProvider{}
}

func (p *UUIDProvider) New() uuid.UUID {
	return uuid.Must(uuid.NewV7())
}
