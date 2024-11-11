import { hashValue } from "@monorepo/utils/hash-value.js";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { toSnakeCase } from "~pg/helpers/to-snake-case.js";
import { previousColumnName } from "~pg/introspection/column-name.js";
import type { BuilderContext } from "~pg/introspection/introspection/foreign-key-builder.js";
import type { InformationSchemaDB } from "~pg/introspection/introspection/types.js";
import type { ColumnsToRename, UniqueInfo } from "~pg/introspection/schema.js";
import { tableInfo } from "~pg/introspection/table.js";
import { type AnySchema, Schema } from "~pg/schema/schema.js";
import {
	type AnyPgUnique,
	isExternalUnique,
	type PgUnique,
	uniqueConstraintOptions,
} from "~pg/schema/unique.js";

export type UniqueConstraintInfo = {
	constraintType: "UNIQUE";
	table: string;
	columns: string[];
	nullsDistinct: boolean;
};

export async function dbUniqueConstraintInfo(
	kysely: Kysely<InformationSchemaDB>,
	databaseSchema: string,
	tableNames: string[],
	builderContext: BuilderContext,
) {
	if (tableNames.length === 0) {
		return {};
	}
	const serverVersion = await sql<{
		server_version: number;
	}>`select current_setting('server_version_num')::int / 10000 as server_version`.execute(
		kysely,
	);
	let results: {
		constraintType: "UNIQUE";
		table: string;
		name: string;
		columns: string[];
		nullsDistinct: boolean;
	}[] = [];
	if (serverVersion.rows[0]!.server_version > 14) {
		results = await kysely
			.selectFrom("pg_constraint")
			.fullJoin("pg_namespace", (join) =>
				join
					.onRef("pg_namespace.oid", "=", "pg_constraint.connamespace")
					.on("pg_namespace.nspname", "=", databaseSchema),
			)
			.fullJoin("pg_class", (join) =>
				join
					.onRef("pg_class.oid", "=", "pg_constraint.conrelid")
					.on("pg_namespace.nspname", "=", databaseSchema),
			)
			.fullJoin("pg_attribute", (join) =>
				join
					.onRef("pg_attribute.attrelid", "=", "pg_class.oid")
					.on("pg_attribute.attnum", "=", sql`ANY(pg_constraint.conkey)`),
			)
			.fullJoin("information_schema.table_constraints", (join) =>
				join
					.onRef(
						"information_schema.table_constraints.constraint_name",
						"=",
						"pg_constraint.conname",
					)
					.onRef(
						"information_schema.table_constraints.table_schema",
						"=",
						"pg_namespace.nspname",
					)
					.onRef(
						"information_schema.table_constraints.table_name",
						"=",
						"pg_class.relname",
					),
			)
			.select([
				sql<"UNIQUE">`'UNIQUE'`.as("constraintType"),
				sql<string>`pg_class.relname`.as("table"),
				sql<string>`pg_constraint.conname`.as("name"),
				sql<string[]>`json_agg(pg_attribute.attname)`.as("columns"),
			])
			.select((eb) => [
				eb
					.case()
					.when(
						sql`information_schema.table_constraints.nulls_distinct = 'YES'`,
					)
					.then(true)
					.else(false)
					.end()
					.as("nullsDistinct"),
			])
			.where("pg_constraint.contype", "=", "u")
			.where(
				"pg_constraint.conname",
				"~",
				builderContext.external ? "" : "monolayer_key$",
			)
			.where("pg_namespace.nspname", "=", databaseSchema)
			.where("pg_class.relname", "in", tableNames)
			.groupBy([
				"table",
				"information_schema.table_constraints.nulls_distinct",
				"pg_constraint.conname",
			])
			.execute();
	} else {
		results = await kysely
			.selectFrom("pg_constraint")
			.fullJoin("pg_namespace", (join) =>
				join
					.onRef("pg_namespace.oid", "=", "pg_constraint.connamespace")
					.on("pg_namespace.nspname", "=", databaseSchema),
			)
			.fullJoin("pg_class", (join) =>
				join
					.onRef("pg_class.oid", "=", "pg_constraint.conrelid")
					.on("pg_namespace.nspname", "=", databaseSchema),
			)
			.fullJoin("pg_attribute", (join) =>
				join
					.onRef("pg_attribute.attrelid", "=", "pg_class.oid")
					.on("pg_attribute.attnum", "=", sql`ANY(pg_constraint.conkey)`),
			)
			.fullJoin("information_schema.table_constraints", (join) =>
				join
					.onRef(
						"information_schema.table_constraints.constraint_name",
						"=",
						"pg_constraint.conname",
					)
					.onRef(
						"information_schema.table_constraints.table_schema",
						"=",
						"pg_namespace.nspname",
					)
					.onRef(
						"information_schema.table_constraints.table_name",
						"=",
						"pg_class.relname",
					),
			)
			.select([
				sql<"UNIQUE">`'UNIQUE'`.as("constraintType"),
				sql<string>`pg_class.relname`.as("table"),
				sql<string>`pg_constraint.conname`.as("name"),
				sql<string[]>`json_agg(pg_attribute.attname)`.as("columns"),
				sql<boolean>`true`.as("nullsDistinct"),
			])
			.where("pg_constraint.contype", "=", "u")
			.where(
				"pg_constraint.conname",
				"~",
				builderContext.external ? "" : "monolayer_key$",
			)
			.where("pg_namespace.nspname", "=", databaseSchema)
			.where("pg_class.relname", "in", tableNames)
			.groupBy(["table", "pg_constraint.conname"])
			.execute();
	}

	const transformedResults = results.reduce<UniqueInfo>((acc, result) => {
		const constraintInfo = {
			[hashValue(`${result.nullsDistinct}_${result.columns.sort().join("_")}`)]:
				uniqueConstraintInfoToQuery(result),
		};

		const table = result.table;
		acc[table] = {
			...acc[table],
			...constraintInfo,
		};
		return acc;
	}, {});
	return transformedResults;
}

