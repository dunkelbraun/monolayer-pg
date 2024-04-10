import { Context, Effect, Layer } from "effect";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { importConnector } from "~/config.js";
import { DevPg, Pg } from "./pg.js";

export class Db extends Context.Tag("Db")<
	Db,
	{
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		readonly kysely: Kysely<any>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		readonly kyselyNoCamelCase: Kysely<any>;
	}
>() {}

export class DevDb extends Context.Tag("DevDb")<
	DevDb,
	{
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		readonly kysely: Kysely<any>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		readonly kyselyNoCamelCase: Kysely<any>;
	}
>() {}

export function kyselyLayer() {
	return Layer.effect(
		Db,
		Effect.gen(function* (_) {
			const pg = yield* _(Pg);
			const connectors = yield* _(
				Effect.promise(async () => await importConnector()),
			);

			const useCamelCase =
				connectors.connectors?.default.camelCasePlugin?.enabled ?? false;
			return {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				kysely: new Kysely<any>({
					dialect: new PostgresDialect({
						pool: pg.pool,
					}),
					plugins: useCamelCase ? [new CamelCasePlugin()] : [],
				}),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				kyselyNoCamelCase: new Kysely<any>({
					dialect: new PostgresDialect({
						pool: pg.pool,
					}),
				}),
			};
		}),
	);
}

export function devKyselyLayer() {
	return Layer.effect(
		DevDb,
		Effect.gen(function* (_) {
			const pg = yield* _(DevPg);
			const connectors = yield* _(
				Effect.promise(async () => await importConnector()),
			);

			const useCamelCase =
				connectors.connectors?.default.camelCasePlugin?.enabled ?? false;
			return {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				kysely: new Kysely<any>({
					dialect: new PostgresDialect({
						pool: pg.pool,
					}),
					plugins: useCamelCase ? [new CamelCasePlugin()] : [],
				}),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				kyselyNoCamelCase: new Kysely<any>({
					dialect: new PostgresDialect({
						pool: pg.pool,
					}),
				}),
			};
		}),
	);
}
