import {
	appendFileSync,
	copyFileSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "fs";
import { FileMigrationProvider, Migrator, type Kysely } from "kysely";
import fs from "node:fs/promises";
import path from "path";
import type { Pool } from "pg";
import { chdir, cwd } from "process";
import { vi, type TaskContext } from "vitest";
import {
	configurationsTemplate,
	monolayerTemplate,
} from "~tests/__setup__/fixtures/program.js";
import {
	kyselyMigrator,
	kyselyWithCustomDB,
	type DbContext,
} from "~tests/__setup__/helpers/kysely.js";
import { globalPool } from "~tests/__setup__/setup.js";
import { ChangesetPhase } from "../../../src/changeset/types.js";
import { dbNameForTest, programFolder } from "./names.js";

export async function teardownContext(context: TaskContext & DbContext) {
	try {
		chdir(context.currentWorkingDirectory);
		await context.kysely.destroy();
		rmSync(context.folder, { recursive: true, force: true });
		vi.restoreAllMocks();
	} catch (e) {
		/* empty */
	}
}

export async function setUpContext(context: TaskContext & DbContext) {
	const pool = globalPool();
	context.currentWorkingDirectory = cwd();
	context.dbName = dbNameForTest(context);
	await pool.query(`DROP DATABASE IF EXISTS "${context.dbName}"`);
	await pool.query(`CREATE DATABASE "${context.dbName}"`);
	context.kysely = await kyselyWithCustomDB(context.dbName);
	const dateStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
	context.folder = path.join(
		cwd(),
		`tmp/schema_migrations/${dateStr}-${context.dbName}`,
	);
	mkdirSync(
		path.join(context.folder, "migrations", "default", ChangesetPhase.Alter),
		{
			recursive: true,
		},
	);
	mkdirSync(
		path.join(context.folder, "migrations", "default", ChangesetPhase.Expand),
		{
			recursive: true,
		},
	);
	mkdirSync(
		path.join(context.folder, "migrations", "default", ChangesetPhase.Contract),
		{
			recursive: true,
		},
	);
	context.migrator = await kyselyMigrator(context.kysely, context.folder);
	chdir(context.folder);
}

export async function setupProgramContext(
	context: TaskContext & ProgramContext,
	createDb = true,
	copyMigrationFiles = true,
) {
	context.currentWorkingDirectory = cwd();
	context.folder = path.join(cwd(), `tmp/programs/${programFolder(context)}`);
	rmSync(context.folder, { recursive: true, force: true });
	mkdirSync(
		path.join(
			context.folder,
			"monolayer",
			"migrations",
			"default",
			ChangesetPhase.Alter,
		),
		{
			recursive: true,
		},
	);
	mkdirSync(
		path.join(
			context.folder,
			"monolayer",
			"migrations",
			"default",
			ChangesetPhase.Expand,
		),
		{
			recursive: true,
		},
	);
	mkdirSync(
		path.join(
			context.folder,
			"monolayer",
			"migrations",
			"default",
			ChangesetPhase.Contract,
		),
		{
			recursive: true,
		},
	);
	mkdirSync(path.join(context.folder, "db", "dumps"), {
		recursive: true,
	});
	context.pool = globalPool();
	context.dbName = dbNameForTest(context);
	await context.pool.query(`DROP DATABASE IF EXISTS "${context.dbName}"`);
	await context.pool.query(`DROP DATABASE IF EXISTS "${context.dbName}_test"`);
	await context.pool.query(`DROP DATABASE IF EXISTS "${context.dbName}_stats"`);
	await context.pool.query(
		`DROP DATABASE IF EXISTS "${context.dbName}_stats_test"`,
	);
	if (createDb) {
		await context.pool.query(`CREATE DATABASE "${context.dbName}"`);
		await context.pool.query(`CREATE DATABASE "${context.dbName}_test"`);
		await context.pool.query(`CREATE DATABASE "${context.dbName}_stats"`);
		await context.pool.query(`CREATE DATABASE "${context.dbName}_stats_test"`);
	}

	const dbMigrator = await dbAndMigrator(context);
	context.kysely = dbMigrator.db;
	context.migrator = dbMigrator.migrator;
	const monolayerConfig = monolayerTemplate.render();
	appendFileSync(path.join(context.folder, "monolayer.ts"), monolayerConfig);

	const configurations = configurationsTemplate.render({
		dbName: context.dbName,
		pgPath: path.join(cwd(), "src", "pg"),
	});

	writeFileSync(
		path.join(context.folder, "db", "configuration.ts"),
		configurations,
	);

	writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);

	if (copyMigrationFiles) {
		copyMigrations(
			[
				"20240405T120024-regulus-mint",
				"20240405T120250-canopus-teal",
				"20240405T153857-alphard-black",
				"20240405T154913-mirfak-mustard",
			],
			context,
		);
	}
	chdir(context.folder);
}

export async function teardownProgramContext(
	context: TaskContext & ProgramContext,
) {
	// rmSync(context.folder, { recursive: true, force: true });
	try {
		await context.kysely.destroy();
	} catch (e) {
		/* empty */
	}
	chdir(context.currentWorkingDirectory);
}

export type ProgramContext = {
	folder: string;
	pool: Pool;
	dbName: string;
	currentWorkingDirectory: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kysely: Kysely<any>;
	migrator: Migrator;
};

function copyMigration(
	migrationName: string,
	context: ProgramContext | DbContext,
	migrationsFolder = `monolayer/migrations/default/${ChangesetPhase.Alter}`,
) {
	copyFileSync(
		`tests/__setup__/fixtures/migrations/${migrationName}.ts`,
		path.join(context.folder, migrationsFolder, `${migrationName}.ts`),
	);
}

export function copyMigrations(
	migrations: string[],
	context: ProgramContext | DbContext,
	migrationsFolder = `monolayer/migrations/default/${ChangesetPhase.Alter}`,
) {
	migrations.forEach((migration) => {
		copyMigration(migration, context, migrationsFolder);
	});
}

export async function dbAndMigrator(context: ProgramContext) {
	return {
		db: await kyselyWithCustomDB(context.dbName),
		migrator: new Migrator({
			db: await kyselyWithCustomDB(context.dbName),
			provider: new FileMigrationProvider({
				fs,
				path,
				migrationFolder: path.join(
					context.folder,
					"monolayer",
					"migrations",
					"default",
					ChangesetPhase.Alter,
				),
			}),
			migrationTableName: `monolayer_alter_migration`,
			migrationLockTableName: `monolayer_alter_migration_lock`,
		}),
	};
}

const pgPath = path.join(cwd(), "src", "pg.ts");
const schemaFile = `import { schema, table, text } from "${pgPath}";

export const dbSchema = schema({
  tables: {
    regulus_mint: table({
			columns: {
				name: text().notNull(),
			},
		}),
    regulur_door: table({
			columns: {
				name: text().notNull(),
			},
		}),
    alphard_black: table({
			columns: {
				name: text().notNull(),
			},
		}),
    mirfak_mustart: table({
			columns: {
				name: text().notNull(),
			},
		}),
  },
});
`;