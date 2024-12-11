
import Request from "./router/Request";
import Response from "./router/Response";
import SessionManager from "./auth/SessionManager";
import User from "./models/User"
import Cookie from "./auth/Cookie"
import { Sql } from "postgres";

/**
 * Converts a camelCase string to snake_case.
 * @param camelCase The camelCase string to convert.
 * @returns The snake_case string.
 * @example "helloWorld" => "hello_world"
 */
export const camelToSnake = (camelCase: string): string => {
	return camelCase.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
};

/**
 * Converts a snake_case string to camelCase.
 * @param snakeCase The snake_case string to convert.
 * @returns The camelCase string.
 * @example "hello_world" => "helloWorld"
 */
export const snakeToCamel = (snakeCase: string): string => {
	return snakeCase
		.toLowerCase()
		.split("_")
		.map((word, index) => {
			return index === 0
				? word
				: word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join("");
};

/**
 * Converts the keys of an object to a different case.
 * @param stringConverter The function to convert the keys of the object.
 * @param source The object to convert.
 * @returns A new object with the keys converted to a different case.
 * @example convertToCase(camelToSnake, { helloWorld: "hi" }) => { hello_world: "hi" }
 * @example convertToCase(snakeToCamel, { hello_world: "hi" }) => { helloWorld: "hi" }
 */
export const convertToCase = (
	stringConverter: (key: string) => string,
	source: Record<string, any>,
): Record<string, any> => {
	const destination: Record<string, any> = {};

	for (const key in source) {
		// Makes sure we don't go down the prototype chain.
		if (source.hasOwnProperty(key)) {
			destination[stringConverter(key)] = source[key];
		}
	}

	return destination;
};

/**
 * A UTC (Universal Time) date is a date without a timezone.
 * This is useful for storing dates in a database without worrying
 * about timezones. Once we need to display the date to the user,
 * we can convert it to the local timezone.
 * @returns A new date in UTC.
 * @example 2024-03-21T04:01:00.000Z
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/UTC
 */
export const createUTCDate = (date?: Date): Date => {
	const now = date ?? new Date();
	return new Date(
		Date.UTC(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			now.getHours(),
			now.getMinutes(),
			now.getSeconds(),
		),
	);
};

/**
 * @param utcDate The date to format.
 * @returns The date in a human-readable format.
 * @example 2024-03-21T04:01:00.000Z => Thursday, March 21, 2024
 */
export const formatDateToLocal = (
	utcDate: Date,
	options?: Intl.DateTimeFormatOptions,
) => {
	return new Intl.DateTimeFormat(
		"en-US",
		options ?? {
			dateStyle: "full",
		},
	).format(utcDate);
};

/**
 * @param utcDate The date to format.
 * @returns The date in ISO format.
 * @example 2024-03-21T04:01:00.000Z => 2024-03-21
 */
export const formatDateToISO = (utcDate: Date) => {
	return utcDate.toISOString().slice(0, 10);
};


/**
 * @param req The request object.
 * @param res The response object.
 * @returns UserStatus depending on if the user is logged in, logged out, or didn't send a session cookie.
 * @example req => UserStatus.LoggedIn / req => UserStatus.LoggedOut / req => UserStatus.NoSession / req => UserStatus.NoCookie
 */
export const isLoggedIn = (req: Request, res: Response) => {
	// Get the session cookie from the request object.
	const sessionCookie = req.findCookie("session_id")

	if (sessionCookie) {
		// Get session tied to session_id
		const sessionManager = SessionManager.getInstance();
		const theSession = sessionManager.get(sessionCookie.value)

		if (theSession) {
			if (theSession.exists("userId")) {
				// Session is linked to a user in the user table.
				// Return userId.
				return theSession.get("userId")
			}
			else {
				// Session has no user data on it.
				// Return code -1.
				return -1
			}
		}
		else {
			// Session not found. This would likely be impossible.
			// Return code -2.
			return -2
		}
	}
	else {
		// Cookie hasn't been set yet.
		// Return code -3.
		return -3
	}
};

export enum UserStatus {
	LoggedIn = 1,
	LoggedOut = 2,
	NoSession = 3,
	NoCookie = 4,
}

/**
 * @param req The request object.
 * @param res The response object.
 * @returns True if the session has a user id.
 * @example req => true / req => false
 */
export const assignSession = (req: Request, res: Response) => {
	// Get singleton instance of session manager and create session.
	const sessionManager = SessionManager.getInstance();
	const newSession = sessionManager.createSession();

	// Create session cookie that holds the session Id.
	const sessionCookie: Cookie = new Cookie(
		"session_id",
		newSession.id,
	);

	// Set the cookie in the response object.
	res.setCookie(sessionCookie)
}

export const DEFAULT_PROFILE_PICTURE: string = "https://i.pinimg.com/originals/38/47/9c/38479c637a4ef9c5ced95ca66ffa2f41.png";

export const DEFAULT_PLAYLIST_PICTURE: string = "https://tidal.com/browse/assets/images/defaultImages/defaultPlaylistImage.png"

export const getUserProfilePicture = async (sql: Sql, userId: number) => {
	if (userId >= 0) {
		let user: User | null
		try {
			user = await User.read(sql, userId)
		}
		catch {
			return null
		}
		if (user && user.props.userPfpLink) {
			return user.props.userPfpLink
		}
		else {
			return null
		}
	}
	else {
		return null
	}
}