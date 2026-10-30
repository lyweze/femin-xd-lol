.PHONY: build run test lint up down admin-create gen

OAPI_CODEGEN = go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.8.1

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

admin-create:
	set -a && . build/local/.env && set +a && go run ./main.go admin create --email "$(EMAIL)" --username "$(USERNAME)"

gen:
	$(OAPI_CODEGEN) --config docs/openapi/codegen/public.yaml docs/openapi/swagger.yaml
	$(OAPI_CODEGEN) --config docs/openapi/codegen/admin.yaml docs/openapi/swagger-admin-v1.yaml
