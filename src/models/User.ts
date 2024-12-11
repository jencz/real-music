import postgres from "postgres";
import {
  camelToSnake,
  convertToCase,
  createUTCDate,
  snakeToCamel,
  DEFAULT_PROFILE_PICTURE
} from "../utils";
import Song, { SongProps } from "./Song";
import { error } from "console";
import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";
import Playlist, { PlaylistProps } from "./Playlist";
// import { aR } from "vitest/dist/reporters-P7C2ytIv.js";

export interface UserProps {
  id?: number;
  email: string;
  userPassword: string;
  createdAt: Date;
  editedAt?: string;
  userName?: string;
  userPfpLink?: string;
  favArtistId?: number;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("User with this email already exists.");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials.");
  }
}

export default class User {
  constructor(
    private sql: postgres.Sql<any>,
    public props: UserProps
  ) { }

  static async create(sql: postgres.Sql<any>, props: UserProps): Promise<User> {
    const connection = await sql.reserve();

    let user = await sql`
			INSERT INTO users
				${sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`;

    await connection.release();

    return new User(sql, convertToCase(snakeToCamel, user[0]) as UserProps);
  }

  static async read(sql: postgres.Sql<any>, id: number) {
    const connection = await sql.reserve();

    const [row] = await connection<UserProps[]>`
			SELECT * FROM users
			WHERE id = ${id}
		`;

    await connection.release();

    if (!row) {
      return null;
    }

    return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
  }

  async update(updateProps: Partial<UserProps>) {
    const connection = await this.sql.reserve();

    const [row] = await connection`
			UPDATE users
			SET
				${this.sql(convertToCase(camelToSnake, updateProps))}, edited_at = ${createUTCDate()}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

    await connection.release();

    this.props = { ...this.props, ...convertToCase(snakeToCamel, row) };
  }

  static async login(
    sql: postgres.Sql<any>,
    email: string,
    password: string
  ): Promise<User | null> {
    const connection = await sql.reserve();
    const [row] = await connection<UserProps[]>`
					SELECT * FROM
					users WHERE email = ${email} AND user_password = ${password}
				`;
    await connection.release();

    // If row two returns something, password matches account.
    if (row) {
      // User found.
      return new User(sql, convertToCase(snakeToCamel, row) as UserProps);
    } else {
      // No match.
      throw new InvalidCredentialsError();
    }
  }

  async getFavoriteArtists(sql: postgres.Sql<any>, trackId: string) {
    const connection = await sql.reserve();

    const rows = await connection<SongProps[]>`
			SELECT favorite_artist_id
			FROM users
			WHERE id = ${this.props.id}
		`;

    await connection.release();

    return rows.map(
      (row) => new Song(sql, convertToCase(snakeToCamel, row) as SongProps)
    );
  }

  async getPlaylists() {
    const connection = await this.sql.reserve();

    const rows = await connection<PlaylistProps[]>`
			SELECT id, playlist_name, song_count, user_id
			FROM playlists
			WHERE user_id = ${this.props.id}
		`;

    await connection.release();

    return rows.map(
      (row) => new Playlist(this.sql, convertToCase(snakeToCamel, row) as PlaylistProps)
    );
  }

  async getPlaylistCount(sql: postgres.Sql<any>) {
    const connection = await sql.reserve();

    // How to return just the number??
    const numberMaybe = await connection`
			SELECT COUNT(*)
			FROM playlists
			WHERE user_id = ${this.props.id}
      GROUP BY user_id
		`;

    await connection.release();

    return numberMaybe
  }

  async getFavoriteSongs(): Promise<Song[]> {
    const connection = await this.sql.reserve();

    const rows = await connection<SongProps[]>`
			SELECT *
			FROM liked_songs
			WHERE user_id = ${this.props.id}
		`;

    await connection.release();

    return rows.map(
      (row) => new Song(this.sql, convertToCase(snakeToCamel, row) as SongProps)
    );
  }
}
