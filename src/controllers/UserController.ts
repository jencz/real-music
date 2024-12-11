import User, { UserProps } from "../models/User";
import postgres from "postgres";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import Router from "../router/Router";
import Cookie from "./../auth/Cookie";
import {
  createUTCDate,
  convertToCase,
  snakeToCamel,
  camelToSnake,
  isLoggedIn,
  UserStatus,
  DEFAULT_PROFILE_PICTURE,
} from "../utils";
import SessionManager from "./../auth/SessionManager";
import Session from "../auth/Session";
import Song from "../models/Song";

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

/**
 * Controller for handling User CRUD operations.
 * Routes are registered in the `registerRoutes` method.
 * Each method should be called when a request is made to the corresponding route.
 */
export default class UserController {
  private sql: postgres.Sql<any>;

  constructor(sql: postgres.Sql<any>) {
    this.sql = sql;
  }

  registerRoutes(router: Router) {
    router.get("/profile", this.getProfilePage);
    router.post("/users", this.createUser);

    router.get("/profile/:id/edit", this.getEditProfileForm);
    router.get("/profile/:id", this.getUserProfilePage);

    router.put("/profile/:id", this.updateProfileData);

    // Any routes that include an `:id` parameter should be registered last.
  }

  /**
   * TODO: Upon form submission, this controller method should
   * validate that no fields are blank/missing, that the passwords
   * match, and that there isn't already a user with the given email.
   * If there are any errors, redirect back to the registration form
   * with an error message.
   * @param req
   * @param res
   */
  createUser = async (req: Request, res: Response) => {
    // Post : /Register

    // Good Case: Login page
    // Error Case: Back to login page

    const email: string = req.body.email;
    const password: string = req.body.password;
    const confirmPassword: string = req.body.confirmPassword;

    if (email && password && confirmPassword) {
      // All fields truthy
      if (password == confirmPassword) {
        // Password and ConfirmPassword match
        let theUser: User | null = null;

        let userProps: UserProps = {
          email: req.body.email,
          userPassword: req.body.password,
          createdAt: createUTCDate(),
        };

        try {
          theUser = await User.create(this.sql, userProps);
        } catch (error) {
          // Email already exists
          await res.send({
            statusCode: StatusCode.BadRequest,
            redirect: `/register?error=email_duplicate`,
            message: "Email is already registered to an account.",
          });

          return;
        }

        if (theUser) {
          await res.send({
            statusCode: StatusCode.Created,
            redirect: "/login",
            message: "User Authenticated",
            payload: {
              user: theUser.props,
            },
          });
        }
      } else {
        await res.send({
          statusCode: StatusCode.BadRequest,
          redirect: `/register?error=password_mismatch`,
          message: "Passwords do not match.",
        });
      }
    } else {
      // Field(s) missing.

      let errorMessage: string = "Missing Fields";

      if (!email) {
        errorMessage = "Please enter an email.";
      } else if (!password) {
        errorMessage = "Please enter a password";
      } else if (!confirmPassword) {
        errorMessage = "Please confirm your password";
      }

      await res.send({
        statusCode: StatusCode.BadRequest,
        redirect: `/register?error=missing_fields`,
        message: errorMessage,
      });
    }
  };

