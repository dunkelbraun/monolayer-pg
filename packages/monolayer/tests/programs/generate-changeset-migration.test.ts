/* eslint-disable max-lines */
import { Effect, Ref } from "effect";
import {
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "fs";
import path from "path";
import { cwd } from "process";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadEnv } from "~/cli/cli-action.js";
import { generateMigration } from "~/migrations/generate.js";
import { AppEnvironment } from "~/state/app-environment.js";
import { configurationsTemplateTwoDatabaseSchemas } from "~tests/__setup__/fixtures/program.js";
import { defaultMigrationPath } from "~tests/__setup__/helpers/default-migration-path.js";
import { layers } from "~tests/__setup__/helpers/layers.js";
import { programWithErrorCause } from "~tests/__setup__/helpers/run-program.js";
import {
	setupProgramContext,
	teardownProgramContext,
	type ProgramContext,
} from "~tests/__setup__/helpers/test-context.js";

describe("generateChangesetMigration", () => {
	beforeEach<ProgramContext>(async (context) => {
		await setupProgramContext(context);
		vi.unmock("~/create-file.ts");
	});

	afterEach<ProgramContext>(async (context) => {
		await teardownProgramContext(context);
	});

	test<ProgramContext>("returns a changeset list", async (context) => {
		rmSync(defaultMigrationPath(context.folder), {
			recursive: true,
			force: true,
		});
		mkdirSync(defaultMigrationPath(context.folder), {
			recursive: true,
		});

		writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);

		await Effect.runPromise(
			Effect.provideServiceEffect(
				Effect.provide(programWithErrorCause(generateMigration()), layers),
				AppEnvironment,
				Ref.make(await loadEnv("development", "default")),
			),
		);

		const migrationFiles = readdirSync(defaultMigrationPath(context.folder));

		expect(migrationFiles.length).toBe(1);

		const migration = readFileSync(
			path.join(
				context.folder,
				"db",
				"migrations",
				"default",
				"breaking",
				migrationFiles[0]!,
			),
		);
		const migrationName = migrationFiles[0]!;
		expect(migration.toString()).toBe(
			expectedMigration.replace(
				"#name",
				migrationName.substring(0, migrationName.lastIndexOf(".")),
			),
		);
	});

	test<ProgramContext>("returns a changeset list for multiple database definitions", async (context) => {
		rmSync(defaultMigrationPath(context.folder), {
			recursive: true,
			force: true,
		});
		mkdirSync(defaultMigrationPath(context.folder), {
			recursive: true,
		});

		writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);
		writeFileSync(
			path.join(context.folder, "db", "anotherSchema.ts"),
			anotherSchemaFile,
		);

		const configurations = configurationsTemplateTwoDatabaseSchemas.render({
			dbName: context.dbName,
			secondSchemaFile: "anotherSchema",
		});

		writeFileSync(
			path.join(context.folder, "db", "configuration.ts"),
			configurations,
		);

		await Effect.runPromise(
			Effect.provideServiceEffect(
				Effect.provide(programWithErrorCause(generateMigration()), layers),
				AppEnvironment,
				Ref.make(await loadEnv("development", "default")),
			),
		);

		const migrationFiles = readdirSync(defaultMigrationPath(context.folder));

		expect(migrationFiles.length).toBe(1);

		const migration = readFileSync(
			path.join(
				context.folder,
				"db",
				"migrations",
				"default",
				"breaking",
				migrationFiles[0]!,
			),
		);

		const migrationName = migrationFiles[0]!;
		expect(migration.toString()).toBe(
			expectedMigrationWithSchemas.replace(
				"#name",
				migrationName.substring(0, migrationName.lastIndexOf(".")),
			),
		);
	});

	describe("with dependencies", () => {
		test<ProgramContext>("returns a changeset list", async (context) => {
			writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);

			await Effect.runPromise(
				Effect.provideServiceEffect(
					Effect.provide(programWithErrorCause(generateMigration()), layers),
					AppEnvironment,
					Ref.make(await loadEnv("development", "default")),
				),
			);

			const migrationFiles = readdirSync(defaultMigrationPath(context.folder));

			expect(migrationFiles.length).toBe(5);

			const migration = readFileSync(
				path.join(
					context.folder,
					"db",
					"migrations",
					"default",
					"breaking",
					migrationFiles.slice(-1)[0]!,
				),
			);
			const migrationName = migrationFiles.slice(-1)[0]!;
			expect(migration.toString()).toBe(
				expectedMigrationWithDependency.replace(
					"#name",
					migrationName.substring(0, migrationName.lastIndexOf(".")),
				),
			);
		});

		test<ProgramContext>("returns a changeset list for multiple database definitions", async (context) => {
			writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);
			writeFileSync(
				path.join(context.folder, "db", "anotherSchema.ts"),
				anotherSchemaFile,
			);

			const configurations = configurationsTemplateTwoDatabaseSchemas.render({
				dbName: context.dbName,
				secondSchemaFile: "anotherSchema",
			});

			writeFileSync(
				path.join(context.folder, "db", "configuration.ts"),
				configurations,
			);

			await Effect.runPromise(
				Effect.provideServiceEffect(
					Effect.provide(programWithErrorCause(generateMigration()), layers),
					AppEnvironment,
					Ref.make(await loadEnv("development", "default")),
				),
			);

			const migrationFiles = readdirSync(defaultMigrationPath(context.folder));

			expect(migrationFiles.length).toBe(5);

			const migration = readFileSync(
				path.join(
					context.folder,
					"db",
					"migrations",
					"default",
					"breaking",
					migrationFiles.slice(-1)[0]!,
				),
			);

			const migrationName = migrationFiles.slice(-1)[0]!;
			expect(migration.toString()).toBe(
				expectedMigrationWithSchemasAndDependency.replace(
					"#name",
					migrationName.substring(0, migrationName.lastIndexOf(".")),
				),
			);
		});
	});
});

