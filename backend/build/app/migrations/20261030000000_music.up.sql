BEGIN;


CREATE EXTENSION IF NOT EXISTS pg_trgm;


CREATE TABLE "users" (
    "id"            UUID PRIMARY KEY,
    "email"         VARCHAR(320) NOT NULL,
    "username"      VARCHAR(32)  NOT NULL,
    "password_hash" TEXT         NOT NULL,
    "role"          TEXT         NOT NULL DEFAULT 'user' CHECK ("role" IN ('user', 'admin')),
    "created_at"    TIMESTAMPTZ  NOT NULL,
    "updated_at"    TIMESTAMPTZ  NOT NULL,
    "deleted_at"    TIMESTAMPTZ
);

CREATE UNIQUE INDEX "idx_users_email_key" ON "users" (lower("email")) WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "idx_users_username_key" ON "users" (lower("username")) WHERE "deleted_at" IS NULL;


CREATE TABLE "artists" (
    "id"         UUID PRIMARY KEY,
    "name"       VARCHAR(255) NOT NULL,
    "bio"        TEXT         NOT NULL DEFAULT '',
    "avatar_key" TEXT,
    "created_at" TIMESTAMPTZ  NOT NULL,
    "updated_at" TIMESTAMPTZ  NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX "idx_artists_name_trgm" ON "artists" USING GIN ("name" gin_trgm_ops) WHERE "deleted_at" IS NULL;


-- Публикуется альбом целиком: published_at в будущем = отложенный релиз.
CREATE TABLE "albums" (
    "id"           UUID PRIMARY KEY,
    "title"        VARCHAR(255) NOT NULL,
    "type"         TEXT         NOT NULL CHECK ("type" IN ('album', 'ep', 'single', 'compilation')),
    "release_date" DATE,
    "cover_key"    TEXT,
    "published_at" TIMESTAMPTZ,
    "created_at"   TIMESTAMPTZ  NOT NULL,
    "updated_at"   TIMESTAMPTZ  NOT NULL,
    "deleted_at"   TIMESTAMPTZ
);

CREATE INDEX "idx_albums_published_at" ON "albums" ("published_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_albums_title_trgm" ON "albums" USING GIN ("title" gin_trgm_ops) WHERE "deleted_at" IS NULL;


CREATE TABLE "album_artists" (
    "album_id"  UUID     NOT NULL REFERENCES "albums" ("id") ON DELETE CASCADE,
    "artist_id" UUID     NOT NULL REFERENCES "artists" ("id"),
    "position"  SMALLINT NOT NULL,
    PRIMARY KEY ("album_id", "artist_id")
);

CREATE INDEX "idx_album_artists_artist_id" ON "album_artists" ("artist_id");


-- draft: нет аудио, processing: обрабатывает worker, ready: можно слушать, failed: см. processing_error.
-- Порядок треков не уникальный индекс: перестановка обновляет несколько строк сразу.
CREATE TABLE "tracks" (
    "id"               UUID PRIMARY KEY,
    "album_id"         UUID         NOT NULL REFERENCES "albums" ("id"),
    "title"            VARCHAR(255) NOT NULL,
    "disc_no"          SMALLINT     NOT NULL DEFAULT 1,
    "track_no"         SMALLINT     NOT NULL,
    "duration_ms"      INTEGER,
    "explicit"         BOOLEAN      NOT NULL DEFAULT FALSE,
    "status"           TEXT         NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'processing', 'ready', 'failed')),
    "processing_error" TEXT,
    "created_at"       TIMESTAMPTZ  NOT NULL,
    "updated_at"       TIMESTAMPTZ  NOT NULL,
    "deleted_at"       TIMESTAMPTZ
);

CREATE INDEX "idx_tracks_album_id_order" ON "tracks" ("album_id", "disc_no", "track_no") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_tracks_status" ON "tracks" ("status") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_tracks_title_trgm" ON "tracks" USING GIN ("title" gin_trgm_ops) WHERE "deleted_at" IS NULL;


CREATE TABLE "track_artists" (
    "track_id"  UUID     NOT NULL REFERENCES "tracks" ("id") ON DELETE CASCADE,
    "artist_id" UUID     NOT NULL REFERENCES "artists" ("id"),
    "role"      TEXT     NOT NULL DEFAULT 'main' CHECK ("role" IN ('main', 'feat')),
    "position"  SMALLINT NOT NULL,
    PRIMARY KEY ("track_id", "artist_id")
);

CREATE INDEX "idx_track_artists_artist_id" ON "track_artists" ("artist_id");


