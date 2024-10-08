import * as p from "@clack/prompts";
import { select } from "@clack/prompts";
import { cancelOperation } from "@monorepo/cli/cancel-operation.js";
import { ExitWithSuccess } from "@monorepo/cli/errors.js";
import {
	migrationInfoToMigration,
	type Migration,
	type MonolayerMigrationInfo,
} from "@monorepo/migrator/migration.js";
import { NO_MIGRATIONS } from "@monorepo/migrator/migrator.js";
import { Migrator } from "@monorepo/services/migrator.js";
import { appEnvironmentMigrationsFolder } from "@monorepo/state/app-environment.js";
import { Effect } from "effect";
import { type MigrationInfo } from "kysely";
import path from "path";
import {
	deletePendingMigrations,
	logPendingMigrations,
} from "~programs/migrations/pending.js";

export const rollback = Effect.gen(function* () {
	const migrator = yield* Migrator;
	const stats = yield* migrator.migrationStats;
	const executedMigrations = stats.executed;
	if (executedMigrations.length === 0) {
		p.log.warn("Nothing to rollback. There are no migrations.");
		yield* Effect.fail(new ExitWithSuccess({ cause: "No migrations" }));
	}

	p.log.info(`You have ${executedMigrations.length} migrations applied.`);

	const lastExecutedMigration = executedMigrations.slice(-1)[0];
	if (lastExecutedMigration !== undefined) {
		p.log.info(
			`Last executed migration: ${lastExecutedMigration.name} (${lastExecutedMigration.phase}).`,
		);
	}
	const promptResult = yield* promptRollback(executedMigrations, 10);

	yield* confirmRollback(promptResult.migrationNames);

	const migrationsToRollback = executedMigrations.filter(
		(m) =>
			promptResult.migrationNames.includes(m.name) ||
			m.name === promptResult.downTo,
	);

	yield* confirmRollbackWithScafoldedMigrations(
		migrationInfoToMigration(migrationsToRollback),
	);

	if (promptResult.downTo !== NO_MIGRATIONS) {
		migrationsToRollback.shift();
	}

	yield* migrator.rollback(migrationsToRollback.reverse());

	p.log.info("Pending migrations after rollback:");

	yield* logPendingMigrations;

	if (yield* confirmDelete) {
		yield* migrationNameAndPath(
			executedMigrations.filter((r) =>
				promptResult.migrationNames.includes(r.name),
			),
		).pipe(Effect.tap(deletePendingMigrations));
	}
	return true;
});

function confirmRollback(migrations: string[]) {
	return Effect.tryPromise(() => confirmRollbackPrompt(migrations)).pipe(
		Effect.flatMap((proceedWithSquash) => {
			if (typeof proceedWithSquash === "symbol" || !proceedWithSquash) {
				return cancelOperation();
			}
			return Effect.succeed(true);
		}),
	);
}

const confirmDelete = Effect.gen(function* () {
	const confirm = yield* Effect.tryPromise(
		async () => await confirmDeletePendingMigrationsPrompt(),
	);
	if (typeof confirm === "symbol") {
		yield* cancelOperation();
	}
	return confirm === true;
});

function migrationsForPrompt(
	migrations: readonly MigrationInfo[],
	limit: number,
) {
	const migrationValues = migrations.map((m) => {
		return {
			value: m.name,
		};
	});
	migrationValues.unshift({
		value: `rollback all migrations (${migrations.length})`,
	});
	migrationValues.pop();
	return migrationValues.slice(-limit).reverse();
}

function promptRollback(migrations: readonly MigrationInfo[], limit: number) {
	return Effect.gen(function* () {
		const migration = yield* Effect.tryPromise(() =>
			rollbackMigrationPrompt(migrationsForPrompt(migrations, limit)),
		);
		if (typeof migration === "symbol") {
			yield* cancelOperation();
		}
		const findMigrationIndex = migrations.findIndex(
			(m) => m.name === migration,
		);
		const migrationNames = migrations
			.slice(findMigrationIndex == -1 ? 0 : findMigrationIndex + 1)
			.map((m) => m.name);
		return {
			migrationNames,
			downTo:
				findMigrationIndex === -1
					? NO_MIGRATIONS
					: migrations[findMigrationIndex]!.name,
		};
	});
}

function confirmRollbackWithScafoldedMigrations(migrations: Migration[]) {
	return Effect.gen(function* () {
		if (migrations.every((r) => !r.scaffold)) {
			return;
		}
		const scaffoldedMigrations = migrations
			.filter((r) => r.scaffold)
			.map((r) => r.name!);
		return yield* Effect.tryPromise(() =>
			confirmRollbackWithScaffoldedMigrationsPrompt(scaffoldedMigrations),
		).pipe(
			Effect.flatMap((proceedWithSquash) => {
				if (typeof proceedWithSquash === "symbol" || !proceedWithSquash) {
					return cancelOperation();
				}
				return Effect.succeed(true);
			}),
		);
	});
}

function migrationNameAndPath(migrations: MonolayerMigrationInfo[]) {
	return Effect.gen(function* () {
		const folder = yield* appEnvironmentMigrationsFolder;
		return migrations.map((rev) => ({
			name: rev.name,
			path: path.join(folder, rev.phase, `${rev.name}.ts`),
		}));
	});
}

type MigrationSelection = {
	value: string;
	label?: string | undefined;
	hint?: string | undefined;
};

async function rollbackMigrationPrompt(migrations: MigrationSelection[]) {
	const selection = await select<MigrationSelection[], string>({
		message: "Select a migration to rollback to:",
		options: migrations.map((migration) => ({
			value: migration.value,
		})),
	});
	return selection;
}

async function confirmDeletePendingMigrationsPrompt() {
	return p.confirm({
		initialValue: false,
		message: `Do you want to delete the pending migration files?`,
	});
}

async function confirmRollbackWithScaffoldedMigrationsPrompt(
	migrations: string[],
) {
	p.log.warning(`Some of the migrations to be discarded are scaffolded`);
	p.log.message(
		"Their changes will not be added to the new migrations and the resulting migration may fail.",
	);
	p.log.message(`Scaffolded migrations:
${migrations.map((migration) => `- ${migration}`).join("\n")}`);
	return await p.confirm({
		initialValue: false,
		message: `Do you want to continue?`,
	});
}

async function confirmRollbackPrompt(migrations: string[]) {
	p.log.warning(`The following migrations will be discarded:
${migrations.map((migration) => `- ${migration}`).join("\n")}`);
	return await p.confirm({
		initialValue: false,
		message: `Do you want to continue?`,
	});
}
