package usecases

import "errors"

// Common errors
var (
	// ErrValidation validation error, should be used when input data is invalid
	ErrValidation = errors.New("validation error")
)

// Artist errors
var (
	// ErrArtistNotFound artist not found
	ErrArtistNotFound = errors.New("artist not found")
	// ErrArtistInUse artist still has albums or tracks
	ErrArtistInUse = errors.New("artist still has albums or tracks")
)

// Album errors
var (
	// ErrAlbumNotFound album not found
	ErrAlbumNotFound = errors.New("album not found")
	// ErrAlbumNotPublishable album has no cover, no tracks or not every track is ready
	ErrAlbumNotPublishable = errors.New("album cannot be published")
)

// Track errors
var (
	// ErrTrackNotFound track not found
	ErrTrackNotFound = errors.New("track not found")
)
