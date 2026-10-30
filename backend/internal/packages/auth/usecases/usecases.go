package usecases

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/google/uuid"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

type Users interface {
	CreateUser(ctx context.Context, in users.CreateUserIn) (users.CreateUserOut, error)
	GetUser(ctx context.Context, in users.GetUserIn) (users.GetUserOut, error)
	VerifyCredentials(ctx context.Context, in users.VerifyCredentialsIn) (users.VerifyCredentialsOut, error)
}

type Sessions interface {
	Create(ctx context.Context, userID uuid.UUID) (string, error)
	Get(ctx context.Context, token string) (uuid.UUID, error)
	Delete(ctx context.Context, userID uuid.UUID, token string) error
	DeleteAll(ctx context.Context, userID uuid.UUID) error
}

type RateLimiter interface {
	Allow(ctx context.Context, key string, limit int64, window time.Duration) (bool, error)
	Reset(ctx context.Context, key string) error
}

type Limits struct {
	LoginPerEmail int64
	LoginPerIP    int64
	RegisterPerIP int64
	Window        time.Duration
}

type AuthUsecases struct {
	users       Users
	sessions    Sessions
	rateLimiter RateLimiter
	limits      Limits
}

type NewArgs struct {
	Users       Users
	Sessions    Sessions
	RateLimiter RateLimiter
	Limits      Limits
}

func New(args *NewArgs) *AuthUsecases {
	return &AuthUsecases{
		users:       args.Users,
		sessions:    args.Sessions,
		rateLimiter: args.RateLimiter,
		limits:      args.Limits,
	}
}

func loginEmailKey(email string) string {
	// Хэш, чтобы адреса не лежали в ключах Valkey открытым текстом.
	sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(email))))

	return "login:email:" + hex.EncodeToString(sum[:])
}

func loginIPKey(ip string) string {
	return "login:ip:" + ip
}

func registerIPKey(ip string) string {
	return "register:ip:" + ip
}
