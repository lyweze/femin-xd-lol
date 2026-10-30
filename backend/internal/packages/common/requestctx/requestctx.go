package requestctx

import (
	"context"

	"github.com/google/uuid"
)

type sessionKey struct{}

type clientIPKey struct{}

type session struct {
	userID uuid.UUID
	token  string
}

func WithSession(ctx context.Context, userID uuid.UUID, token string) context.Context {
	return context.WithValue(ctx, sessionKey{}, session{userID: userID, token: token})
}

// UserID возвращает пользователя текущей сессии. Вне защищённых маршрутов ok будет false.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	s, ok := ctx.Value(sessionKey{}).(session)

	return s.userID, ok
}

// SessionToken возвращает токен текущей сессии. Вне защищённых маршрутов ok будет false.
func SessionToken(ctx context.Context) (string, bool) {
	s, ok := ctx.Value(sessionKey{}).(session)

	return s.token, ok
}

func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPKey{}, ip)
}

func ClientIP(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey{}).(string)

	return ip
}
