package rate_limiter

import (
	"context"
	"fmt"
	"time"

	"github.com/valkey-io/valkey-go"
)

const keyPrefix = "rate_limit:"

// Limiter считает попытки в фиксированном окне.
type Limiter struct {
	client  valkey.Client
	timeout time.Duration
}

type NewArgs struct {
	Client  valkey.Client
	Timeout time.Duration
}

func New(args *NewArgs) *Limiter {
	return &Limiter{
		client:  args.Client,
		timeout: args.Timeout,
	}
}

func (l *Limiter) Allow(ctx context.Context, key string, limit int64, window time.Duration) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, l.timeout)
	defer cancel()

	c := l.client
	k := keyPrefix + key

	// Счётчик создаётся вместе с TTL, поэтому ключ без срока жизни не появится,
	// даже если INCR не дойдёт.
	results := c.DoMulti(ctx,
		c.B().Set().Key(k).Value("0").Nx().Ex(window).Build(),
		c.B().Incr().Key(k).Build(),
	)

	if err := results[0].Error(); err != nil && !valkey.IsValkeyNil(err) {
		return false, fmt.Errorf("failed to init counter: %w", err)
	}

	count, err := results[1].AsInt64()
	if err != nil {
		return false, fmt.Errorf("failed to increment counter: %w", err)
	}

	return count <= limit, nil
}

func (l *Limiter) Reset(ctx context.Context, key string) error {
	ctx, cancel := context.WithTimeout(ctx, l.timeout)
	defer cancel()

	c := l.client

	if err := c.Do(ctx, c.B().Del().Key(keyPrefix+key).Build()).Error(); err != nil {
		return fmt.Errorf("failed to reset counter: %w", err)
	}

	return nil
}
