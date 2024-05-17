import * as p from "@clack/prompts";
import { confirm } from "@clack/prompts";
import { Effect } from "effect";
import { unlinkSync } from "fs";
import path from "path";
import color from "picocolors";
import { cwd } from "process";
import { appEnvironmentMigrationsFolder } from "~/state/app-environment.js";
import { cancelOperation } from "../cli/cancel-operation.js";
import { allMigrations } from "./migration.js";

export const pendingMigrations = Effect.gen(function* () {
	const pendingMigrations = yield* localPendingSchemaMigrations;
	if (pendingMigrations.length > 0) {
		yield* Effect.forEach(pendingMigrations, logPendingMigrationNames);
	} else {
		p.log.message("No pending migrations.");
	}
	return pendingMigrations;
});

function logPendingMigrationNames(migration: { name: string; path: string }) {
	p.log.message(
		`${color.yellow("pending")} ${path.basename(migration.path, ".ts")}`,
	);
	return Effect.void;
}

export const handlePendingSchemaMigrations = Effect.gen(function* () {
	const localPending = yield* localPendingSchemaMigrations;
	if (localPending.length == 0) return true;

	yield* logPendingMigrations(localPending);

	if (yield* askConfirmationDelete) {
		yield* deletePendingMigrations(localPending);
	} else {
		yield* cancelOperation();
	}
});

function logPendingMigrations(
	pending: {
		name: string;
		path: string;
	}[],
) {
	return Effect.gen(function* () {
		for (const migration of pending) {
			p.log.warn(
				`${color.yellow("pending")} ${path.relative(cwd(), migration.path)}`,
			);
		}
		yield* Effect.succeed(true);
	});
}

const askConfirmationDelete = Effect.gen(function* () {
	const promptConfirm = yield* Effect.tryPromise(() =>
		confirm({
			initialValue: false,
			message: `You have pending schema migrations to apply and ${color.bold(
				"we need to delete them to continue",
			)}. Do you want to proceed?`,
		}),
	);
	return promptConfirm === true;
});

interface PendingMigration {
	name: string;
	path: string;
}

export function deletePendingMigrations(pendingMigrations: PendingMigration[]) {
	return Effect.gen(function* () {
		for (const migration of pendingMigrations) {
			unlinkSync(migration.path);
		}
		return yield* Effect.succeed(true);
	});
}

export const localPendingSchemaMigrations = Effect.gen(function* () {
	const folder = yield* appEnvironmentMigrationsFolder;
	const all = yield* allMigrations;

	return all
		.filter((info) => info.executedAt === undefined)
		.map((info) => {
			return {
				name: info.name,
				path: path.join(folder, `${info.name}.ts`),
			};
		});
});
