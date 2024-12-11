import postgres from "postgres";
import User, { UserProps } from "../src/models/User";
import Server from "../src/Server";
import { StatusCode } from "../src/router/Response";
import { HttpResponse, clearCookieJar, makeHttpRequest } from "./client";
import { test, describe, expect, afterEach, beforeAll } from "vitest";
import { createUTCDate } from "../src/utils";

describe("User HTTP operations", () => {
	const sql = postgres({
		database: "RealDB",
	});

	const server = new Server({
		host: "localhost",
		port: 3000,
		sql,
	});

	const createUser = async (props: Partial<UserProps> = {}) => {
		return await User.create(sql, {
			email: props.email || "user@email.com",
			userPassword: props.userPassword || "password",
			createdAt: props.createdAt || createUTCDate(),
		});
	};

	beforeAll(async () => {
		await server.start();
	});

	/**
	 * Clean up the database after each test. This function deletes all the rows
	 * from the todos and subtodos tables and resets the sequence for each table.
	 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
	 */
	afterEach(async () => {
		const tables = ["users"];

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

		clearCookieJar();
	});

	test("User was created.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
				password: "password",
				confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.Created);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(Object.keys(body).includes("payload")).toBe(true);
		expect(body.message).toBe("User Authenticated");
		expect(Object.keys(body.payload).includes("user")).toBe(true);
		expect(body.payload.user.email).toBe("user@email.com");
		expect(body.payload.user.userPassword).toBe("password");
		expect(body.payload.user.createdAt).not.toBeNull();
	});

	test("User was not created due to missing email.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Please enter an email.");
	});

	test("User was not created due to missing password.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Please enter a password");
	});

	test("User was not created due to mismatched passwords.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
				password: "password",
				confirmPassword: "password123",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Passwords do not match.");
	});

	test("User was not created due to duplicate email.", async () => {
		await createUser({ email: "user@email.com" });

		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/users",
			{
				email: "user@email.com",
				password: "password",
				confirmPassword: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Email is already registered to an account.");
	});

	test("User was logged in.", async () => {
		const user = await createUser();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: user.props.email,
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.Redirect);
		expect(Object.keys(body).includes("message")).toBe(true);
		expect(body.message).toBe("Login was successful");
	});

	test("User was not logged in due to invalid credentials.", async () => {
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "nonexistentemail",
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.Unauthorized);
		expect(body.message).toBe("Login was unsuccessful. Invalid credentials.");
	});

	test("User was not logged in due to missing email field.", async () => {
		const user = await createUser();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: null,
				password: "password",
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Email field is missing.");
	});

	test("User was not logged in due to missing password field.", async () => {
		const user = await createUser();
		const { statusCode, body }: HttpResponse = await makeHttpRequest(
			"POST",
			"/login",
			{
				email: "user@email.com",
				password: null,
			},
		);

		expect(statusCode).toBe(StatusCode.BadRequest);
		expect(body.message).toBe("Password field is missing.");
	});
});