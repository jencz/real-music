import http, { IncomingMessage, ServerResponse } from "http";
import Request from "./router/Request";
import Response, { StatusCode } from "./router/Response";
import Router from "./router/Router";
import SongController from "./controllers/SongController";
import ArtistController from "./controllers/ArtistController"
import Controller from "./controllers/SongController";

import UserController from "./controllers/UserController"
import AuthController from "./controllers/AuthController";

import PlaylistController from "./controllers/PlaylistController";

import postgres from "postgres";
import fs from "fs/promises";
import SessionManager from "./auth/SessionManager";
import Cookie from "./auth/Cookie";
import { isLoggedIn, UserStatus, assignSession, DEFAULT_PROFILE_PICTURE, getUserProfilePicture } from "./utils";
import { log } from "console";
import Playlist, { PlaylistSongProps } from "./models/Playlist";
import { LikedSongProps } from "./models/Playlist";  // Add this import

/**
 * Options for creating a new Server instance.
 * @property host The hostname of the server.
 * @property port The port number of the server.
 * @property sql The postgres connection object.
 */
export interface ServerOptions {
  host: string;
  port: number;
  sql: postgres.Sql;
}

/**
 * A class that represents an HTTP server.
 * The server listens for incoming requests and routes them to the appropriate controller.
 */
export default class Server {
	private host: string;
	private port: number;
	private server: http.Server;
	private sql: postgres.Sql;
	private router: Router;
	private songController: SongController;
	private artistController: ArtistController

	private userController: UserController;
	private authController: AuthController;
  private playlist: PlaylistController;

	/**
	 * Initializes a new Server instance. The server is not started until the `start` method is called.
	 * @param serverOptions The options for creating a new Server instance.
	 */
	constructor(serverOptions: ServerOptions) {
		this.server = http.createServer();
		this.sql = serverOptions.sql;
		this.host = serverOptions.host;
		this.port = serverOptions.port;

		this.router = new Router();

		this.songController = new SongController(this.sql);
		this.artistController = new ArtistController(this.sql)

		this.songController.registerRoutes(this.router);
		this.artistController.registerRoutes(this.router)

		this.userController = new UserController(this.sql)
		this.authController = new AuthController(this.sql)
    this.playlist = new PlaylistController(this.sql);


		this.userController.registerRoutes(this.router);
		this.authController.registerRoutes(this.router);
    this.playlist.registerRoutes(this.router);
    this.router.post("/add-song-to-playlist", this.addSongToPlaylistHandler);
    this.router.post("/liked-songs", this.likeSongHandler);
    this.router.delete("/liked-songs", this.unlikeSongHandler);


		this.router.get("/", async (req: Request, res: Response) => {
			// Load homepage like regardless.

			const userId = await isLoggedIn(req, res)

			let profileLink = await getUserProfilePicture(this.sql, userId)

			res.send({
				statusCode: StatusCode.OK,
				message: "Homepage!",
				template: "HomeView",
				payload: {
					ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
					title: "My App",
				},
			});
		});


	}

	/**
	 * Every time a request is made to the server, this method is called.
	 * It routes the request to the appropriate controller and sends the response back to the client.
	 * @param req The request object.
	 * @param res The response object.
	 */
	handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
		console.log(`>>> ${req.method} ${req.url}`);

		if (req.url?.match(/.*\..*/)) {
			await this.serveStaticFile(req.url, res);
			return;
		}

		// Create a new Request and Response object for the current request using our custom classes.
		const request = new Request(req);
		const response = new Response(request, res);

