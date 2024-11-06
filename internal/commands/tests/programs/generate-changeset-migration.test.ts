/* eslint-disable max-lines */
import { ChangesetGeneratorState } from "@monorepo/pg/changeset/changeset-generator.js";
import { generateMigration } from "@monorepo/programs/migrations/generate.js";
import { RenameState } from "@monorepo/programs/table-renames.js";
import {
	makePackageNameState,
	PackageNameState,
} from "@monorepo/state/package-name.js";
import { Effect, Layer } from "effect";
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { configurationsTemplateTwoDatabaseSchemas } from "~tests/__setup__/fixtures/program.js";
import {
	alterMigrationPath,
	contractMigrationPath,
	expandMigrationPath,
} from "~tests/__setup__/helpers/default-migration-path.js";
import { programWithContextAndServices } from "~tests/__setup__/helpers/run-program.js";
import {
	setupProgramContext,
	teardownProgramContext,
	type ProgramContext,
} from "~tests/__setup__/helpers/test-context.js";
import { currentWorkingDirectory } from "~tests/__setup__/setup.js";

describe("generateChangesetMigration", () => {
	describe("without dependencies", () => {
		beforeEach<ProgramContext>(async (context) => {
			await setupProgramContext(context, true, false);
			vi.unmock("~monolayer/create-file.ts");
		});

		afterEach<ProgramContext>(async (context) => {
			await teardownProgramContext(context);
		});

		test<ProgramContext>("returns a changeset list", async (context) => {
			rmSync(expandMigrationPath(context.folder), {
				recursive: true,
				force: true,
			});
			mkdirSync(expandMigrationPath(context.folder), {
				recursive: true,
			});

			writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);

			await Effect.runPromise(
				await programWithContextAndServices(
					ChangesetGeneratorState.provide(
						RenameState.provide(
							Effect.provide(
								generateMigration,
								Layer.effect(
									PackageNameState,
									makePackageNameState("@monolayer/pg"),
								),
							),
						),
					),
				),
			);

			const migrationFiles = readdirSync(expandMigrationPath(context.folder));

			expect(migrationFiles.length).toBe(1);

			const migration = readFileSync(
				path.join(
					context.folder,
					"monolayer",
					"migrations",
					"default",
					"expand",
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
			rmSync(expandMigrationPath(context.folder), {
				recursive: true,
				force: true,
			});
			mkdirSync(expandMigrationPath(context.folder), {
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
				pgPath: path.join(
					currentWorkingDirectory(),
					"tests",
					"__setup__",
					"helpers",
					"pg-exports.js",
				),
			});

			writeFileSync(
				path.join(context.folder, "db", "databases.ts"),
				configurations,
			);

			await Effect.runPromise(
				await programWithContextAndServices(
					ChangesetGeneratorState.provide(
						RenameState.provide(
							Effect.provide(
								generateMigration,
								Layer.effect(
									PackageNameState,
									makePackageNameState("@monolayer/pg"),
								),
							),
						),
					),
				),
			);

			const migrationFiles = readdirSync(expandMigrationPath(context.folder));

			expect(migrationFiles.length).toBe(1);

			const migration = readFileSync(
				path.join(
					context.folder,
					"monolayer",
					"migrations",
					"default",
					"expand",
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
	});

	describe("with dependencies", () => {
		beforeEach<ProgramContext>(async (context) => {
			await setupProgramContext(context, true, true);
			vi.unmock("~monolayer/create-file.ts");
		});

		afterEach<ProgramContext>(async (context) => {
			await teardownProgramContext(context);
		});
		test<ProgramContext>("returns a changeset list", async (context) => {
			writeFileSync(path.join(context.folder, "db", "schema.ts"), schemaFile);

			await Effect.runPromise(
				await programWithContextAndServices(
					ChangesetGeneratorState.provide(
						RenameState.provide(
							Effect.provide(
								generateMigration,
								Layer.effect(
									PackageNameState,
									makePackageNameState("@monolayer/pg"),
								),
							),
						),
					),
				),
			);

			const expandFiles = readdirSync(expandMigrationPath(context.folder));
			const alterFiles = readdirSync(alterMigrationPath(context.folder));
			const contractFiles = readdirSync(contractMigrationPath(context.folder));

			expect(
				expandFiles.length + alterFiles.length + contractFiles.length,
			).toBe(5);

			const migration = readFileSync(
				path.join(
					context.folder,
					"monolayer",
					"migrations",
					"default",
					"expand",
					expandFiles.slice(-1)[0]!,
				),
			);
			const migrationName = expandFiles.slice(-1)[0]!;
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
				pgPath: path.join(
					currentWorkingDirectory(),
					"tests",
					"__setup__",
					"helpers",
					"pg-exports.js",
				),
			});

			writeFileSync(
				path.join(context.folder, "db", "databases.ts"),
				configurations,
			);

			await Effect.runPromise(
				await programWithContextAndServices(
					ChangesetGeneratorState.provide(
						RenameState.provide(
							Effect.provide(
								generateMigration,
								Layer.effect(
									PackageNameState,
									makePackageNameState("@monolayer/pg"),
								),
							),
						),
					),
				),
			);

			const expandFiles = readdirSync(expandMigrationPath(context.folder));
			const alterFiles = readdirSync(alterMigrationPath(context.folder));
			const contractFiles = readdirSync(contractMigrationPath(context.folder));

			expect(
				expandFiles.length + alterFiles.length + contractFiles.length,
			).toBe(5);

			const migration = readFileSync(
				path.join(
					context.folder,
					"monolayer",
					"migrations",
					"default",
					"expand",
					expandFiles.slice(-1)[0]!,
				),
			);

			const migrationName = expandFiles.slice(-1)[0]!;
			expect(migration.toString()).toBe(
				expectedMigrationWithSchemasAndDependency.replace(
					"#name",
					migrationName.substring(0, migrationName.lastIndexOf(".")),
				),
			);
		});
	});
});

const pgPath = path.join(
	currentWorkingDirectory(),
	"tests",
	"__setup__",
	"helpers",
	"pg-exports.js",
);

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

const expectedMigration = `import { Kysely } from "kysely";
import { type Migration } from "@monolayer/pg/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
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

const expectedMigrationWithSchemas = `import { Kysely, sql } from "kysely";
import { type Migration } from "@monolayer/pg/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
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

const expectedMigrationWithDependency = `import { Kysely } from "kysely";
import { type Migration } from "@monolayer/pg/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
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

const expectedMigrationWithSchemasAndDependency = `import { Kysely, sql } from "kysely";
import { type Migration } from "@monolayer/pg/migration";

export const migration: Migration = {
	name: "#name",
	transaction: true,
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
