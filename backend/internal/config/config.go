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

	Logger LoggerConfig `envconfig:"LOGGER"`
}

func GetConfig[T any]() (*T, error) {
	var config T

	if err := envconfig.Process("FEMIN", &config); err != nil {
		return nil, fmt.Errorf("error while parse env config: %w", err)
	}

	return &config, nil
}
