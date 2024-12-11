import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import Playlist, { PlaylistProps, LikedSongProps } from "../models/Playlist";
import { DEFAULT_PLAYLIST_PICTURE } from "../utils";
import {
  isLoggedIn,
  DEFAULT_PROFILE_PICTURE,
  getUserProfilePicture,
} from "../utils";
import { getPriority } from "os";
import User from "../models/User";

import Song from "../models/Song";

export default class PlaylistController {
    private sql: postgres.Sql<any>;

    constructor(sql: postgres.Sql<any>) {
        this.sql = sql;
    }

    registerRoutes(router: Router) {
        router.get("/library", this.getUserPlaylists);
        router.get("/playlists/:id", this.getSongsOffPlaylist)
        router.post("/playlists", this.createPlaylist);
        router.put("/playlists/:id", this.editPlaylistName);
        router.delete("/playlists/:id", this.deletePlaylist);
        router.post("/playlist/:id/song/:id", this.addSongToPlaylist);
        router.post("/likedsong/:id", this.addLikedSongToLikeTableOrSomething)
    }

    getUserPlaylists = async (req: Request, res: Response) => {
        const errorType = req.getSearchParams().get("error");

  constructor(sql: postgres.Sql<any>) {
    this.sql = sql;
  }

  registerRoutes(router: Router) {
    router.get("/library", this.getUserPlaylists);

    router.get("/playlists/:id", this.getSongsOffPlaylist);

    router.post("/playlists", this.createPlaylist);
    router.put("/playlists/:id", this.editPlaylistName);
    router.delete("/playlists/:playlistId", this.deletePlaylist);
    router.post("/add-song-to-playlist", this.addSongToPlaylist.bind(this));
    router.get("/song/view/:id", this.displaySongAndPlaylists);
  }

  getUserPlaylists = async (req: Request, res: Response) => {
    const errorType = req.getSearchParams().get("error");

    const userId = await isLoggedIn(req, res);

    const profileLink = await getUserProfilePicture(this.sql, userId);

    let userPlaylists;

    if (userId >= 0) {
      try {
        const user = await User.read(this.sql, userId);

        if (user) {
          userPlaylists = await user.getPlaylists();

          if (userPlaylists) {
            // Ride out the if statements, go to end of function.
          } else {
            return res.send({
              statusCode: StatusCode.OK,
              message: "You don't have",
              template: "LibraryView",
              payload: {
                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
              },
            });
          }
        } else {
          // Not logged in.

          return res.send({
            statusCode: StatusCode.Unauthorized,
            message: "",
            redirect: "/login?error=user_unauthorized",
          });
        }
      } catch {
        // Not logged in.

        return res.send({
          statusCode: StatusCode.Unauthorized,
          message: "",
          redirect: "/login?error=user_unauthorized",
        });
      }
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "",
        redirect: "/login?error=user_unauthorized",
      });
    }

