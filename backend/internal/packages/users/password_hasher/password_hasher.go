package password_hasher

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	memoryKiB  = 64 * 1024
	iterations = 3
	threads    = 2
	saltLen    = 16
	keyLen     = 32

	hashParts = 6
)

// ErrInvalidHash хэш не в формате argon2id
var ErrInvalidHash = errors.New("invalid password hash")

// PasswordHasher хэширует пароли через argon2id.
// Параметры лежат в самом хэше, поэтому их можно поднять, не ломая старые пароли.
type PasswordHasher struct {
}

func New() *PasswordHasher {
	return &PasswordHasher{}
}

func (h *PasswordHasher) Hash(password string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	key := argon2.IDKey([]byte(password), salt, iterations, memoryKiB, threads, keyLen)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		memoryKiB,
		iterations,
		threads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

func (h *PasswordHasher) Verify(password, hash string) (bool, error) {
	parts := strings.Split(hash, "$")
	if len(parts) != hashParts || parts[1] != "argon2id" {
		return false, ErrInvalidHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, ErrInvalidHash
	}

	var (
		memory, time uint32
		parallelism  uint8
	)

	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &parallelism); err != nil {
		return false, ErrInvalidHash
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, ErrInvalidHash
	}

	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, ErrInvalidHash
	}

	got := argon2.IDKey([]byte(password), salt, time, memory, parallelism, uint32(len(want))) //nolint:gosec

	return subtle.ConstantTimeCompare(got, want) == 1, nil
}
