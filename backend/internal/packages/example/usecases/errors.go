package usecases

import "errors"

// Common errors
var (
	// ErrValidation validation error, should be used when input data is invalid
	ErrValidation = errors.New("validation error")
)

// Item errors
var (
	// ErrItemNotFound item not found
	ErrItemNotFound = errors.New("item not found")
)
