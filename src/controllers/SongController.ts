import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import Song from "../models/Song";
import Artist from "../models/Artist";
import API from "../models/API";
import { SongProps } from "../models/Song";
import { ArtistProps } from "../models/Artist";
import { isLoggedIn, DEFAULT_PROFILE_PICTURE, getUserProfilePicture } from "../utils";
import User from "../models/User";
import Playlist, {
  PlaylistSongProps,
  LikedSongProps,
} from "../models/Playlist";
import PlaylistController from "./PlaylistController";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class SongController {
  private sql: postgres.Sql<any>;

  constructor(sql: postgres.Sql<any>) {
    this.sql = sql;
  }

  /**
   * To register a route, call the corresponding method on
   * the router instance based on the HTTP method of the route.
   *
   * @param router Router instance to register routes on.
   *
   * @example router.get("/todos", this.getTodoList);
   */
  registerRoutes(router: Router) {
    // Any routes that include a `:id` parameter should be registered last.
    router.get("/search", this.getSearchPage);
    router.post("/search", this.validateSearch);

    router.post("/liked-song", this.likeSong);
  }

  getResultsPage = async (req: Request, res: Response) => {
    // Is user logged in.
    const userId = isLoggedIn(req, res);

    const profileLink = await getUserProfilePicture(this.sql, userId)

    if (userId >= 0) {
      // Is logged in

      let params = req.getSearchParams();

      if (params.has("songs")) {
        let songsList = params.get("songs");

        return res.send({
          statusCode: StatusCode.OK,
          message: "",
          template: "results",
          payload: {
            ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
            songs: songsList,
          },
        });
      }
      // let songTitle = params.get("title");
      // let artist = params.get("artist");
      // return res.send({
      //   statusCode: StatusCode.OK,
      //   message: "",
      //   template: "results",
      //   payload: {
      //     title: songTitle,
      //     artist: artist,
      //   },
      // });
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "",
        redirect: "/login?error=user_unauthorized",
      });
    }
  };

  getSearchPage = async (req: Request, res: Response) => {
    // Is user logged in.
    const userId = isLoggedIn(req, res);

    const profileLink = await getUserProfilePicture(this.sql, userId)

    if (userId >= 0) {
      let params = req.getSearchParams();

      if (params.has("error")) {
        if (params.get("error") === "no_input") {
          return res.send({
            statusCode: StatusCode.OK,
            message: "",
            template: "SearchView",
            payload: {
              ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
              error: "ERROR. NO INPUT IN SEARCH BAR.",
            },
          });
        }
      }

      if (params.has("query")) {
        let userInput = params.get("query");

        if (userInput) {
          let songsList = await this.getSongsFromSearch(req, res, userInput);
          let playlists = await Playlist.readUserPlaylists(this.sql, userId)

          const theUser: User | null = await User.read(this.sql, userId);

          if (theUser) {
            return res.send({
              statusCode: StatusCode.OK,
              message: "",
              template: "SearchView",
              payload: {
                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
                songs: songsList,
                playlists: playlists
              },
            });
          }
        }
      }
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "",
        redirect: "/login?error=user_unauthorized",
      });

    }
    return res.send({
      statusCode: StatusCode.OK,
      message: "",
      template: "SearchView",
      payload: {
        ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
      }
    });
  };

  validateSearch = async (req: Request, res: Response) => {
    let userInput: string = req.body.searchResult;

    if (userInput) {
      return res.send({
        statusCode: StatusCode.Redirect,
        message: "",
        redirect: `/search?query=${userInput}`,
      });
    } else {
      return res.send({
        statusCode: StatusCode.NoContent,
        message: "No input in search bar.",
        redirect: "/search?error=no_input",
      });
    }
  };

  getSongsFromSearch = async (
    req: Request,
    res: Response,
    userInput: string
  ) => {
    let trackIds: string[] = await this.getTrackIds(userInput);
    let songs: Song[] = [];

    const fetchPromises = trackIds.map(async (trackId) => {
      let track: Song | null = await Song.readByTrackId(this.sql, trackId);

      if (track === null) {
        const accessToken = await API.getAccessToken();
        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${trackId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = await response.json();

        let artist = await Artist.readFromSpotifyArtistId(
          this.sql,
          data.artists[0].id
        );

        if (artist === null) {
          let artistProps = await this.getArtistInfo(data.artists[0].id);
          await Artist.create(this.sql, artistProps);
          artist = await Artist.readFromSpotifyArtistId(
            this.sql,
            artistProps.artistId
          );
        }

        if (artist) {
          const props: SongProps = {
            trackId: trackId,
            songTitle: data.name,
            artistName: artist.props.artistName,
            artistId: artist.props.id!,
            albumName: data.album.name,
            albumId: data.album.id,
            durationMs: data.duration_ms,
            artworkUrl: data.album.images[0].url,
            previewUrl: data.preview_url,
          };

          let song = await Song.create(this.sql, props);

          if (song.props.id) {
            track = await Song.read(this.sql, song.props.id);
          }
        }

        if (track !== null) {
          songs.push(track);
        }
      }
    });

    await Promise.all(fetchPromises);

    return songs;
  };

  getTrackIds = async (input: string) => {
    let trackIds: string[] = [];

    const accessToken = await API.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${input}&type=track`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    for (let i = 0; i < data.tracks.items.length; i++) {
      trackIds.push(data.tracks.items[i].id);
    }

    return trackIds;
  };

  getArtistInfo = async (artistId: string) => {
    const accessToken = await API.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    const props: ArtistProps = {
      artistName: data.name,
      artistId: artistId,
      followers: data.followers.total,
      artistPfpLink: data.images[0].url,
    };

    return props;
  };
  likeSong = async (req: Request, res: Response) => {
    const { userId, trackId } = req.body;

    if (!userId || !trackId) {
      return res.send({
        statusCode: StatusCode.BadRequest,
        message: "User ID and Track ID are required",
      });
    }

    try {
      // Check if the song is already liked by the user
      const likedSong = await this.sql`
            SELECT * FROM liked_songs
            WHERE user_id = ${userId} AND track_id = ${trackId}
        `;

      if (likedSong.length > 0) {
        // Song is already liked, so delete it from liked songs
        await this.sql`
                DELETE FROM liked_songs
                WHERE user_id = ${userId} AND track_id = ${trackId}
            `;
        return res.send({
          statusCode: StatusCode.OK,
          message: "Song removed from liked songs",
        });
      } else {
        // Song is not liked yet, so add it to liked songs
        await this.sql`
                INSERT INTO liked_songs (user_id, track_id)
                VALUES (${userId}, ${trackId})
            `;
        return res.send({
          statusCode: StatusCode.Created,
          message: "Song added to liked songs",
        });
      }
    } catch (error) {
      console.error("Error liking song:", error);
      return res.send({
        statusCode: StatusCode.InternalServerError,
        message: "Error liking song",
      });
    }
  };
}
