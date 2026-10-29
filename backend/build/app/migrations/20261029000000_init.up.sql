BEGIN;

CREATE TABLE "items" (
    "id"          UUID PRIMARY KEY,
    "title"       VARCHAR(255) NOT NULL,
    "description" TEXT         NOT NULL DEFAULT '',
    "created_at"  TIMESTAMPTZ  NOT NULL,
    "updated_at"  TIMESTAMPTZ  NOT NULL,
    "deleted_at"  TIMESTAMPTZ
);

COMMIT;
