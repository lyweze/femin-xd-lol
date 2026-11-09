package sessions

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/valkey-io/valkey-go"
)

const (
	sessionKeyPrefix      = "session:"
	userSessionsKeyPrefix = "user_sessions:"

	tokenBytes = 32
)

// Store хранит сессии в Valkey. В ключах только sha256 от токена: утечка дампа
// Valkey не даёт войти под чужой сессией.
type Store struct {
	client  valkey.Client
	ttl     time.Duration
	timeout time.Duration
}

type NewArgs struct {
	Client  valkey.Client
	TTL     time.Duration
	Timeout time.Duration
}

func New(args *NewArgs) *Store {
	return &Store{
		client:  args.Client,
		ttl:     args.TTL,
		timeout: args.Timeout,
	}
}

func (s *Store) Create(ctx context.Context, userID uuid.UUID) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	raw := make([]byte, tokenBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := hashToken(token)
	userKey := userSessionsKey(userID)

	c := s.client

	// Сессия пишется последней: если запись оборвётся, в наборе останется лишний
	// хэш, а не сессия, которую не закроет выход со всех устройств.
	results := c.DoMulti(ctx,
		c.B().Sadd().Key(userKey).Member(hash).Build(),
		c.B().Expire().Key(userKey).Seconds(int64(s.ttl.Seconds())).Build(),
		c.B().Set().Key(sessionKey(hash)).Value(userID.String()).Ex(s.ttl).Build(),
	)

	for _, result := range results {
		if err := result.Error(); err != nil {
			return "", fmt.Errorf("failed to store session: %w", err)
		}
	}

	return token, nil
}

func (s *Store) Get(ctx context.Context, token string) (uuid.UUID, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	c := s.client

	value, err := c.Do(ctx, c.B().Get().Key(sessionKey(hashToken(token))).Build()).ToString()
	if err != nil {
		if valkey.IsValkeyNil(err) {
			return uuid.Nil, usecases.ErrSessionNotFound
		}

		return uuid.Nil, fmt.Errorf("failed to get session: %w", err)
	}

	userID, err := uuid.Parse(value)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to parse session user id: %w", err)
	}

	return userID, nil
}

func (s *Store) Delete(ctx context.Context, userID uuid.UUID, token string) error {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	hash := hashToken(token)

	c := s.client

	results := c.DoMulti(ctx,
		c.B().Del().Key(sessionKey(hash)).Build(),
		c.B().Srem().Key(userSessionsKey(userID)).Member(hash).Build(),
	)

	for _, result := range results {
		if err := result.Error(); err != nil {
			return fmt.Errorf("failed to delete session: %w", err)
		}
	}

	return nil
}

func (s *Store) DeleteAll(ctx context.Context, userID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	c := s.client
	userKey := userSessionsKey(userID)

	hashes, err := c.Do(ctx, c.B().Smembers().Key(userKey).Build()).AsStrSlice()
	if err != nil {
		return fmt.Errorf("failed to list sessions: %w", err)
	}

	keys := make([]string, 0, len(hashes)+1)
	for _, hash := range hashes {
		keys = append(keys, sessionKey(hash))
	}

	keys = append(keys, userKey)

	if err := c.Do(ctx, c.B().Del().Key(keys...).Build()).Error(); err != nil {
		return fmt.Errorf("failed to delete sessions: %w", err)
	}

	return nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))

	return hex.EncodeToString(sum[:])
}

func sessionKey(hash string) string {
	return sessionKeyPrefix + hash
}

func userSessionsKey(userID uuid.UUID) string {
	return userSessionsKeyPrefix + userID.String()
}
