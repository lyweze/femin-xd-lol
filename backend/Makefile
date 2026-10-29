.PHONY: build run test lint up down

build:
	go build -o bin/femin ./main.go

run:
	set -a && . build/local/.env && set +a && go run ./main.go serve

test:
	go test ./...

lint:
	golangci-lint run ./...

up:
	docker compose -f build/local/docker-compose.yml up -d

down:
	docker compose -f build/local/docker-compose.yml down