const pgPath = path.join(cwd(), "src", "pg.ts");
const schemaFile = `import { schema, table, text } from "${pgPath}";

export const dbSchema = schema({
  tables: {
    regulus_mint: table({
			columns: {
				name: text().notNull(),
			},
		}),
  },
});
`;

const anotherSchemaFile = `import { schema, table, text } from "${pgPath}";

export const dbSchema = schema({
	name: "accounts",
  tables: {
    regulus_wolf: table({
			columns: {
				name: text().notNull(),
			},
		}),
  },
});
`;

const expectedMigration = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";
import { NO_DEPENDENCY, Migration } from "monolayer/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
	dependsOn: NO_DEPENDENCY,
	scaffold: false,
	warnings: [],
};

export async function up(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .createTable("regulus_mint")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .dropTable("regulus_mint")
    .execute();
}
`;

const expectedMigrationWithSchemas = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";
import { NO_DEPENDENCY, Migration } from "monolayer/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
	dependsOn: NO_DEPENDENCY,
	scaffold: false,
	warnings: [],
};

export async function up(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .createTable("regulus_mint")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();

  await sql\`CREATE SCHEMA IF NOT EXISTS "accounts";\`
    .execute(db);

  await sql\`COMMENT ON SCHEMA "accounts" IS 'monolayer'\`
    .execute(db);

  await db.withSchema("accounts").schema
    .createTable("regulus_wolf")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .dropTable("regulus_mint")
    .execute();

  await db.withSchema("accounts").schema
    .dropTable("regulus_wolf")
    .execute();

  await sql\`DROP SCHEMA IF EXISTS "accounts";\`
    .execute(db);
}
`;

const expectedMigrationWithDependency = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from "kysely";
import { Migration } from "monolayer/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
	dependsOn: "20240405T154913-mirfak-mustard",
	scaffold: false,
	warnings: [],
};

export async function up(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .createTable("regulus_mint")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .dropTable("regulus_mint")
    .execute();
}
`;

const expectedMigrationWithSchemasAndDependency = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";
import { Migration } from "monolayer/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
	dependsOn: "20240405T154913-mirfak-mustard",
	scaffold: false,
	warnings: [],
};

export async function up(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .createTable("regulus_mint")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();

  await sql\`CREATE SCHEMA IF NOT EXISTS "accounts";\`
    .execute(db);

  await sql\`COMMENT ON SCHEMA "accounts" IS 'monolayer'\`
    .execute(db);

  await db.withSchema("accounts").schema
    .createTable("regulus_wolf")
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("public").schema
    .dropTable("regulus_mint")
    .execute();

  await db.withSchema("accounts").schema
    .dropTable("regulus_wolf")
    .execute();

  await sql\`DROP SCHEMA IF EXISTS "accounts";\`
    .execute(db);
}
`;
