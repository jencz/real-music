import postgres from "postgres";

import { snakeToCamel, convertToCase, camelToSnake } from "../utils";
import Song, { SongProps } from "./Song";

export interface PlaylistProps {
  id?: number;
  playlistName: string;
  songCount?: number;
  userId: number;
}

export interface LikedSongProps {
  songId: number;
  songName: string;
  artistName: string;
}

export interface PlaylistSongProps {
  playlistId: number;
  songId: number;
  songName: string;
  artistName: string;
}

export default class Playlist {

  constructor(
    private sql: postgres.Sql<any>,
    public props: PlaylistProps,
  ) { }

  static async read(sql: postgres.Sql<any>, playlistId: number): Promise<Playlist> {

    const connection = await sql.reserve();

    const [row] = await connection<PlaylistProps[]>`
    SELECT * FROM playlists
    WHERE id = ${playlistId}`;

    await connection.release();

    return new Playlist(sql, convertToCase(snakeToCamel, row) as PlaylistProps)
  }

  readAllSongs = async () => {
    const connection = await this.sql.reserve();

    const rows = await connection<SongProps[]>`
    SELECT s.id, s.track_id, s.song_title, s.artist_name, s.artist_id, s.album_name, s.album_id, s.duration_ms, s.artwork_url, s.preview_url
    FROM playlist_songs ps
    JOIN songs s ON ps.song_id = s.id
    WHERE ps.playlist_id = ${this.props.id}`;

    await connection.release();

    return rows.map(
      (row) =>
        new Song(this.sql, convertToCase(snakeToCamel, row) as SongProps),
    );
  }

  // "Cuz it's an actual one" -Sam 3:19 am, 2024-05-20 nice

  static async readUserPlaylists(sql: postgres.Sql<any>, userId: number) {

    const connection = await sql.reserve();

    const rows = await connection<PlaylistProps[]>`
    SELECT * FROM playlists
    WHERE user_id = ${userId}`;

    await connection.release();

    return rows.map(
      (row) =>
        new Playlist(sql, convertToCase(snakeToCamel, row) as PlaylistProps),
    );
  }

  

  static async readLikedSongs(sql: postgres.Sql<any>, userId: number): Promise<Song[]> {

    const connection = await sql.reserve();

    const rows = await connection<SongProps[]>`
    SELECT s.id, s.track_id, s.song_title, s.artist_name, s.artist_id, s.album_name, s.album_id, s.duration_ms, s.artwork_url, s.preview_url
    FROM liked_songs ls
    JOIN songs s ON ls.song_id = s.id
    WHERE ls.user_id = ${userId}`;

    await connection.release();

    return rows.map(
      (row) =>
        new Song(sql, convertToCase(snakeToCamel, row) as SongProps),
    );
  }

  static async create(sql: postgres.Sql<any>, props: PlaylistProps): Promise<Playlist> {

    const { playlistName, userId } = props;

    const connection = await sql.reserve();

    const [row] = await connection<PlaylistProps[]>`
    INSERT INTO playlists (playlist_name, song_count, user_id)
    VALUES (${playlistName}, 0, ${userId})
    RETURNING id, playlist_name AS "playlistName", song_count AS "songCount", user_id AS "userId"`;

    await connection.release();

    return new Playlist(sql, convertToCase(snakeToCamel, row) as PlaylistProps);
  }

  async update(updateProps: Partial<PlaylistProps>): Promise<void> {

    const { playlistName } = updateProps;

    const connection = await this.sql.reserve();

    // add the pfp here NOAH! Unless I end up doing his part (Yeah Right...)
    const [row] = await connection`
    UPDATE playlists
    SET playlist_name = ${playlistName}
    WHERE id = ${this.props.id}`;

    await connection.release();

    this.props = { ...this.props, ...convertToCase(snakeToCamel, row) };
  }

  async delete() {

    const connection = await this.sql.reserve();

    const result = await connection`
    DELETE FROM playlists
    WHERE id = ${this.props.id}`;

    await connection.release();

    return result.count === 1;
  }

  async addSongToPlaylist(songId: number): Promise<void> {

    const connection = await this.sql.reserve();

    const [row] = await connection`
            INSERT INTO playlist_songs (playlist_id, song_id)
            VALUES (${this.props.id}, ${songId})
        `;

    return
  }
}
