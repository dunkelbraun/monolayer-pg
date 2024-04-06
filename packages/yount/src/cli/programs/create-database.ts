import { Effect } from "effect";
import { Environment } from "../services/environment.js";
import { spinnerTask } from "../utils/spinner-task.js";
import { pgQuery } from "./pg-query.js";

export function createDatabase() {
	return Environment.pipe(
		Effect.flatMap((environment) =>
			spinnerTask(`Create database ${environment.pg.config.database}`, () =>
				pgQuery(
					environment.pg.adminPool,
					`CREATE DATABASE ${environment.pg.config.database};`,
				),
			),
		),
	);
}