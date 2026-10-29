package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lyweze/femin-xd-lol/backend/internal/config"
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/samber/do"
)

const (
	master  = "db_master"
	replica = "db_replica"
)

type pgxpoolShutdowner struct {
	*pgxpool.Pool
}

func (p pgxpoolShutdowner) Shutdown() error {
	p.Close()

	return nil
}

func InvokeMaster(i *do.Injector) *pgxpool.Pool {
	shutdowner := do.MustInvokeNamed[pgxpoolShutdowner](i, master)

	return shutdowner.Pool
}

func InvokeReplica(i *do.Injector) *pgxpool.Pool {
	shutdowner := do.MustInvokeNamed[pgxpoolShutdowner](i, replica)

	return shutdowner.Pool
}

func ProvideServe(i *do.Injector) {
	do.ProvideNamed(i, master, func(i *do.Injector) (pgxpoolShutdowner, error) {
		cfg := di.InvokeConfig(i)

		pool, err := providePGXPool(context.Background(), cfg.DBMaster, cfg.ServePGXPool)
		if err != nil {
			return pgxpoolShutdowner{}, fmt.Errorf("error while creating serve master db pool: %w", err)
		}

		return pgxpoolShutdowner{Pool: pool}, nil
	})

	do.ProvideNamed(i, replica, func(i *do.Injector) (pgxpoolShutdowner, error) {
		cfg := di.InvokeConfig(i)

		pool, err := providePGXPool(context.Background(), cfg.DBReplica, cfg.ServePGXPoolReplica)
		if err != nil {
			return pgxpoolShutdowner{}, fmt.Errorf("error while creating serve replica db pool: %w", err)
		}

		return pgxpoolShutdowner{Pool: pool}, nil
	})
}

func providePGXPool(ctx context.Context, dbCfg config.DBConfig, poolCfg config.DBPoolConfig) (*pgxpool.Pool, error) {
	pgxCfg, err := pgxpool.ParseConfig(dbCfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("failed to parse dsn: %w", err)
	}

	pgxCfg.MaxConns = poolCfg.MaxConns
	pgxCfg.MinConns = poolCfg.MinConns
	pgxCfg.MaxConnLifetime = poolCfg.MaxConnLifetime
	pgxCfg.MaxConnIdleTime = poolCfg.MaxConnIdleTime
	pgxCfg.HealthCheckPeriod = poolCfg.HealthCheckPeriod

	pool, err := pgxpool.NewWithConfig(ctx, pgxCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	return pool, nil
}
