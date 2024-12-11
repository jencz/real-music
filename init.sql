DROP DATABASE IF EXISTS "RealDB";
CREATE DATABASE "RealDB";

\c RealDB;

DROP TABLE IF EXISTS artists CASCADE;
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    artist_name TEXT NOT NULL,
    artist_id TEXT,
    followers INTEGER,
    artist_pfp_link TEXT
);

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    user_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    user_name TEXT UNIQUE,
    user_pfp_link TEXT,
    favorite_artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS songs;
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    track_id TEXT,
    song_title TEXT,
    artist_name TEXT,
    artist_id INTEGER,
    album_name TEXT,
    album_id TEXT,
    duration_ms INTEGER,
    artwork_url TEXT,
    preview_url TEXT
);

DROP TABLE IF EXISTS playlists;
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    playlist_name TEXT,
    song_count INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS artist_songs;
CREATE TABLE artist_songs (
    artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS liked_songs;
CREATE TABLE liked_songs (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS playlist_songs;
CREATE TABLE playlist_songs (
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE
);

