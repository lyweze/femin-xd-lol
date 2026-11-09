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
	// ErrUserNotFound user not found
	ErrUserNotFound = errors.New("user not found")
	// ErrInvalidCredentials wrong email or password
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrCannotDemoteSelf admin tried to remove own admin role
	ErrCannotDemoteSelf = errors.New("cannot remove own admin role")
	// ErrActorNotAdmin actor lost admin role while the request was in flight
	ErrActorNotAdmin = errors.New("actor is not an admin")
)