-- source: исходник админа (нужен для повторной обработки), stream: то, что отдаём слушателям.
CREATE TABLE "track_files" (
    "id"           UUID PRIMARY KEY,
    "track_id"     UUID        NOT NULL REFERENCES "tracks" ("id") ON DELETE CASCADE,
    "kind"         TEXT        NOT NULL CHECK ("kind" IN ('source', 'stream')),
    "format"       TEXT        NOT NULL,
    "bitrate_kbps" INTEGER,
    "object_key"   TEXT        NOT NULL,
    "size_bytes"   BIGINT      NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL,
    UNIQUE NULLS NOT DISTINCT ("track_id", "kind", "format", "bitrate_kbps")
);


CREATE TABLE "lyrics" (
    "track_id"   UUID        NOT NULL REFERENCES "tracks" ("id") ON DELETE CASCADE,
    "language"   VARCHAR(8)  NOT NULL,
    "synced"     BOOLEAN     NOT NULL,
    "offset_ms"  INTEGER     NOT NULL DEFAULT 0,
    "lines"      JSONB       NOT NULL,
    "plain_text" TEXT        NOT NULL,
    "source"     TEXT        NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("track_id", "language")
);


CREATE TABLE "liked_tracks" (
    "user_id"  UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "track_id" UUID        NOT NULL REFERENCES "tracks" ("id"),
    "liked_at" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("user_id", "track_id")
);

CREATE INDEX "idx_liked_tracks_user_id_liked_at" ON "liked_tracks" ("user_id", "liked_at" DESC, "track_id" DESC);
CREATE INDEX "idx_liked_tracks_track_id" ON "liked_tracks" ("track_id");


CREATE TABLE "liked_albums" (
    "user_id"  UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "album_id" UUID        NOT NULL REFERENCES "albums" ("id"),
    "liked_at" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("user_id", "album_id")
);

CREATE INDEX "idx_liked_albums_user_id_liked_at" ON "liked_albums" ("user_id", "liked_at" DESC, "album_id" DESC);
CREATE INDEX "idx_liked_albums_album_id" ON "liked_albums" ("album_id");


CREATE TABLE "followed_artists" (
    "user_id"     UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "artist_id"   UUID        NOT NULL REFERENCES "artists" ("id"),
    "followed_at" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("user_id", "artist_id")
);

CREATE INDEX "idx_followed_artists_user_id_followed_at" ON "followed_artists" ("user_id", "followed_at" DESC, "artist_id" DESC);
CREATE INDEX "idx_followed_artists_artist_id" ON "followed_artists" ("artist_id");


CREATE TABLE "playlists" (
    "id"          UUID PRIMARY KEY,
    "owner_id"    UUID         NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "title"       VARCHAR(255) NOT NULL,
    "description" TEXT         NOT NULL DEFAULT '',
    "is_public"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "created_at"  TIMESTAMPTZ  NOT NULL,
    "updated_at"  TIMESTAMPTZ  NOT NULL,
    "deleted_at"  TIMESTAMPTZ
);

CREATE INDEX "idx_playlists_owner_id_created_at" ON "playlists" ("owner_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;


-- Свой id, потому что один трек может стоять в плейлисте несколько раз.
-- position идёт с шагом, чтобы вставка в середину не сдвигала остальные строки.
CREATE TABLE "playlist_tracks" (
    "id"          UUID PRIMARY KEY,
    "playlist_id" UUID        NOT NULL REFERENCES "playlists" ("id") ON DELETE CASCADE,
    "track_id"    UUID        NOT NULL REFERENCES "tracks" ("id"),
    "position"    BIGINT      NOT NULL,
    "added_at"    TIMESTAMPTZ NOT NULL,
    UNIQUE ("playlist_id", "position")
);

CREATE INDEX "idx_playlist_tracks_track_id" ON "playlist_tracks" ("track_id");


CREATE TABLE "listening_history" (
    "user_id"     UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "track_id"    UUID        NOT NULL REFERENCES "tracks" ("id"),
    "played_at"   TIMESTAMPTZ NOT NULL,
    "ms_listened" INTEGER     NOT NULL,
    PRIMARY KEY ("user_id", "played_at", "track_id")
);

CREATE INDEX "idx_listening_history_track_id_played_at" ON "listening_history" ("track_id", "played_at" DESC);


-- Очередь фоновых задач для `femin worker`, забирается через FOR UPDATE SKIP LOCKED.
CREATE TABLE "jobs" (
    "id"         UUID PRIMARY KEY,
    "kind"       TEXT        NOT NULL,
    "payload"    JSONB       NOT NULL,
    "status"     TEXT        NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'running', 'done', 'failed')),
    "attempts"   INTEGER     NOT NULL DEFAULT 0,
    "run_at"     TIMESTAMPTZ NOT NULL,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX "idx_jobs_pending_run_at" ON "jobs" ("run_at") WHERE "status" = 'pending';


COMMIT;
