import * as p from "@clack/prompts";
import { Migrator } from "@monorepo/services/migrator.js";
import { Effect } from "effect";
import { type MigrationResult } from "kysely";
import color from "picocolors";

export function migrateDown() {
	return Migrator.pipe(
		Effect.flatMap((migrator) => migrator.rollbackAll),
		Effect.tap(({ results }) =>
			Effect.if(results !== undefined, {
				onTrue: () => Effect.forEach(results!, logResultStatus),
				onFalse: () => Effect.void,
			}),
		),
		Effect.flatMap(({ error }) =>
			Effect.if(error !== undefined, {
				onTrue: () => Effect.fail(error),
				onFalse: () => Effect.succeed(true),
			}),
		),
	);
}

function logResultStatus(result: MigrationResult) {
	switch (result.status) {
		case "Success":
			p.log.info(`${color.green("Down")} ${result.migrationName}`);
			break;
		case "Error":
			p.log.error(`${color.red("Error")} ${result.migrationName} (ROLLBACK)`);
			break;
		case "NotExecuted":
			p.log.warn(`${color.yellow("Not executed")} ${result.migrationName}`);
			break;
	}
	return Effect.succeed(true);
}
