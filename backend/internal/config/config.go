package config

import (
	"fmt"
	"time"

	"github.com/kelseyhightower/envconfig"
)

type LoggerConfig struct {
	MinLevel           string `envconfig:"MIN_LEVEL" default:"info"`
	MinLevelStacktrace string `envconfig:"MIN_LEVEL_STACKTRACE" default:"none"`
}

type DBPoolConfig struct {
	MaxConns          int32         `envconfig:"MAX_CONNS" default:"10"`
	MinConns          int32         `envconfig:"MIN_CONNS" default:"1"`
	MaxConnLifetime   time.Duration `envconfig:"MAX_CONN_LIFETIME" default:"30m"`
	MaxConnIdleTime   time.Duration `envconfig:"MAX_CONN_IDLE_TIME" default:"15m"`
	HealthCheckPeriod time.Duration `envconfig:"HEALTH_CHECK_PERIOD" default:"30s"`
}

type DBConfig struct {
	DSN string `envconfig:"DSN" required:"true"`
}

type HTTPServerConfig struct {
	Port int `envconfig:"PORT" default:"8000"`
	// ClientIPHeader заголовок с IP клиента, например X-Real-IP.
	// Задавать только за прокси, который сам его перезаписывает, иначе клиент подделает IP.
	ClientIPHeader string `envconfig:"CLIENT_IP_HEADER"`
}

type ValkeyConfig struct {
	Address  string `envconfig:"ADDRESS" required:"true"`
	Password string `envconfig:"PASSWORD"`
	DB       int    `envconfig:"DB" default:"0"`
	// Timeout ограничивает каждую операцию: без него при падении Valkey запросы висят, а не падают.
	Timeout time.Duration `envconfig:"TIMEOUT" default:"2s"`
}

type SessionConfig struct {
	TTL          time.Duration `envconfig:"TTL" default:"2160h"` // 90 дней
	CookieSecure bool          `envconfig:"COOKIE_SECURE" default:"true"`
}

type AuthLimitsConfig struct {
	LoginPerEmail int64         `envconfig:"LOGIN_PER_EMAIL" default:"10"`
	LoginPerIP    int64         `envconfig:"LOGIN_PER_IP" default:"50"`
	RegisterPerIP int64         `envconfig:"REGISTER_PER_IP" default:"10"`
	Window        time.Duration `envconfig:"WINDOW" default:"15m"`
}

type Config struct {
	Environment     string        `envconfig:"ENVIRONMENT" default:"local"`
	Debug           bool          `envconfig:"DEBUG"`
	ServiceName     string        `envconfig:"SERVICE_NAME" default:"femin"`
	ShutdownTimeout time.Duration `envconfig:"SHUTDOWN_TIMEOUT" default:"30s"`

	DebugServerListenPort int `envconfig:"DEBUG_SERVER_LISTEN_PORT" default:"8001"`

	HTTPServer HTTPServerConfig `envconfig:"HTTP_SERVER"`

	DBMaster  DBConfig `envconfig:"DB_MASTER"`
	DBReplica DBConfig `envconfig:"DB_REPLICA"`

	ServePGXPool        DBPoolConfig `envconfig:"SERVE_PGX_POOL"`
	ServePGXPoolReplica DBPoolConfig `envconfig:"SERVE_PGX_POOL_REPLICA"`

	Valkey ValkeyConfig `envconfig:"VALKEY"`

	Session    SessionConfig    `envconfig:"SESSION"`
	AuthLimits AuthLimitsConfig `envconfig:"AUTH_LIMITS"`

	Logger LoggerConfig `envconfig:"LOGGER"`
}

func GetConfig[T any]() (*T, error) {
	var config T

	if err := envconfig.Process("FEMIN", &config); err != nil {
		return nil, fmt.Errorf("error while parse env config: %w", err)
	}

	return &config, nil
}
