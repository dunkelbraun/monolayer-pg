import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { toSnakeCase } from "~/changeset/helpers.js";
import type { CamelCaseOptions } from "~/configuration.js";
import { Schema, type AnySchema } from "~/database/schema/schema.js";
import {
	indexOptions,
	isExternalIndex,
	type IndexOptions,
	type PgIndex,
} from "~/database/schema/table/index/index.js";
import { tableInfo } from "~/introspection/helpers.js";
import { hashValue } from "~/utils.js";
import type { InformationSchemaDB } from "../../../../introspection/types.js";

export async function dbIndexInfo(
	kysely: Kysely<InformationSchemaDB>,
	databaseSchema: string,
	tableNames: string[],
) {
	if (tableNames.length === 0) {
		return {};
	}

	const results = await kysely
		.selectFrom("pg_class")
		.innerJoin("pg_index", "pg_class.oid", "pg_index.indrelid")
		.innerJoin(
			"pg_class as pg_class_2",
			"pg_index.indexrelid",
			"pg_class_2.oid",
		)
		.leftJoin("pg_namespace", "pg_namespace.oid", "pg_class.relnamespace")
		.select([
			"pg_class.relname as table",
			"pg_class_2.relname as name",
			sql<string>`pg_get_indexdef(pg_index.indexrelid)`.as("definition"),
			sql<string>`obj_description(pg_index.indexrelid, 'pg_class')`.as(
				"comment",
			),
		])
		.distinct()
		.where("pg_class_2.relkind", "in", ["i", "I"])
		.where("pg_index.indisprimary", "=", false)
		.where("pg_class_2.relname", "~", "yount_idx$")
		.where("pg_class.relname", "in", tableNames)
		.where("pg_namespace.nspname", "=", databaseSchema)
		.orderBy("pg_class_2.relname")
		.execute();

	const indexInfo = results.reduce<IndexInfo>((acc, curr) => {
		const constraintHash = curr.name.match(/^\w+_(\w+)_yount_idx$/)![1];
		acc[curr.table] = {
			...acc[curr.table],
			...{
				[`${constraintHash}`]: curr.definition,
			},
		};
		return acc;
	}, {});
	return indexInfo;
}

export function localIndexInfoByTable(
	schema: AnySchema,
	camelCase: CamelCaseOptions = { enabled: false },
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const kysely = new Kysely<any>({
		dialect: new PostgresDialect({
			pool: new pg.Pool({}),
		}),
	});
	const dbInfo = Schema.info(schema);
	const tables = dbInfo.tables;
	return Object.entries(tables || {}).reduce<IndexInfo>(
		(acc, [tableName, tableDefinition]) => {
			const transformedTableName = toSnakeCase(tableName, camelCase);
			const indexes =
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				tableInfo(tableDefinition).schema.indexes || ([] as PgIndex<any>[]);
			for (const index of indexes) {
				if (isExternalIndex(index)) {
					return acc;
				}
				const indexInfo = indexToInfo(
					index,
					transformedTableName,
					kysely,
					camelCase,
					dbInfo.name || "public",
				);
				acc[transformedTableName] = {
					...acc[transformedTableName],
					...indexInfo,
				};
			}
			return acc;
		},
		{},
	);
}

export function indexToInfo(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	index: PgIndex<any>,
	tableName: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kysely: Kysely<any>,
	camelCase: CamelCaseOptions,
	schemaName = "public",
) {
	const indexCompileArgs = indexOptions(index);
	const transformedTableName = toSnakeCase(tableName, camelCase);
	const transformedColumnNames = indexCompileArgs.columns.map((column) =>
		toSnakeCase(column, camelCase),
	);

	const hash = hashValue(
		buildIndex(
			indexCompileArgs,
			"sample",
			transformedColumnNames,
			kysely,
			schemaName,
			"sample",
		).compile().sql,
	);

	const indexName = `${tableName}_${hash}_yount_idx`;

	const kyselyBuilder = buildIndex(
		indexCompileArgs,
		transformedTableName,
		transformedColumnNames,
		kysely,
		schemaName,
		indexName,
	);
	const compiledQuery = kyselyBuilder.compile().sql;

	return {
		[hash]: compiledQuery,
	};
}

function buildIndex(
	indexCompileArgs: IndexOptions,
	transformedTableName: string,
	transformedColumnNames: string[],
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kysely: Kysely<any>,
	schemaName = "public",
	indexName?: string,
) {
	if (indexName === undefined) {
		indexName = `${transformedColumnNames.join("_")}_yount_idx`;
	}

	let kyselyBuilder = kysely
		.withSchema(schemaName)
		.schema.createIndex(indexName)
		.on(transformedTableName)
		.columns(transformedColumnNames);

	if (indexCompileArgs.ifNotExists) {
		kyselyBuilder = kyselyBuilder.ifNotExists();
	}
	if (indexCompileArgs.unique) {
		kyselyBuilder = kyselyBuilder.unique();
	}
	if (indexCompileArgs.nullsNotDistinct) {
		kyselyBuilder = kyselyBuilder.nullsNotDistinct();
	}
	if (indexCompileArgs.expression !== undefined) {
		kyselyBuilder = kyselyBuilder.expression(indexCompileArgs.expression);
	}
	if (indexCompileArgs.using !== undefined) {
		kyselyBuilder = kyselyBuilder.using(indexCompileArgs.using);
	}
	if (indexCompileArgs.where !== undefined) {
		if (indexCompileArgs.where.length === 1) {
			kyselyBuilder = kyselyBuilder.where(indexCompileArgs.where[0]);
		}
		if (indexCompileArgs.where.length === 3) {
			kyselyBuilder = kyselyBuilder.where(
				indexCompileArgs.where[0],
				indexCompileArgs.where[1],
				indexCompileArgs.where[2],
			);
		}
	}
	return kyselyBuilder;
}
export type IndexInfo = Record<string, Record<string, string>>;
