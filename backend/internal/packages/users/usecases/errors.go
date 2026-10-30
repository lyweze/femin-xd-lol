package usecases

import "errors"

// Common errors
var (
	// ErrValidation validation error, should be used when input data is invalid
	ErrValidation = errors.New("validation error")
)

// User errors
var (
	// ErrUserAlreadyExists email or username is already taken
	ErrUserAlreadyExists = errors.New("user already exists")
)
