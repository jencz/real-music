import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import { StringSupportOption } from "prettier";

export interface ArtistProps {
	id?: number;
	artistName: string;
	artistId: string;
	followers: number;
	artistPfpLink?: string;
}
import Song, { SongProps } from "./Song"
import { error } from "console";

export default class Artist {
	constructor(
		private sql: postgres.Sql<any>,
		public props: ArtistProps,
	) {}

	static async create(sql: postgres.Sql<any>, props: ArtistProps): Promise<Artist> {
		const connection = await sql.reserve()

		let artist = await sql`
			INSERT INTO artists
				${sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`

		await connection.release()

		return new Artist(sql, convertToCase(snakeToCamel, artist[0]) as ArtistProps)
	}

	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve()

		const [row] = await connection<ArtistProps[]>`
			SELECT * FROM artists
			WHERE id = ${id}
		`

		await connection.release()

		if (!row) {
			return null
		}

		return new Artist(sql, convertToCase(snakeToCamel, row) as ArtistProps)
	}

	static async readFromSpotifyArtistId(sql: postgres.Sql<any>, artistId: string) {
		const connection = await sql.reserve()

		const [row] = await connection<ArtistProps[]>`
			SELECT * FROM artists
			WHERE artist_id = ${artistId}
		`

		await connection.release()

		if (!row) {
			return null
		}

		return new Artist(sql, convertToCase(snakeToCamel, row) as ArtistProps)
	}
	
	async update(updateProps: Partial<ArtistProps>) {
		const connection = await this.sql.reserve();

		const [row] = await connection`
			UPDATE artists
			SET
				${this.sql(convertToCase(camelToSnake, updateProps))}, edited_at = ${createUTCDate()}
			WHERE
				id = ${this.props.id}
			RETURNING *
		`;

		await connection.release();

		this.props = { ...this.props, ...convertToCase(snakeToCamel, row)};
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
			(row) =>
				new Song(sql, convertToCase(snakeToCamel, row) as SongProps),
		);
	}

	async getAllArtistSongs(sql: postgres.Sql<any>, artist: string): Promise<Song[]> {
		const connection = await sql.reserve();

		const rows = await connection<SongProps[]>`
			SELECT *
			FROM artists_songs
			WHERE artist_id = ${this.props.id}
		`;

		await connection.release();

		return rows.map(
			(row) =>
				new Song(sql, convertToCase(snakeToCamel, row) as SongProps),
		);
	}
}
