/* eslint-disable max-lines */
import * as p from "@clack/prompts";
import { PgDatabase } from "@monorepo/pg/database.js";
import type { EnumInfo } from "@monorepo/pg/introspection/enum.js";
import { dbExtensionInfo } from "@monorepo/pg/introspection/extension.js";
import type { IndexInfo } from "@monorepo/pg/introspection/index.js";
import type { BuilderContext } from "@monorepo/pg/introspection/introspection/foreign-key-builder.js";
import { introspectRemoteSchema } from "@monorepo/pg/introspection/introspection/introspection.js";
import type { InformationSchemaDB } from "@monorepo/pg/introspection/introspection/types.js";
import type {
	CheckInfo,
	PrimaryKeyInfo,
	UniqueInfo,
} from "@monorepo/pg/introspection/schema.js";
import type { ForeignKeyIntrospection } from "@monorepo/pg/introspection/table.js";
import type { TriggerInfo } from "@monorepo/pg/introspection/trigger.js";
import { dumpDatabaseWithoutMigrationTables } from "@monorepo/programs/database/dump-database.js";
import {
	createSchema,
	type ImportedSchema,
} from "@monorepo/programs/import-schemas/create-schemas.js";
import {
	checkConstraintDefinition,
	foreignKeyDefinition,
	indexDefinition,
	primaryKeyDefinition,
	triggerDefinition,
	uniqueConstraintDefinition,
} from "@monorepo/programs/import-schemas/definitions.js";
import {
	AppEnvironment,
	appEnvironment,
	type AppEnv,
} from "@monorepo/state/app-environment.js";
import { PackageNameState } from "@monorepo/state/package-name.js";
import { createFile } from "@monorepo/utils/create-file.js";
import { dateStringWithMilliseconds } from "@monorepo/utils/date-string.js";
import { camelCase, constantCase } from "case-anything";
import { Effect, Ref } from "effect";
import { succeed } from "effect/Effect";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { Kysely, PostgresDialect } from "kysely";
import { cwd } from "node:process";
import nunjucks from "nunjucks";
import path from "path";
import pg from "pg";
import pgConnectionString from "pg-connection-string";
import color from "picocolors";

