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

// IntPtrRange проверяет необязательное число. В отличие от validation.Min, ноль не
// пропускается: ozzo считает его пустым значением, и limit=0 проходил бы проверку.
func IntPtrRange(minValue, maxValue int) validation.Rule {
	return validation.By(func(value any) error {
		v, ok := value.(*int)
		if !ok {
			return fmt.Errorf("invalid type: expected *int, got %T", value)
		}

		if v != nil && (*v < minValue || *v > maxValue) {
			return fmt.Errorf("must be between %d and %d", minValue, maxValue)
		}

		return nil
	})
}
