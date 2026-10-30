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
  debugserver/                   /alive, /ready
  httpserver/                    HTTP-сервер + фасад, собирающий роуты всех пакетов
  entities/                      структуры таблиц БД (db-теги, имена колонок)
  packages/
    common/
      interfaces/                RepoHandler — транзакции без знания о pgx
      repositories/              реализация RepoHandler на pgx
      time_provider/             реализация TimeProvider
      uuid_provider/             реализация UUIDProvider
    users/                       пользователи и роли, тот же набор слоёв + password_hasher (argon2id)
    example/                     доменный пакет (заглушка, переименовать под себя)
      example.go                 Provide/Invoke — wiring пакета в DI
      http_handlers/             транспорт: HTTP <-> usecases.*In/*Out
      usecases/                  бизнес-логика; объявляет интерфейсы Repo, TimeProvider, UUIDProvider
      repo/                      реализация Repo на pgx + sqlbuilder, entities -> models
      dto/                       Query/Command/Result — контракт usecases <-> repo
      models/                    доменные модели (приватные поля + геттеры/сеттеры)
      view_models/               то, что usecase отдаёт наружу
pkg/                             переиспользуемые утилиты без доменной логики
docs/openapi/
  swagger.yaml                   контракт плеера (/api/v1)
  swagger-admin-v1.yaml          контракт админки (/admin/v1), нужна роль admin
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

## Новый домен

1. Скопировать `internal/packages/example` в `internal/packages/<name>`.
2. Добавить entity в `internal/entities` и миграцию в `build/app/migrations`.
3. Вызвать `<name>.Provide(container)` в `cmd/commands/serve.go`.
4. Зарегистрировать роуты в `internal/httpserver/handlers.go`.