export const importSchema = Effect.gen(function* () {
	const { introspection, databaseName, connectionString, extensions } =
		yield* introspectCustomRemote;

	const extensionNames = Object.keys(extensions);
	const dbSchema: ImportedSchema = {
		enums: databaseEnums(introspection.enums),
		tables: [],
		extensions:
			extensionNames.length > 0 ? databaseExtensions(extensionNames) : [],
	};

	const tableOrderIndex = introspection.tablePriorities.reverse().reduce(
		(acc, name, index) => {
			acc[name] = index;
			return acc;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{} as Record<string, any>,
	);

	const primaryKeys = introspection.primaryKey;
	for (const tableName in introspection.table) {
		const introspectedTable =
			introspection.table[tableName as keyof typeof introspection.table]!;
		dbSchema.tables.push([
			tableName,
			{
				columns: introspectedTable.columns,
				primaryKey: tablePrimaryKey(tableName, primaryKeys),
				foreignKeys: tableForeignKeys(
					tableName,
					introspection.foreignKeyDefinitions ?? {},
				),
				uniqueConstraints: tableUniqueConstraints(
					tableName,
					introspection.uniqueConstraints ?? {},
				),
				checkConstraints: tableCheckConstraints(
					tableName,
					introspection.checkConstraints ?? {},
				),
				indexes: tableIndexes(tableName, introspection.index ?? {}),
				triggers: tableTriggers(tableName, introspection.triggers ?? {}),
			},
		]);
	}

	dbSchema.tables.sort((a, b) => {
		const indexA = introspection.tablePriorities.includes(a[0])
			? tableOrderIndex[a[0]]
			: -dbSchema.tables.length;
		const indexB = introspection.tablePriorities.includes(b[0])
			? tableOrderIndex[b[0]]
			: -dbSchema.tables.length;
		return indexA - indexB;
	});

	const env = yield* appEnvironment;

	const schemaImport = createSchema(databaseName, dbSchema, env.databases);

	p.log.success(
		`${color.green(`Successfully imported ${databaseName} schema`)}`,
	);
	p.log.message(`Schema file: ./${schemaImport.schema.path}`);
	p.log.message(
		`Configuration ${schemaImport.configuration.name} added to ./${schemaImport.configuration.path}`,
	);

	yield* generateFirstMigration(
		schemaImport.configuration.name,
		connectionString,
	);
	return yield* Effect.succeed(true);
});

function dumpDatabase(configurationName: string, connectionString: string) {
	return Effect.gen(function* () {
		mkdirSync(migrationsFolder(configurationName), { recursive: true });

		const dumpEnv: AppEnv = {
			currentDatabase: new PgDatabase({ id: "default", schemas: [] }),
			databases: (yield* appEnvironment).databases,
		};

		process.env[`${constantCase(configurationName)}_DATABASE_URL`] =
			connectionString;
		const state = yield* AppEnvironment;
		yield* Ref.update(state, () => dumpEnv);
		return yield* dumpDatabaseWithoutMigrationTables;
	});
}

function tablePrimaryKey(tableName: string, primaryKeys: PrimaryKeyInfo) {
	const tablePrimaryKey = primaryKeys[tableName] || {};
	if (
		Object.keys(tablePrimaryKey).length === 0 ||
		Object.keys(tablePrimaryKey).length > 1
	) {
		return undefined;
	}
	return primaryKeyDefinition(Object.values(tablePrimaryKey).at(0)!);
}

function tableForeignKeys(
	tableName: string,
	foreignKeys: Record<string, Record<string, ForeignKeyIntrospection>>,
) {
	const tableForeignKeys = foreignKeys[tableName] || {};
	if (Object.keys(tableForeignKeys).length === 0) {
		return [];
	}
	const definitions = Object.values(tableForeignKeys);
	return definitions.map((definition) => foreignKeyDefinition(definition));
}

function tableUniqueConstraints(
	tableName: string,
	uniqueConstraints: UniqueInfo,
) {
	const tableUniqueConstraints = uniqueConstraints[tableName] || {};
	if (Object.keys(tableUniqueConstraints).length === 0) {
		return [];
	}
	const definitions = Object.values(tableUniqueConstraints);
	return definitions.map((definition) =>
		uniqueConstraintDefinition(definition),
	);
}

function tableCheckConstraints(tableName: string, checkConstraints: CheckInfo) {
	const tableCheckConstraints = checkConstraints[tableName] || {};
	if (Object.keys(tableCheckConstraints).length === 0) {
		return [];
	}
	return Object.entries(tableCheckConstraints).reduce(
		(acc, [checkName, definition]) => {
			acc.push(checkConstraintDefinition(checkName, definition));
			return acc;
		},
		[] as string[],
	);
}

function tableIndexes(tableName: string, indexes: IndexInfo) {
	const tableIndexes = indexes[tableName] || {};
	if (Object.keys(tableIndexes).length === 0) {
		return [];
	}
	return Object.entries(tableIndexes).reduce((acc, [indexName, definition]) => {
		acc.push(indexDefinition(indexName, definition));
		return acc;
	}, [] as string[]);
}

function tableTriggers(tableName: string, triggers: TriggerInfo) {
	const tableTriggers = triggers[tableName] || {};
	if (Object.keys(tableTriggers).length === 0) {
		return [];
	}
	return Object.entries(tableTriggers).reduce(
		(acc, [indexName, definition]) => {
			acc.push(triggerDefinition(indexName, definition));
			return acc;
		},
		[] as string[],
	);
}

function databaseExtensions(extensions: string[]) {
	return extensions.map((extension) => `extension("${extension}")`);
}

function databaseEnums(enums: EnumInfo) {
	return Object.entries(enums).reduce(
		(acc, [enumName, enumValues]) => {
			acc.push({
				name: camelCase(enumName),
				definition: `enumType("${enumName}", [${enumValues
					.split(",")
					.map((value) => `"${value.trimStart().trimEnd()}"`)
					.join(", ")}])`,
			});
			return acc;
		},
		[] as { name: string; definition: string }[],
	);
}

const promptConnectionString = Effect.tryPromise(async () => {
	const connection = await p.group(
		{
			string: () =>
				p.text({
					message: "Enter the connection sring for the database",
					placeholder: "postgresql://username:password@host:post/database",
					validate: (value) => {
						if (value === "") return "Please enter a connection string.";
					},
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);
	return connection.string;
});

const promptSchemaSelection = Effect.tryPromise(async () => {
	const schema = await p.group(
		{
			name: () =>
				p.text({
					message: "Schema name to import",
					defaultValue: "public",
					placeholder: "public",
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);
	return schema.name;
});

const introspectCustomRemote = Effect.gen(function* () {
	const connectionString = yield* promptConnectionString;
	const config = pgConnectionString.parse(connectionString);
	const schemaName = yield* promptSchemaSelection;

	const kysely = yield* kyselyWithConnectionString(connectionString);

	const builderContext: BuilderContext = {
		camelCase: false,
		tablesToRename: [],
		columnsToRename: {},
		schemaName,
		external: true,
	};

	const introspection = yield* Effect.tryPromise(() =>
		introspectRemoteSchema(kysely, schemaName, builderContext),
	);

	const extensions = yield* Effect.tryPromise(() =>
		dbExtensionInfo(kysely as Kysely<InformationSchemaDB>),
	);

	return {
		schemaName,
		introspection,
		databaseName: config.database!,
		connectionString,
		extensions,
	};
});

function kyselyWithConnectionString(connection_string: string) {
	const pgPool = new pg.Pool({ connectionString: connection_string });
	const kysely = new Kysely({
		dialect: new PostgresDialect({ pool: pgPool }),
	});
	return succeed(kysely);
}

function generateFirstMigration(
	configurationName: string,
	connectionString: string,
) {
	return Effect.gen(function* () {
		const dumpPath = yield* dumpDatabase(configurationName, connectionString);
		const name = `${dateStringWithMilliseconds()}-initial-structure`;

		const folder = migrationsFolder(configurationName);
		const migrationPath = path.join(folder, `${name}.ts`);
		const initialStructurePath = path.join(folder, `${name}.sql`);
		renameSync(dumpPath, initialStructurePath);
		removeSelectConfigLine(initialStructurePath);
		rmSync(path.dirname(dumpPath), { recursive: true, force: true });
		const content = nunjucks.compile(migrationTemplate).render({
			name,
			initialStructurePath,
			packageName: (yield* PackageNameState.current).name,
		});
		createFile(migrationPath, content, true);
	});
}

function removeSelectConfigLine(filePath: string): void {
	const fileContent = readFileSync(filePath, "utf-8");
	const lineToRemove =
		"SELECT pg_catalog.set_config('search_path', '', false);";
	const cleanedContent = fileContent
		.split("\n")
		.filter((line) => line.trim() !== lineToRemove)
		.join("\n");
	writeFileSync(filePath, cleanedContent, "utf-8");
}

const migrationTemplate = `import { Kysely, sql } from "kysely";
import { readFileSync } from "fs";
import { type Migration } from "{{ packageName }}/migration";

export const migration: Migration = {
  name: "{{ name }}",
	transaction: true,
	scaffold: false,
};

export async function up(db: Kysely<any>): Promise<void> {
	if (process.env.SKIP_STRUCTURE_LOAD === "true") {
    return;
  } else {
    const initialStructure = readFileSync(
      "{{ initialStructurePath }}",
      "utf-8",
    );
    await sql.raw(initialStructure).execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
}`;

function migrationsFolder(configurationName: string) {
	return path.join(cwd(), "monolayer", "migrations", configurationName);
}
