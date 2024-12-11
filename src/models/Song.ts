import postgres from "postgres";
import {
	camelToSnake,
	convertToCase,
	createUTCDate,
	snakeToCamel,
} from "../utils";
import { error } from "console";
// import { aR } from "vitest/dist/reporters-P7C2ytIv.js";

export interface SongProps {
	id?: number;
	trackId: string;
	songTitle: string;
	artistName: string;
	artistId: number;
	albumName: string;
	albumId: string;
	durationMs: number;
	artworkUrl: string;
	previewUrl: string;
}

export default class Song {
	constructor(
		private sql: postgres.Sql<any>,
		public props: SongProps,
	) {}

	static async create(sql: postgres.Sql<any>, props: SongProps): Promise<Song> {
		const connection = await sql.reserve()

		// let checkSong = await sql`
		// 	SELECT * FROM songs
		// 	WHERE track_id = ${props.trackId}
		// `

		// if (checkSong.length > 0) {
		// 	throw new Error
		// }

		let song = await sql`
			INSERT INTO songs
				${sql(convertToCase(camelToSnake, props))}
			RETURNING *
		`

		await connection.release()

		return new Song(sql, convertToCase(snakeToCamel, song[0]) as SongProps)
	}

	static async read(sql: postgres.Sql<any>, id: number) {
		const connection = await sql.reserve()

		const [row] = await connection<SongProps[]>`
			SELECT * FROM songs
			WHERE id = ${id}
		`

		await connection.release()

		if (!row) {
			return null
		}

		return new Song(sql, convertToCase(snakeToCamel, row) as SongProps)
	}

	static async readByTrackId(sql: postgres.Sql<any>, trackId: string) {
		const connection = await sql.reserve()

		const [row] = await connection<SongProps[]>`
			SELECT * FROM songs
			WHERE track_id = ${trackId}
		`

		await connection.release()

		if (!row) {
			return null
		}

		return new Song(sql, convertToCase(snakeToCamel, row) as SongProps)
	}

	static async readAllByArtist(sql: postgres.Sql<any>, artist: string): Promise<Song[]> {
		const connection = await sql.reserve()

		const rows = await connection<SongProps[]>`
			SELECT * FROM songs
			WHERE artist = ${artist}
		`

		await connection.release()

		return rows.map((row) =>
			new Song(sql, convertToCase(snakeToCamel, row) as SongProps)
		)
	}

	static async readAllByTitle(sql: postgres.Sql<any>, title: string): Promise<Song[]> {
		const connection = await sql.reserve()

		const rows = await connection<SongProps[]>`
			SELECT * FROM songs
			WHERE song_title LIKE '%${title}%'
		`

		await connection.release()

		return rows.map((row) =>
			new Song(sql, convertToCase(snakeToCamel, row) as SongProps)
		)
	}
}