export function localUniqueConstraintInfo(
	schema: AnySchema,
	camelCase: boolean,
	columnsToRename: ColumnsToRename,
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const kysely = new Kysely<any>({
		dialect: new PostgresDialect({
			pool: new pg.Pool({}),
		}),
	});
	const schemaInfo = Schema.info(schema);
	const tables = schemaInfo.tables;
	return Object.entries(tables || {}).reduce<UniqueInfo>(
		(acc, [tableName, tableDefinition]) => {
			const transformedTableName = toSnakeCase(tableName, camelCase);
			const uniqueConstraints = tableInfo(tableDefinition).definition
				.constraints?.unique as AnyPgUnique[];
			if (uniqueConstraints !== undefined) {
				for (const uniqueConstraint of uniqueConstraints) {
					if (isExternalUnique(uniqueConstraint)) {
						return acc;
					}
					const unique = uniqueToInfo(
						uniqueConstraint,
						transformedTableName,
						kysely,
						camelCase,
						columnsToRename,
						schemaInfo.name,
					);
					acc[transformedTableName] = {
						...acc[transformedTableName],
						...unique,
					};
				}
			}
			return acc;
		},
		{},
	);
}

export function uniqueToInfo(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	unique: PgUnique<any>,
	tableName: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kysely: Kysely<any>,
	camelCase: boolean,
	columnsToRename: ColumnsToRename,
	schemaName: string,
) {
	const args = uniqueConstraintOptions(unique);
	const newTableName = toSnakeCase(tableName, camelCase);
	const hashColumns = args.columns
		.sort()
		.map((column) =>
			toSnakeCase(
				previousColumnName(
					tableName,
					schemaName,
					toSnakeCase(column, camelCase),
					columnsToRename,
				),
				camelCase,
			),
		);
	const columns = args.columns
		.sort()
		.map((column) => toSnakeCase(column, camelCase));
	const hash = hashValue(
		`${args.nullsDistinct}_${hashColumns.sort().join("_")}`,
	);
	const kyselyBuilder = kysely.schema
		.alterTable(newTableName)
		.addUniqueConstraint(hash, columns, (uc) => {
			if (args.nullsDistinct === false) {
				return uc.nullsNotDistinct();
			}
			return uc;
		});

	let compiledQuery = kyselyBuilder.compile().sql;

	compiledQuery = compiledQuery
		.replace(/alter table "\w+" add constraint /, "")
		.replace(`"${hash}" `, "");

	if (args.nullsDistinct) {
		compiledQuery = compiledQuery.replace("unique", "UNIQUE NULLS DISTINCT");
	} else {
		compiledQuery = compiledQuery.replace(
			"unique nulls not distinct",
			"UNIQUE NULLS NOT DISTINCT",
		);
	}

	return {
		[hash]: compiledQuery,
	};
}

export function uniqueConstraintInfoToQuery(info: UniqueConstraintInfo) {
	return [
		"UNIQUE",
		info.nullsDistinct ? "NULLS DISTINCT" : "NULLS NOT DISTINCT",
		`(${info.columns
			.sort()
			.map((col) => `"${col}"`)
			.join(", ")})`,
	].join(" ");
}

export function uniqueConstraintDefinitionFromString(
	unique: string,
	tableName: string,
	hashValue: string,
) {
	const [, columns] = unique.split("DISTINCT (");

	const definition = {
		name: `${tableName}_${hashValue}_monolayer_key`,
		distinct: unique.includes("UNIQUE NULLS DISTINCT"),
		columns: columns?.replace(/"/g, "").split(")")[0]?.split(", ") || [],
	};
	return definition;
}
