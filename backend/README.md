# femin backend

Каркас по слоям.

```
main.go                          точка входа (cobra)
cmd/
  root.go                        корневая команда
  commands/serve.go              `femin serve`: собирает DI-контейнер, стартует серверы, graceful shutdown
  commands/admin.go              `femin admin create`: создаёт администратора
internal/
  config/                        конфиг из env (префикс FEMIN_)
  di/                            базовые провайдеры: config, logger, shutdown
  db/                            pgxpool master/replica
  valkey/                        клиент Valkey
  debugserver/                   /alive, /ready
  httpserver/                    HTTP-сервер + фасад, собирающий роуты всех пакетов
  entities/                      структуры таблиц БД (db-теги, имена колонок)
  packages/
    common/
      interfaces/                RepoHandler — транзакции без знания о pgx
      repositories/              реализация RepoHandler на pgx
      time_provider/             реализация TimeProvider
      uuid_provider/             реализация UUIDProvider
      requestctx/                сессия и IP клиента в контексте запроса
    users/                       пользователи и роли, тот же набор слоёв + password_hasher (argon2id), admin_handlers
    auth/                        вход, сессии в Valkey (sessions), лимит попыток (rate_limiter), middleware
    example/                     доменный пакет (заглушка, переименовать под себя)
      example.go                 Provide/Invoke — wiring пакета в DI
      http_handlers/             транспорт: HTTP <-> usecases.*In/*Out
      usecases/                  бизнес-логика; объявляет интерфейсы Repo, TimeProvider, UUIDProvider
      repo/                      реализация Repo на pgx + sqlbuilder, entities -> models
      dto/                       Query/Command/Result — контракт usecases <-> repo
      models/                    доменные модели (приватные поля + геттеры/сеттеры)
      view_models/               то, что usecase отдаёт наружу
pkg/                             переиспользуемые утилиты без доменной логики
gen/                             код из OpenAPI (make gen), руками не менять
tests/
  mocks/                         моки из интерфейсов (make gen-mocks), руками не менять
  stubs/                         RepoHandler без транзакций для unit-тестов
docs/openapi/
  swagger.yaml                   контракт плеера (/api/v1)
  swagger-admin-v1.yaml          контракт админки (/admin/v1), нужна роль admin
  codegen/                       настройки генерации, включённые теги
build/
  app/Dockerfile
  app/migrations/                golang-migrate
  local/                         docker-compose с postgres, template.env
```

Зависимости идут только внутрь: `http_handlers -> usecases <- repo`.
Usecases не импортируют ни pgx, ни net/http.

## Запуск

```bash
make up
cp build/local/template.env build/local/.env
make run
```

```bash
curl -X POST localhost:8000/api/v1/items -d '{"title":"xd","description":"lol"}'
curl localhost:8000/api/v1/items/<id>
curl localhost:8001/ready
```

## Первый администратор

Без него в админку некому войти. Пароль спрашивается в терминале или читается из stdin, флага для него нет намеренно.

```bash
make admin-create EMAIL=admin@example.com USERNAME=admin
```

Следующих администраторов добавляют из админки: `AdminCreateUser` и `AdminSetUserRole` в `docs/openapi/swagger-admin-v1.yaml`.

## Авторизация

Сессия это случайный токен в HttpOnly cookie `femin_session`, в Valkey лежит его sha256 и `user_id`. Живёт 90 дней (`FEMIN_SESSION_TTL`), срок не продлевается.

Все маршруты закрыты по умолчанию. Публичны только те, что перечислены в `publicRoutes` в `internal/httpserver/handlers.go`. Роль администратора проверяется по Postgres на каждый запрос, поэтому снятие роли действует сразу.

За reverse proxy задай `FEMIN_HTTP_SERVER_CLIENT_IP_HEADER`, иначе лимит по IP будет один на всех. Только если прокси сам перезаписывает этот заголовок.

## Тесты

```bash
make test
```

Команда поднимает `build/local/docker-compose.test.yml` (нужен запущенный Docker) и запускает всё с `--race`. Тесты под тегом `tests`, поэтому обычный `go test ./...` их не видит, а в IDE тег надо включить в настройках сборки. Окружение остаётся работать, останавливает его `make down-test`.

- **`internal/httpserver`:** suite на настоящих Postgres и Valkey, запросы идут через весь роутер. Один файл на хендлер: `auth_login_test.go`, `admin_user_list_test.go` и так далее.
- **`usecases`, `middleware`:** тест лежит рядом с кодом, зависимости заменены моками.
- **Моки:** `tests/mocks` генерируется из интерфейсов командой `make gen-mocks`, руками не правится. Изменил интерфейс, запусти её снова.

База для тестов своя и живёт в памяти, потому что suite чистит таблицы перед каждым подтестом и удаляет схему в конце.

## Контракт и генерация

`make gen` пересобирает `gen/` из `docs/openapi`. Новый тег подключается в `docs/openapi/codegen/*.yaml`, его методы становятся обязательными: хендлеры встраиваются в `publicHandlers` или `adminHandlers` в `internal/httpserver/handlers.go`.

## Новый домен

Имена типов в DI должны быть уникальны на весь проект: `samber/do` различает сервисы по короткому имени без пакета, поэтому `usecases.ExampleUsecases`, а не `usecases.Usecases`. Конфликт ловит `TestProvideServeHasNoDuplicateServices`.

1. Скопировать `internal/packages/example` в `internal/packages/<name>`.
2. Добавить entity в `internal/entities` и миграцию в `build/app/migrations`.
3. Вызвать `<name>.Provide(container)` в `cmd/commands/serve.go`.
4. Зарегистрировать роуты в `internal/httpserver/handlers.go`.