		if (!req.method) {
			response.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid request method",
			});
			return;
		}

		if (!req.url) {
			response.send({
				statusCode: StatusCode.BadRequest,
				message: "Invalid request URL",
			});
			return;
		}

		// Parse the request body and extract the incoming data.
		// This is only done for POST and PUT requests because they
		// normally data in their body whereas GET and DELETE requests do not.
		if (req.method === "POST" || req.method === "PUT") {
			await request.parseBody();
		}

		// Find the appropriate handler for the current request.
		const handler = this.router.findMatchingHandler(
			request.getMethod(),
			req.url,
		);

		// If no handler is found, send a 404 Not Found response.
		if (!handler) {
			response.send({
				statusCode: StatusCode.NotFound,
				message: `Invalid route: ${req.method} ${req.url}`,
			});

			return;
		}

		// If a handler is found, call it with the request and response objects.
		try {
			await handler(request, response);
		} catch (error) {
			const message = `Error while handling request: ${error}`;
			console.error(message);
			response.send({
				statusCode: StatusCode.InternalServerError,
				message,
			});
		}
	};

	/**
	 * A static file is a file that the client requests for
	 * directly. This is anything with a valid file extension.
	 * Within the context of the web, this is usually .html,
	 * .css, .js, and any image/video/audio file types.
	 */
	serveStaticFile = async (url: string, res: ServerResponse) => {
		const filePath = `.${url}`;
		const file = await fs.readFile(filePath);

		res.end(file);
		return;
	};

	/**
	 * Starts the server and listens for incoming requests.
	 */
	start = async () => {
		this.server.on("request", this.handleRequest);
		await this.server.listen(this.port);
		console.log(`Server running at http://${this.host}:${this.port}/.`);
	};

	/**
	 * Stops the server and closes the database connection.
	 */
	stop = async () => {
		await this.sql.end();
		await this.server.close();
		console.log(`Server stopped.`);
	};

	getSessionManager = () => {
		return SessionManager.getInstance();
	};

  




  addSongToPlaylistHandler = async (req: Request, res: Response) => {
    const { playlistId, userId, trackId, songTitle, artistName } = req.body;

    try {
      const newPlaylistSong: PlaylistSongProps = {
        playlistId: parseInt(playlistId, 10),
        songId: parseInt(trackId, 10),
        songName: songTitle,
        artistName: artistName,
      };

      // Call the Playlist.addSongToPlaylist method to add the song to the playlist
      await Playlist.addSongToPlaylist(this.sql, newPlaylistSong);

      res.send({
        statusCode: StatusCode.Created,
        message: "Song added to playlist successfully",
      });
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      res.send({
        statusCode: StatusCode.InternalServerError,
        message: "Error adding song to playlist",
      });
    }
  };

  likeSongHandler = async (req: Request, res: Response) => {
    const { userId, trackId } = req.body;

    try {
      // Check if the user exists in the users table
      const [user] = await this.sql`SELECT id FROM users WHERE id = ${userId}`;
      if (!user) {
        res.send({ statusCode: 404, message: "User not found" });
        return;
      }

      // Check if the song already exists in the songs table
      const [song] = await this.sql`SELECT id FROM songs WHERE track_id = ${trackId}`;
      if (!song) {
        res.send({ statusCode: 404, message: "Song not found" });
        return;
      }

      const songId = song.id;

      // Insert the song into the liked_songs table
      await this.sql`
        INSERT INTO liked_songs (user_id, song_id)
        VALUES (${userId}, ${songId})`;

      res.send({ statusCode: 200, message: "Song liked successfully" });
    } catch (error) {
      console.error(`Error liking song: ${error}`);
      res.send({ statusCode: 500, message: "Internal Server Error" });
    }
  };

  unlikeSongHandler = async (req: Request, res: Response) => {
    const { userId, trackId } = req.body;

    try {
      // Check if the user exists in the users table
      const [user] = await this.sql`SELECT id FROM users WHERE id = ${userId}`;
      if (!user) {
        res.send({ statusCode: 404, message: "User not found" });
        return;
      }

      // Check if the song already exists in the songs table
      const [song] = await this.sql`SELECT id FROM songs WHERE track_id = ${trackId}`;
      if (!song) {
        res.send({ statusCode: 404, message: "Song not found" });
        return;
      }

      const songId = song.id;

      // Remove the song from the liked_songs table
      await this.sql`
        DELETE FROM liked_songs WHERE user_id = ${userId} AND song_id = ${songId}`;

      res.send({ statusCode: 200, message: "Song unliked successfully" });
    } catch (error) {
      console.error(`Error unliking song: ${error}`);
      res.send({ statusCode: 500, message: "Internal Server Error" });
    }
  };

}
