FROM golang:1.26-bookworm AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /out/femin ./main.go

FROM migrate/migrate:v4.18.3 AS migrator

FROM gcr.io/distroless/static-debian12 AS release

COPY --from=migrator /usr/local/bin/migrate /bin/migrate
COPY build/app/migrations /migrations
COPY --from=build /out/femin /app/femin

WORKDIR /app

CMD ["/app/femin", "serve"]
