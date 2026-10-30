package usecases

import "errors"

// Session errors
var (
	// ErrSessionNotFound session does not exist or has expired
	ErrSessionNotFound = errors.New("session not found")
)

// Auth errors
var (
	// ErrTooManyAttempts rate limit exceeded
	ErrTooManyAttempts = errors.New("too many attempts")
	// ErrUnauthorized request has no valid session
	ErrUnauthorized = errors.New("unauthorized")
	// ErrForbidden user lacks the required role
	ErrForbidden = errors.New("forbidden")
)
