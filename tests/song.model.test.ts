import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import { createUTCDate } from "../src/utils";
import Song, { SongProps } from "../src/models/Song";

describe("User CRUD operations", () => {
	// Set up the connection to the DB.
	const sql = postgres({
		database: "RealDB",
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the todos and subtodos tables and resets the sequence for each table.
	 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
	 */
	afterEach(async () => {
		const tables = ["songs"];

		try {
			for (const table of tables) {
				await sql.unsafe(`DELETE FROM ${table}`);
				await sql.unsafe(
					`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`,
				);
			}
		} catch (error) {
			console.error(error);
		}
	});

	const createSong = async (props: Partial<SongProps> = {}) => {
		return await Song.create(sql, {
			trackId: props.trackId || "12A34B",
			songTitle: props.songTitle || "Test",
			artistName: props.artistName || "The Tester",
			artistId: props.artistId || 1,
			albumName: props.albumName || "Testing",
			albumId: props.albumId || "13B46A",
			durationMs: props.durationMs || 3400,
			artworkUrl: props.artworkUrl || "https://testing.jpeg",
			previewUrl: props.previewUrl || "https://test.mp3"
		});
	};

	test("Song was created.", async () => {
		const song = await createSong({ songTitle: "Actually Testing" });

		expect(song.props.songTitle).toBe("Actually Testing");
		expect(song.props.artistName).toBe("The Tester");
		expect(song.props.durationMs).toBeTruthy();
	});

	test("Duplicate song was not created.", async () => {
		await createSong({ songTitle: "Actually Testing" })

		await expect(async () => {
			await createSong({ songTitle: "Actually Testing" })
		}).rejects.toThrow("This song already exists.");
	});

	test("Song was retrieved by its id.", async () => {
		let createdSong = await createSong({ songTitle: "Actually Testing" })
		
		if (createdSong.props.id) {
			let song = await Song.read(sql, createdSong.props.id)

			if (song) {
				expect(song.props.songTitle).toBe("Actually Testing");
				expect(song.props.artistName).toBe("The Tester");
				expect(song.props.durationMs).toBeTruthy();
			}
		}
	});

	test("Song was retrieved by its track id.", async () => {
		let createdSong = await createSong({ songTitle: "Actually Testing" })
		
		if (createdSong.props.id) {
			let song = await Song.readByTrackId(sql, createdSong.props.trackId)

			if (song) {
				expect(song.props.songTitle).toBe("Actually Testing");
				expect(song.props.artistName).toBe("The Tester");
				expect(song.props.durationMs).toBeTruthy();
			}
		}
	});
});