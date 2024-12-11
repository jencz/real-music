import postgres from "postgres";
import Router from "../router/Router";
import Request from "../router/Request";
import Response, { StatusCode } from "../router/Response";
import SessionManager from "./../auth/SessionManager";
import Session from "./../auth/Session";
import Cookie from "./../auth/Cookie";
import { isLoggedIn, UserStatus, DEFAULT_PROFILE_PICTURE } from "./../utils";
import User, { UserProps, InvalidCredentialsError } from "./../models/User";
import { profile } from "console";

export default class AuthController {
  private sql: postgres.Sql<any>;

  constructor(sql: postgres.Sql<any>) {
    this.sql = sql;
  }

  registerRoutes(router: Router) {
    router.get("/register", this.getRegistrationForm);
    router.get("/login", this.getLoginForm);
    router.post("/login", this.login);
    router.post("/logout", this.logout);
  }

  /**
   * TODO: Render the registration form.
   */
  getRegistrationForm = async (req: Request, res: Response) => {
    // Get : /register
    // Good Case: render Registration Form (errors)
    // Bad Case: No redirects

    let errorType = req.getSearchParams().get("error");

    if (errorType == "missing_fields") {
      await res.send({
        statusCode: StatusCode.OK,
        message: "Got Registration Form",
        template: "RegisterFormView",
        payload: {
          ProfilePicLink: DEFAULT_PROFILE_PICTURE,
          errorBool: true,
          errorMsg: "Not all fields were filled in.",
        },
      });
    } else if (errorType == "password_mismatch") {
      await res.send({
        statusCode: StatusCode.OK,
        message: "Got Registration Form",
        template: "RegisterFormView",
        payload: {
          ProfilePicLink: DEFAULT_PROFILE_PICTURE,
          errorBool: true,
          errorMsg: "Passwords do not match.",
        },
      });
    } else if (errorType == "email_duplicate") {
      await res.send({
        statusCode: StatusCode.OK,
        message: "Got Registration Form",
        template: "RegisterFormView",
        payload: {
          ProfilePicLink: DEFAULT_PROFILE_PICTURE,
          errorBool: true,
          errorMsg: "Email is already registered.",
        },
      });
    } else {
      await res.send({
        statusCode: StatusCode.OK,
        message: "Got Registration Form",
        template: "RegisterFormView",
        payload: {
          ProfilePicLink: DEFAULT_PROFILE_PICTURE,
          errorBool: false,
          errorMsg: "No error",
        },
      });
    }
  };

  /**
   * TODO: Render the login form.
   */
  getLoginForm = async (req: Request, res: Response) => {
    // Get : /login
    // Good Case: render Login Form (errors)
    // Bad Case: No redirects

    const errorType = req.getSearchParams().get("error");

    let errorOccurred: boolean = false;
    let errorMessage: string | null = null;
    let authenticatedBool: boolean = false;
    let profilePicLink: string | null = DEFAULT_PROFILE_PICTURE;
    let user: User | null = null;

    if (errorType === "user_already_logged_in") {
      // Already logged in error?.
      errorOccurred = true;
      errorMessage = "You're Already Logged in";
    } else if (errorType === "user_unauthorized") {
      // Invalid Credentials.
      errorOccurred = true;
      errorMessage = "You must be logged in to access this page";
    } else if (errorType === "user_not_found") {
      // Invalid Credentials.
      errorOccurred = true;
      errorMessage = "Internal server database bad error errors :(";
    } else if (errorType === "user_not_updated") {
      errorOccurred = true;
      errorMessage = "Server failed to update info on user.";
    } else if (errorType === "session_expired") {
      errorOccurred = true;
      errorMessage = "No session was found with you're cookie.";
    } else if (errorType === "invalid_credentials") {
      // Invalid Credentials.
      errorOccurred = true;
      errorMessage = "Invalid Credentials";
    } else if (errorType === "Missing_Fields") {
      // Missing Fields.
      errorOccurred = true;
      errorMessage = "Missing Fields";
    } else if (errorType === "missing_email_field") {
      // Missing Fields.
      errorOccurred = true;
      errorMessage = "Missing email";
    } else if (errorType === "missing_password_field") {
      // Missing Fields.
      errorOccurred = true;
      errorMessage = "Missing password";
    } else if (errorType === "nacho_cheese") {
      // Missing Fields.
      errorOccurred = true;
      errorMessage = "That's not yours buddy...";
    } else if (errorType === "session_error") {
      // Missing Fields.
      errorOccurred = true;
      errorMessage = "Session not found.";
    } else {
      // Return the login form with no error messages.
      errorOccurred = false;
      errorMessage = null;
    }

    let rememberedEmail: string | null = null;
    const emailCookie = req.findCookie("email") ?? null;
    if (emailCookie) {
      rememberedEmail = emailCookie.value;
    } else {
      rememberedEmail = "";
    }

    // Already logged in error?.
    await res.send({
      statusCode: StatusCode.OK,
      message: "Got Login Form",
      template: "LoginFormView",
      payload: {
        ProfilePicLink: DEFAULT_PROFILE_PICTURE,
        errorBool: errorOccurred,
        errorMsg: errorMessage,
        email: rememberedEmail,
      },
    });
  };

