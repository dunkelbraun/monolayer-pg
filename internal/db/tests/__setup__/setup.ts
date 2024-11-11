import { askColumnsToRename } from "@monorepo/programs/columns-to-rename.js";
import { askMigrationName } from "@monorepo/programs/migration-name.js";
import type { ColumnsToRename } from "@monorepo/state/table-column-rename.js";
import dotenv from "dotenv";
import { Effect } from "effect";
import path, { dirname } from "node:path";
import { env } from "node:process";
import pg from "pg";
import type { GlobalThis } from "type-fest";
import { fileURLToPath } from "url";
import { vi } from "vitest";

dotenv.config({
	path: path.resolve(currentWorkingDirectory(), ".env.test"),
});

export type GlobalThisInTests = GlobalThis & {
	pool: pg.Pool | undefined;
	poolTwo: pg.Pool | undefined;
};

export function globalPool() {
	const globalTestThis = globalThis as GlobalThisInTests;

	if (globalTestThis.pool === undefined) {
		globalTestThis.pool = new pg.Pool({
			user: env.POSTGRES_USER,
			password: env.POSTGRES_PASSWORD,
			host: env.POSTGRES_HOST,
			port: Number(env.POSTGRES_PORT ?? 5432),
		});
	}
	return globalTestThis.pool;
}

vi.mock("@monorepo/programs/table-renames.js", async (importOriginal) => {
	const actual =
		(await importOriginal()) as typeof import("@monorepo/programs/table-renames.js");
	return {
		...actual,
		tableRenames: vi.fn(
			(
				_tableDiff: { added: string[]; deleted: string[] },
				schemaName: string,
			) => {
				return actual.tableRenames({ added: [], deleted: [] }, schemaName);
			},
		),
	};
});

vi.mock("@monorepo/programs/columns-to-rename.js", async (importOriginal) => {
	const actual =
		(await importOriginal()) as typeof import("@monorepo/programs/columns-to-rename.ts");
	return {
		...actual,
		columnsToRenamePrompt: vi.fn(
			(
				schemaName: string,
				diff: Record<
					string,
					{
						added: string[];
						deleted: string[];
					}
				>,
			) => {
				return Effect.gen(function* () {
					return yield* Effect.tryPromise(() =>
						askColumnsToRename(diff, schemaName),
					);
				});
			},
		),
		askColumnsToRename: vi.fn(
			async (
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				_columnDiff: Record<
					string,
					{
						added: string[];
						deleted: string[];
					}
				>,
			) => {
				const columnsToRename: ColumnsToRename = {};
				return columnsToRename;
			},
		),
	};
});

vi.mock("@monorepo/programs/migration-name.js", async () => {
	return {
		migrationNamePrompt: () => Effect.succeed("default"),
		askMigrationName: vi.fn(async () => {
			return "default";
		}),
	};
});

vi.mocked(askMigrationName).mockResolvedValueOnce("default");

export function mockColumnDiffOnce(value: ColumnsToRename) {
	vi.mocked(askColumnsToRename).mockResolvedValueOnce(value);
}

export function currentWorkingDirectory() {
	return path.resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}
