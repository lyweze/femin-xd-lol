# femin backend

Каркас по слоям, как в offer-storage / promoter-v2.

```
main.go                          точка входа (cobra)
cmd/
  root.go                        корневая команда
  commands/serve.go              `femin serve`: собирает DI-контейнер, стартует серверы, graceful shutdown
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
    example/                     доменный пакет (заглушка, переименовать под себя)
      example.go                 Provide/Invoke — wiring пакета в DI
      http_handlers/             транспорт: HTTP <-> usecases.*In/*Out
      usecases/                  бизнес-логика; объявляет интерфейсы Repo, TimeProvider, UUIDProvider
      repo/                      реализация Repo на pgx + sqlbuilder, entities -> models
      dto/                       Query/Command/Result — контракт usecases <-> repo
      models/                    доменные модели (приватные поля + геттеры/сеттеры)
      view_models/               то, что usecase отдаёт наружу
      time_provider/             реализация TimeProvider
      uuid_provider/             реализация UUIDProvider
pkg/                             переиспользуемые утилиты без доменной логики
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

## Новый домен

1. Скопировать `internal/packages/example` в `internal/packages/<name>`.
2. Добавить entity в `internal/entities` и миграцию в `build/app/migrations`.
3. Вызвать `<name>.Provide(container)` в `cmd/commands/serve.go`.
4. Зарегистрировать роуты в `internal/httpserver/handlers.go`.