  /**
   * TODO: Handle login form submission.
   */
  login = async (req: Request, res: Response) => {
    // Post : /login
    // Good Case: render ProfilePage Form (errors)
    // Bad Case: get : /login?errors=ErrorType

    if (!req.body.email) {
      return res.send({
        statusCode: StatusCode.BadRequest,
        message: "Email field is missing.",
        redirect: "/login?error=missing_email_field",
      });
    }

    if (!req.body.password) {
      return res.send({
        statusCode: StatusCode.BadRequest,
        message: "Password field is missing.",
        redirect: "/login?error=missing_password_field",
      });
    }

    let user;
    try {
      user = await User.login(this.sql, req.body.email, req.body.password);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return res.send({
          statusCode: StatusCode.Unauthorized,
          message: "Login was unsuccessful. Invalid credentials.",
          redirect: "/login?error=invalid_credentials",
        });
      }
    }

    if (user) {
      const sessionCookie = req.findCookie("session_id");

      let sessionManager = SessionManager.getInstance();
      let session: Session | undefined = sessionManager.createSession();

      if (sessionCookie) {
        sessionManager = SessionManager.getInstance();
        session = sessionManager.get(sessionCookie.value);
      } else {
        sessionManager = SessionManager.getInstance();
        session = sessionManager.createSession();
      }

      if (session) {
        if (!session.data["userId"]) {
          session.set("userId", user.props.id);

          if (req.body.remember) {
            session.set("email", user.props.email);
            res.setCookie(new Cookie("email", user.props.email));
          }
          res.setCookie(new Cookie("session_id", session.id));
        }
        else {
          if (user.props.id !== session.data["userId"]) {
            // forbidden

            return res.send({
              statusCode: StatusCode.Forbidden,
              message: "Nacho Cheese",
              redirect: "/login?error=nacho_cheese",
            });
          }
        }

        return res.send({
          statusCode: StatusCode.Redirect,
          message: "Login was successful",
          redirect: "/profile/" + user.props.id,
        });
      } else {
        return res.send({
          statusCode: StatusCode.InternalServerError,
          message: "session not found!!!",
          redirect: "/login?error=session_error",
        });
      }
    } else {
      return res.send({
        statusCode: StatusCode.InternalServerError,
        message: "Login was successful",
        redirect: "/login?error=user_not_found",
      });
    }
  };

  /**
   * TODO: Handle logout.
   */
  logout = async (req: Request, res: Response) => {
    // Post : /logout
    // Good Case: redirect /
    // Bad Case: redirect /

    // See if user is logged in, logged out, or doesn't have a cookie.
    const userId: number = isLoggedIn(req, res);
    // Get cookies.
    const cookie = await req.findCookie("session_id");

    if (cookie) {
      // Get session
      const sessionManager = await SessionManager.getInstance();
      const theSession = await sessionManager.get(cookie.value);

      if (theSession) {
        // If session exists

        // Use destroy method to rid of user data and to set the cookie to expire.
        await theSession.destroy();

        // Set Expired Cookie
        await res.setCookie(theSession.cookie);

        // Return user object with session cookie set with expiration set to 5 seconds ago.
        await res.send({
          statusCode: StatusCode.OK,
          redirect: "/",
          message: "Logged out successfully!",
        });
      } else {
        // Nothing I guess, they aren't even logged in.
        await res.send({
          statusCode: StatusCode.OK,
          redirect: "/",
          message: "Session not found by id.",
        });
      }
    } else {
      // Nothing I guess
      await res.send({
        statusCode: StatusCode.OK,
        redirect: "/",
        message: "No session cookie provided.",
      });
    }
  };
}