    if (errorType === "missing_playlist_name") {
      return res.send({
        statusCode: StatusCode.OK,
        message: "Missing playlist name.",
        template: "LibraryView",
        payload: {
          ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
          playlists: userPlaylists,
          createErrorMsg: "You must give a playlist name.",
        },
      });
    } else if (errorType === "try_later") {
      return res.send({
        statusCode: StatusCode.OK,
        message: "Try again later",
        template: "LibraryView",
        payload: {
          ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
          playlists: userPlaylists,
          createErrorMsg: "Something went wrong, please try again later.",
        },
      });
    } else {
      // No error.
      return res.send({
        statusCode: StatusCode.OK,
        message: "Playlists and liked songs fetched successfully",
        template: "LibraryView",
        payload: {
          ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
          playlists: userPlaylists,
          PlaylistPicture: DEFAULT_PLAYLIST_PICTURE,
        },
      });
    }
  };
    getSongsOffPlaylist = async (req: Request, res: Response) => {
        const userId = await isLoggedIn(req, res);

        const profileLink = await getUserProfilePicture(this.sql, userId)

        const playlistId = req.getId()

        if (userId >= 0) {
            const playlist = await Playlist.read(this.sql, playlistId)

            if (playlist) {

                if (playlist.props.userId === userId) {
                    const songs = await playlist.readAllSongs()

                    let errorMessage = null

                    const errorType = req.getSearchParams().get("error");

                    if (errorType === "internal_server_error") {
                        errorMessage = "failed to update playlist"
                    }
                    else if (errorType === "no_name") {
                        errorMessage = "No name provided."
                    }

                    if (songs) {
                        return res.send({
                            statusCode: StatusCode.OK,
                            message: "Songs retrieved successfully.",
                            template: "PlaylistView",
                            payload: {
                                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
                                songs: songs,
                                theErrMsg: errorMessage,
                                playlistItself: playlist,
                            },
                        });
                    }
                    else {
                        return res.send({
                            statusCode: StatusCode.NoContent,
                            message: "You don't have any songs.",
                            template: "PlaylistView",
                            payload: {
                                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
                            },
                        });
                    }
                }
                else {
                    // Forbidden

                    return res.send({
                        statusCode: StatusCode.Forbidden,
                        message: "You don't have any songs.",
                        redirect: "/login?error=nacho_cheese",
                    });
                }
            }
            else {
                // Not logged in.

                return res.send({
                    statusCode: StatusCode.Unauthorized,
                    message: "",
                    redirect: "/login?error=user_unauthorized",
                });
            }

    const profileLink = await getUserProfilePicture(this.sql, userId);

    const playlistId = req.getId();

    if (userId >= 0) {
      const playlist = await Playlist.read(this.sql, playlistId);

      if (playlist) {
        if (playlist.props.userId === userId) {
          const songs = await playlist.readAllSongs();

          if (songs) {
            return res.send({
              statusCode: StatusCode.OK,
              message: "Songs retrieved successfully.",
              template: "PlaylistView",
              payload: {
                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
                songs: songs,
              },
            });
          } else {
            return res.send({
              statusCode: StatusCode.NoContent,
              message: "You don't have any songs.",
              template: "PlaylistView",
              payload: {
                ProfilePicLink: profileLink ?? DEFAULT_PROFILE_PICTURE,
              },
            });
          }
        } else {
          // Forbidden

          return res.send({
            statusCode: StatusCode.Forbidden,
            message: "You don't have any songs.",
            redirect: "/login?error=nacho_cheese",
          });
        }
      } else {
        // Not logged in.

        return res.send({
          statusCode: StatusCode.Unauthorized,
          message: "",
          redirect: "/login?error=user_unauthorized",
        });
      }
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "",
        redirect: "/login?error=user_unauthorized",
      });
    }
  };

  createPlaylist = async (req: Request, res: Response) => {
    const userId: number = isLoggedIn(req, res);

    const playlistName = req.body.playlistName;

    if (playlistName) {
      if (userId >= 0) {
        const playlistProperties: PlaylistProps = {
          playlistName: playlistName,
          userId: userId,
        };

        const playlistFr: Playlist = await Playlist.create(
          this.sql,
          playlistProperties
        );

        if (playlistFr) {
          return res.send({
            statusCode: StatusCode.Redirect,
            message: "Playlist created successfully.",
            redirect: "/library",
          });
        } else {
          return res.send({
            statusCode: StatusCode.InternalServerError,
            message: "Playlist uncreated.",
            redirect: "/library?error=try_later",
          });
        }
      } else {
        return res.send({
          statusCode: StatusCode.Unauthorized,
          message: "Missing playlist name.",
          redirect: "/login?error=user_unauthorized",
        });
      }
    } else {
      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "Missing playlist name.",
        redirect: "/library?error=missing_playlist_name",
      });

    editPlaylistName = async (req: Request, res: Response) => {
        const userId: number = isLoggedIn(req, res);

        const playlistId = req.getId()

        const playlistName = req.body.playlistName

        if (playlistName) {
            if (userId >= 0) {
                const playlist = await Playlist.read(this.sql, playlistId)

                if (playlist.props.userId === userId) {
                    // User validated
                    let updateProps: Partial<PlaylistProps> = {
                        playlistName: playlistName
                    }

                    try {
                        await playlist.update(updateProps);
                    }
                    catch {
                        return res.send({
                            statusCode: StatusCode.InternalServerError,
                            message: "Playlist failed to update.",
                            redirect: "/playlists/" + playlist.props.id + "?error=internal_server_error ",
                        });
                    }
                    return res.send({
                        statusCode: StatusCode.Redirect,
                        message: "Playlist Updated successfully.",
                        redirect: "/playlists/" + playlist.props.id,
                    });
                }
                else {
                    return res.send({
                        statusCode: StatusCode.Forbidden,
                        message: "Not your playlist buckos.",
                        redirect: "/login?error=nacho_cheese",
                    })

                }
            }
            else {
                return res.send({
                    statusCode: StatusCode.Unauthorized,
                    message: "Playlist failed to update.",
                    redirect: "/login?error=user_unauthorized",
                });
            }
        }
        else {
            return res.send({
                statusCode: StatusCode.InternalServerError,
                message: "Playlist failed to update.",
                redirect: "/playlists/" + playlistId + "?error=no_name ",
            });
        }
    }
  };
  displaySongAndPlaylists = async (req: Request, res: Response) => {
    const userId: number = isLoggedIn(req, res);
    let songId = req.getId2()

    let song = await Song.read(this.sql, songId)

    if (userId >= 0) {
      let playlists = await Playlist.readUserPlaylists(this.sql, userId);

      res.send({
        statusCode: StatusCode.OK,
        message: "",
        template: "AddToPlaylistView",
        payload: {
            song: song,
            playlists: playlists
        },
      });
    deletePlaylist = async (req: Request, res: Response) => {
        const userId: number = isLoggedIn(req, res);

        const playlistId = req.getId()

        if (userId >= 0) {
            const playlist = await Playlist.read(this.sql, playlistId)

            if (playlist.props.userId === userId) {

                try {
                    await playlist.delete();
                }
                catch {
                    return res.send({
                        statusCode: StatusCode.InternalServerError,
                        message: "Playlist failed to delete.",
                        redirect: "/playlists/" + playlist.props.id + "?error=internal_server_error ",
                    });
                }
                return res.send({
                    statusCode: StatusCode.Redirect,
                    message: "Playlist deleted successfully.",
                    redirect: "/library",
                });

            }
            else {
                return res.send({
                    statusCode: StatusCode.Forbidden,
                    message: "Not your playlist bucko.",
                    redirect: "/login?error=nacho_cheese",
                })

            }

        }
        else {
            return res.send({
                statusCode: StatusCode.Unauthorized,
                message: "Login to do this.",
                redirect: "/login?error=user_unauthorized",
            });
        }
    }

    addSongToPlaylist = async (req: Request, res: Response) => {
        const userId: number = isLoggedIn(req, res);

        if (userId >= 0) {

            const ids: number[] | null = req.getIds()

            let playlistId = -1
            let songId = -1

            if (ids && ids[0] && ids[1]) {
                playlistId = ids[0]
                songId = ids[1]
            }

            if (playlistId >= 0) {
                let playlist
                try {
                    playlist = await Playlist.read(this.sql, playlistId)
                } catch {
                    // Failed to get playlist
                    return res.send({
                        statusCode: StatusCode.InternalServerError,
                        message: "Failed to get playlist.",
                        redirect: "/playlists/" + playlistId + "?error=internal_server_error ",
                    });
                }
                if (playlist) {
                    if (playlist.props.userId === userId) {

                        if (songId >= 0) {
                            let song
                            try {
                                song = await Song.read(this.sql, songId)
                            }
                            catch {
                                return res.send({
                                    statusCode: StatusCode.InternalServerError,
                                    message: "Song failed to get.",
                                    redirect: "/playlists/" + playlist.props.id + "?error=internal_server_error ",
                                });
                            }

                            if (song && song.props.id) {
                                try {
                                    await playlist.addSongToPlaylist(song.props.id)
                                }
                                catch {
                                    return res.send({
                                        statusCode: StatusCode.Redirect,
                                        message: "It wasn't added.",
                                    });
                                }
                                    return res.send({
                                    statusCode: StatusCode.Redirect,
                                    message: "It was added.",
                                });
                            }
                        }
                        else {
                            // No song id or something
                            return res.send({
                                statusCode: StatusCode.BadRequest,
                                message: "Not your playlist bucko.",
                                redirect: "/login?error=nacho_cheese",
                            })
                        }
                    }
                    else {
                        // User doesn't own playlist
                        return res.send({
                            statusCode: StatusCode.Forbidden,
                            message: "Not your playlist bucko.",
                            redirect: "/login?error=nacho_cheese",
                        })

                    }
                }
                else {
                    // Playlist doesn't exist
                    return res.send({
                        statusCode: StatusCode.NoContent,
                        message: "Login to do this.",
                        redirect: "/library",
                    });
                }

            }
            else {
                // No playlist id or something
                return res.send({
                    statusCode: StatusCode.BadRequest,
                    message: "Login to do this.",
                    redirect: "/library",
                });
            }
        }
        else {
            return res.send({
                statusCode: StatusCode.Unauthorized,
                message: "Login to do this.",
                redirect: "/login?error=user_unauthorized",
            });
        }
    }

    addLikedSongToLikeTableOrSomething = async (req: Request, res: Response) => {
    }
  };
}
