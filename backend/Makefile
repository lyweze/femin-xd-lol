.PHONY: build run test up-test down-test lint up down admin-create gen gen-mocks

OAPI_CODEGEN = go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.8.1
MOCKERY = go run github.com/vektra/mockery/v3@v3.9.0

TEST_DATABASE_HTTP_DSN ?= postgres://femin:femin@localhost:55432/femin_test?sslmode=disable
TEST_VALKEY_ADDRESS ?= localhost:56379
TEST_SHOW_LOGS ?= 0

build:
	go build -o bin/femin ./main.go

run:
	set -a && . build/local/.env && set +a && go run ./main.go serve

test: up-test
	TEST_DATABASE_HTTP_DSN="$(TEST_DATABASE_HTTP_DSN)" \
	TEST_VALKEY_ADDRESS="$(TEST_VALKEY_ADDRESS)" \
	TEST_SHOW_LOGS="$(TEST_SHOW_LOGS)" \
	go test -test.fullpath=true -timeout 300s -tags=tests --race ./...

up-test:
	docker compose -f build/local/docker-compose.test.yml up -d --wait

down-test:
	docker compose -f build/local/docker-compose.test.yml down

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

gen-mocks:
	$(MOCKERY)
