import postgres from "postgres";
import { test, describe, expect, afterEach } from "vitest";
import { createUTCDate } from "../src/utils";
import Artist, { ArtistProps } from "../src/models/Artist";

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
		const tables = ["artists"];

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

	const createSong = async (props: Partial<ArtistProps> = {}) => {
		return await Artist.create(sql, {
			artistName: props.artistName || "Tester",
			artistId: "324A54DBN",
			followers: 43523,
			artistPfpLink: "https://pfp.jpeg"
		});
	};

	test("Artist was created.", async () => {
		const artist = await createSong({ artistName: "The Tester" });

		expect(artist.props.artistName).toBe("The Tester");
		expect(artist.props.followers).toBe(43523);
		expect(artist.props.artistId).toBeTruthy();
	});

	test("Duplicate artist was not created.", async () => {
		await createSong({ artistName: "The Tester" })

		await expect(async () => {
			await createSong({ artistName: "The Tester" })
		}).rejects.toThrow("This artist already exists.");
	});

	test("Artist was retrieved by its id.", async () => {
		let createdArtist = await createSong({ artistName: "The Tester" })
		
		if (createdArtist.props.id) {
			let artist = await Artist.read(sql, createdArtist.props.id)

			if (artist) {
				expect(artist.props.artistName).toBe("The Tester");
				expect(artist.props.followers).toBe(43523);
				expect(artist.props.artistId).toBeTruthy();
			}
		}
	});

	test("Artist was retrieved by its artist id.", async () => {
		let createdArtist = await createSong({ artistName: "The Tester" })
		
		if (createdArtist.props.id) {
			let artist = await Artist.readFromSpotifyArtistId(sql, createdArtist.props.artistId)

			if (artist) {
				expect(artist.props.artistName).toBe("The Tester");
				expect(artist.props.followers).toBe(43523);
				expect(artist.props.artistId).toBeTruthy();
			}
		}
	});
});