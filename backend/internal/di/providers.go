package di

import (
	"fmt"
	"os"

	"github.com/lyweze/femin-xd-lol/backend/internal/config"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func logLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn", "warning":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "dpanic":
		return zapcore.DPanicLevel
	case "panic":
		return zapcore.PanicLevel
	case "fatal":
		return zapcore.FatalLevel
	case "none":
		fallthrough
	default:
		return zapcore.InvalidLevel
	}
}

func createZapLogger(cfg *config.Config) *zap.Logger {
	encoderCfg := zap.NewProductionEncoderConfig()
	encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

	encoder := zapcore.NewJSONEncoder(encoderCfg)

	stdoutLevel := logLevel(cfg.Logger.MinLevel)

	stdoutFilter := zap.LevelEnablerFunc(func(level zapcore.Level) bool {
		return level >= stdoutLevel && level < zapcore.ErrorLevel
	})

	stderrFilter := zap.LevelEnablerFunc(func(level zapcore.Level) bool {
		return level >= zapcore.ErrorLevel
	})

	core := zapcore.NewTee(
		zapcore.NewCore(
			encoder,
			zapcore.Lock(os.Stdout),
			stdoutFilter,
		),
		zapcore.NewCore(
			encoder,
			zapcore.Lock(os.Stderr),
			stderrFilter,
		),
	)

	return zap.New(core, zap.AddStacktrace(logLevel(cfg.Logger.MinLevelStacktrace)))
}

func provideLogger(cfg *config.Config) *zap.Logger {
	return createZapLogger(cfg).With(
		zap.String("service", cfg.ServiceName),
		zap.String("environment", cfg.Environment),
	)
}

func provideDebugLogger() (*zap.Logger, error) {
	l, err := zap.NewDevelopment()
	if err != nil {
		return l, fmt.Errorf("error while creating debug logger: %w", err)
	}

	return l, nil
}