  getProfilePage = async (req: Request, res: Response) => {
    // Source : Login Form
    // Get : /profile
    // Good Case: ProfilePage
    // Bad Case: redirect /login?error=message

    // See if user is logged in, logged out, or doesn't have a cookie.
    const userId: number = isLoggedIn(req, res);

    if (userId >= 0) {
      // User is logged in.

      let theUser: User | null = null;
      try {
        // Get user object.
        theUser = await User.read(this.sql, userId);
      } catch {
        await res.send({
          statusCode: StatusCode.InternalServerError,
          message: "Internal Server Error",
          redirect: "/login?error=Invalid_Credentials",
        });
      }

      if (theUser) {
        await res.send({
          statusCode: StatusCode.Redirect,
          message: "Found User",
          redirect: "/profile/" + theUser.props.id,
        });
      } else {
        await res.send({
          statusCode: StatusCode.InternalServerError,
          message: "User not found",
          redirect: "/login?error=Invalid_Credentials",
        });
      }
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "Must Login to access.",
        redirect: "/login",
      });
    }
  };

  getUserProfilePage = async (req: Request, res: Response) => {
    const userId = req.getId();

    const cookieUserId = isLoggedIn(req, res);

    if (cookieUserId >= 0) {
      if (cookieUserId === userId) {
        // User authentic
        // Get them that profile page.

        let theUser: User | null = null;
        try {
          theUser = await User.read(this.sql, userId);
        } catch {
          return await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "Didn't find User",
            redirect: "/login?error=user_not_found",
          });
        }

        if (theUser) {
          // Get user playlists

          // Get playlist count
          // const playlistCount: number = await theUser.getPlaylistCount(this.sql)

          // Get user liked songs

          const songs: Song[] = await theUser.getFavoriteSongs()

          // Get favorite artists

          // UserProps
          // DisplayName
          // ProfilePicLink
          // playlistCount
          // favoriteArtists: [ {name: "drake1"}, {name: "drake2"}, {name: "drake4"}, {name: "Katy Perry"} ]
          return await res.send({
            statusCode: StatusCode.OK,
            message: "Found User",
            template: "ProfileView",
            payload: {
              UserProps: theUser.props,
              DisplayName:
                theUser.props.userName ?? theUser.props.email.split("@")[0],
              ProfilePicLink:
                theUser.props.userPfpLink ?? DEFAULT_PROFILE_PICTURE,
              PlayLists: null,
              FavoriteArtists: null,
              playlistCount: "0 for now cuz it's broken.",
              favoriteSongs: songs,
            },
          });
        } else {
          await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "Didn't find User",
            redirect: "/login?error=user_unauthorized",
          });
        }
      } else {
        // User forbidden
        return res.send({
          statusCode: StatusCode.Forbidden,
          message: "Must Login to access.",
          redirect: "/login?error=nacho_cheese",
        });
      }
    } else {
      // Not logged in.

      return res.send({
        statusCode: StatusCode.Unauthorized,
        message: "Must Login to access.",
        redirect: "/login?error=user_unauthorized",
      });
    }
  };

  getEditProfileForm = async (req: Request, res: Response) => {
    const cookieUserId: number = isLoggedIn(req, res);
    if (cookieUserId >= 0) {
      // User is logged in.

      const userId = req.getId();
      let theUser: User | null = null;

      // Verify that user in session is the same as id passed.

      if (cookieUserId === userId) {
        // User is authentic.
        try {
          theUser = await User.read(this.sql, userId);
        } catch {
          return await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "Didn't find User",
            redirect: "/login?error=user_not_found",
          });
        }

        // User found
        if (theUser) {
          await res.send({
            statusCode: StatusCode.OK,
            message: "Found User",
            template: "EditProfileForm",
            payload: {
              UserProps: theUser.props,
              userId: theUser.props.id,
              DisplayName:
                theUser.props.userName ?? theUser.props.email.split("@")[0],
              ProfilePicLink:
                theUser.props.userPfpLink ?? DEFAULT_PROFILE_PICTURE,
              PlayLists: null,
              FavoriteArtists: null,
              playlistCount: "0 for now cuz it's broken.",
            },
          });
        } else {
          await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "Didn't find User",
            redirect: "/login?error=user_not_found",
          });
        }
      } else {
        // User id's don't match.
        // Forbidden
        await res.send({
          statusCode: StatusCode.Forbidden,
          message: "Found User",
          template: "ErrorView",
          payload: {
            error: "Hey, Stop Trying to mess with other Users!",
          },
        });
      }
    } else if (cookieUserId === -1) {
      // Not logged in but there is a session.
      await res.send({
        statusCode: StatusCode.Unauthorized,
        redirect: "/login?error=user_unauthorized",
        message: "Cookie Set.",
      });
    } else if (cookieUserId === -3) {
      // Redirect Home, where cookie will be set, hopefully.
      await res.send({
        statusCode: StatusCode.Unauthorized,
        redirect: "/login",
        message: "No Session Cookie.",
      });
    }
  };

  updateProfileData = async (req: Request, res: Response) => {
    const updateId = req.getId();

    const cookieUserId = isLoggedIn(req, res);

    if (cookieUserId >= 0) {
      // User is logged in
      if (cookieUserId === updateId) {
        // User is who they are trying to update.
        let user: User | null = null;
        try {
          user = await User.read(this.sql, cookieUserId);
        } catch {
          return await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "User not found.",
            redirect: "/login?error=user_not_found",
          });
        }

        if (user) {
          // User found, update user props.
          // Get form info
          const imageLink: string = req.body.imageLink;
          const username: string = req.body.username;
          const email: string = req.body.email;
          const password: string = req.body.password;

          const userUpdateProps: Partial<UserProps> = {};

          if(imageLink)
          userUpdateProps.userPfpLink = imageLink
          if(username)
          userUpdateProps.userName = username
          if(email)
          userUpdateProps.email = email
          if(password)
          userUpdateProps.userPassword = password

          try{
            await user.update(userUpdateProps)
          }
          catch{
            return await res.send({
              statusCode: StatusCode.InternalServerError,
              message: "User failed to update.",
              redirect: "/login?error=user_not_updated",
            });
          }

          return await res.send({
            statusCode: StatusCode.Created,
            message: "User updated successfully.",
            redirect: "/profile/" + user.props.id,
          });

        } else {
          return await res.send({
            statusCode: StatusCode.InternalServerError,
            message: "User not found.",
            redirect: "/login?error=user_not_found",
          });
        }
      } else {
        // User is trying to update another user.
        // Forbidden

        return await res.send({
          statusCode: StatusCode.Forbidden,
          message: "Found User",
          template: "ErrorView",
          payload: {
            error: "Hey, Stop Trying to mess with other Users!",
          },
        });
      }
    } else {
      // User is missing the cookie
      // Redirect

      return await res.send({
        statusCode: StatusCode.Unauthorized,
        message: "No session cookie.",
        redirect: "/login?error=user_unauthorized",
      });
    }
  };
}
