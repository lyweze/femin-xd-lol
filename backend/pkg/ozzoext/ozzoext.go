package ozzoext

import (
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
)

var (
	// ErrUUIDNil UUID errors
	ErrUUIDNil = validation.NewError("validation_uuid_nil", "uuid cannot be nil")
)

var NotNilUUID = validation.By(notNilUUID) //nolint:gochecknoglobals

func notNilUUID(value any) error {
	var u uuid.UUID

	switch v := value.(type) {
	case uuid.UUID:
		u = v
	case *uuid.UUID:
		if v == nil {
			return ErrUUIDNil
		}

		u = *v
	default:
		return fmt.Errorf("invalid type: expected uuid.UUID, got %T", value)
	}

	if u == uuid.Nil {
		return ErrUUIDNil
	}

	return nil
}
