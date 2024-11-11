import type { Command } from "@commander-js/extra-typings";
import { gen, succeed, tryPromise } from "effect/Effect";
import type { MigrationInfo } from "kysely";
import color from "picocolors";
import { dataMigrator } from "~data/migrator/data-migrator.js";
import {
	dataAction,
	dataActionWithEffect,
} from "~data/programs/data-action.js";

export function dataStatus(program: Command) {
	dataAction(program, "status")
		.description("Displays data migration status")
		.action(async (opts) => {
			await dataActionWithEffect(
				gen(function* () {
					const migrator = yield* dataMigrator;
					const status = yield* tryPromise(() => migrator.status());
					for (const info of status) {
						yield* printStatus(info);
					}
					yield* succeed(true);
				}),
				opts,
			);
		});
}

function printStatus(migrationStatus: MigrationInfo) {
	// eslint-disable-next-line require-yield
	return gen(function* () {
		const statuses = {
			applied: "applied",
			pending: "pending",
		};
		const maxLength = Object.values(statuses)
			.map((val) => val.length)
			.sort()
			.reverse()
			.at(0)!;
		const status = migrationStatus.executedAt
			? `${color.green(statuses.applied.padStart(maxLength, " "))}`
			: `${color.yellow(statuses.pending.padStart(maxLength, " "))}`;
		console.log(`${status} ${migrationStatus.name}.ts`);
	});
}
