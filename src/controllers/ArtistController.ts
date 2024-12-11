import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import SongController from "./SongController";
import Artist from "../models/Artist";

/**
 * Controller for handling Todo CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class ArtistController {
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
    router.get("/artist/:artistId", this.getArtistPage);
  }

  getArtistPage = async (req: Request, res: Response) => {
    let id = req.getId()
    let artist = await Artist.read(this.sql, id)

    

    let followersFormatted = artist?.props.followers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

    if (artist != null) {
      let songController = new SongController(this.sql)
      let songsList = await songController.getSongsFromSearch(req, res, artist?.props.artistName);

      return res.send({
      statusCode: StatusCode.OK,
      message: "",
      template: "ArtistView",
      payload: {
        artist: artist,
        formattedFollowers: followersFormatted,
        songs: songsList
      }
    })
    } 
  };
}
