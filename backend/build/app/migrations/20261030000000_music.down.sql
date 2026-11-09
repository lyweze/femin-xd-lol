BEGIN;


DROP TABLE "jobs";
DROP TABLE "listening_history";
DROP TABLE "playlist_tracks";
DROP TABLE "playlists";
DROP TABLE "followed_artists";
DROP TABLE "liked_albums";
DROP TABLE "liked_tracks";
DROP TABLE "lyrics";
DROP TABLE "track_files";
DROP TABLE "track_artists";
DROP TABLE "tracks";
DROP TABLE "album_artists";
DROP TABLE "albums";
DROP TABLE "artists";
DROP TABLE "users";


DROP EXTENSION IF EXISTS pg_trgm;


COMMIT;
