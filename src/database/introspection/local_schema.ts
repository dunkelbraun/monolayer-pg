import { createHash } from "crypto";
import {
	type CreateIndexBuilder,
	type Expression,
	Kysely,
	PostgresDialect,
	type RawBuilder,
	isExpression,
} from "kysely";
import pg from "pg";
import { pgDatabase } from "~/database/schema/pg_database.js";
import { type PgTable } from "~/database/schema/pg_table.js";
import {
	type ForeignKeyInfo,
	type MigrationSchema,
	type PrimaryKeyInfo,
	type TriggerInfo,
	type UniqueInfo,
	findColumn,
	findPrimaryKey,
} from "../migrations/migration_schema.js";
import { type ColumnInfo, PgColumnTypes, PgEnum } from "../schema/pg_column.js";
import type { PgIndex } from "../schema/pg_index.js";
import {
	foreignKeyConstraintInfoToQuery,
	primaryKeyConstraintInfoToQuery,
	uniqueConstraintInfoToQuery,
} from "./info_to_query.js";
import {
	ColumnsInfo,
	type EnumInfo,
	type ExtensionInfo,
	IndexInfo,
	TableColumnInfo,
} from "./types.js";

export function schemaColumnInfo(
	tableName: string,
	columnName: string,
	column: PgColumnTypes,
): ColumnInfo {
	const columnInfo: ColumnInfo = Object.fromEntries(
		Object.entries(column),
	).info;
	const meta = columnInfo;
	return {
		tableName: tableName,
		columnName: columnName,
		dataType: meta.dataType,
		characterMaximumLength: meta.characterMaximumLength,
		datetimePrecision: meta.datetimePrecision,
		isNullable: meta.isNullable,
		numericPrecision: meta.numericPrecision,
		numericScale: meta.numericScale,
		renameFrom: meta.renameFrom,
		defaultValue: meta.defaultValue
			? isExpression(meta.defaultValue)
				? compileDefaultExpression(meta.defaultValue)
				: meta.defaultValue.toString()
			: null,
		identity: meta.identity,
		enum: meta.enum,
	};
}

export function compileDefaultExpression(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	expression: Expression<any>,
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const kysely = new Kysely<any>({
		dialect: new PostgresDialect({
			pool: new pg.Pool({}),
		}),
	});

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const compiled = (expression as RawBuilder<any>).compile(kysely);
	return substituteSQLParameters({
		sql: compiled.sql,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		parameters: compiled.parameters as any[],
	});
}

function substituteSQLParameters(queryObject: {
	sql: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	parameters: any[];
}) {
	let { sql, parameters } = queryObject;

	// Replace each placeholder with the corresponding parameter from the array
	parameters.forEach((param, idx) => {
		// Create a regular expression for each placeholder (e.g., $1, $2)
		// Note: The backslash is escaped in the string, and '$' is escaped in the regex
		const regex = new RegExp(`\\$${idx + 1}`, "g");
		const value = typeof param === "object" ? JSON.stringify(param) : param;
		sql = sql.replace(regex, value);
	});

	return sql;
}

export function schemaDBColumnInfoByTable(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
	remoteSchema: MigrationSchema,
) {
	return Object.entries(schema.tables).reduce<TableColumnInfo>(
		(acc, [tableName, tableDefinition]) => {
			const columns = Object.entries(tableDefinition.columns);
			acc[tableName] = columns.reduce<ColumnsInfo>(
				(columnAcc, [columnName, column]) => {
					const columnInfo = schemaColumnInfo(
						tableName,
						columnName,
						column as PgColumnTypes,
					);
					let columnKey = columnName;
					const pKey = findPrimaryKey(remoteSchema, tableName);
					if (columnInfo.renameFrom !== null) {
						const appliedInRemote =
							findColumn(remoteSchema, tableName, columnName) !== null;
						const toApplyInRemote =
							findColumn(remoteSchema, tableName, columnInfo.renameFrom) !==
							null;
						if (appliedInRemote && pKey?.includes(columnName)) {
							columnInfo.isNullable = false;
						}
						if (appliedInRemote || toApplyInRemote) {
							if (toApplyInRemote) {
								columnKey = columnInfo.renameFrom;
								if (pKey?.includes(columnInfo.renameFrom)) {
									columnInfo.isNullable = false;
								}
							}
						}
						columnInfo.renameFrom = null;
					} else {
						if (pKey?.includes(columnName)) {
							columnInfo.isNullable = false;
						}
					}
					columnAcc[columnKey] = columnInfo;
					return columnAcc;
				},
				{},
			);
			return acc;
		},
		{},
	);
}

export function schemaDBIndexInfoByTable(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const kysely = new Kysely<any>({
		dialect: new PostgresDialect({
			pool: new pg.Pool({}),
		}),
	});

	return Object.entries(schema.tables).reduce<IndexInfo>(
		(acc, [tableName, tableDefinition]) => {
			const indexes = tableDefinition.indexes || [];
			for (const index of indexes) {
				const indexInfo = indexToInfo(index, tableName, kysely);
				acc[tableName] = {
					...acc[tableName],
					...indexInfo,
				};
			}
			return acc;
		},
		{},
	);
}

export function indexToInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	index: PgIndex<any>,
	tableName: string,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	kysely: Kysely<any>,
	schema = "public",
) {
	const indexName = `${tableName}_${index.columns.join("_")}_kntc_idx`;
	const kyselyBuilder = kysely.schema
		.createIndex(indexName)
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		.on(tableName) as CreateIndexBuilder<any> & {
		column: never;
		columns: never;
		ifNotExists: never;
	};

	const compiledQuery =
		index._builder !== undefined
			? index._builder(kyselyBuilder).columns(index.columns).compile().sql
			: kysely.schema
					.createIndex(indexName)
					.on(tableName)
					.columns(index.columns)
					.compile().sql;

	const hash = createHash("sha256");
	hash.update(compiledQuery);
	return {
		[indexName]: `${hash.digest("hex")}:${compiledQuery}`,
	};
}

export function localSchema(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
	remoteSchema: MigrationSchema,
): MigrationSchema {
	return {
		extensions: schemaDBExtensionsInfo(schema),
		table: schemaDBColumnInfoByTable(schema, remoteSchema),
		index: schemaDBIndexInfoByTable(schema),
		foreignKeyConstraints: foreignKeyConstraintInfo(schema),
		uniqueConstraints: uniqueConstraintInfo(schema),
		primaryKey: primaryKeyConstraintInfo(schema),
		triggers: {
			...schemaDBTriggersInfo(schema),
		},
		enums: schemaDbEnumInfo(schema),
	};
}

function schemaDBExtensionsInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return schema.extensions.reduce<ExtensionInfo>((acc, curr) => {
		acc[curr] = true;
		return acc;
	}, {});
}

function schemaDBTriggersInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return Object.entries(schema.tables).reduce<TriggerInfo>(
		(acc, [tableName, tableDefinition]) => {
			tableDefinition.triggers;
			for (const trigger of Object.entries(tableDefinition.triggers || {})) {
				const triggerName = `${trigger[0]}_trg`.toLowerCase();
				const hash = createHash("sha256");
				const compiledTrigger = trigger[1].compile(triggerName, tableName);
				hash.update(compiledTrigger);

				acc[tableName] = {
					...acc[tableName],
					[triggerName]: `${hash.digest("hex")}:${compiledTrigger}`,
				};
			}
			return acc;
		},
		{},
	);
}

export function schemaDbEnumInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return Object.entries(schema.tables).reduce<EnumInfo>(
		(enumInfo, [, tableDefinition]) => {
			const keys = Object.keys(tableDefinition.columns);
			for (const key of keys) {
				const column = tableDefinition.columns[key];
				if (column instanceof PgEnum) {
					const enumName = column.info.dataType;
					if (enumName !== null) {
						enumInfo[enumName] = (column.values as string[]).join(", ");
					}
				}
			}
			return enumInfo;
		},
		{},
	);
}

function primaryKeyConstraintInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return Object.entries(schema.tables).reduce<PrimaryKeyInfo>(
		(acc, [tableName, tableDefinition]) => {
			const primaryKey = tableDefinition.schema.primaryKey;
			if (primaryKey !== undefined) {
				const keyName = `${tableName}_${primaryKey.join("_")}_kinetic_pk`;
				acc[tableName] = {
					[keyName]: primaryKeyConstraintInfoToQuery({
						constraintType: "PRIMARY KEY",
						table: tableName,
						columns: primaryKey,
					}),
				};
			}
			return acc;
		},
		{},
	);
}

function foreignKeyConstraintInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return Object.entries(schema.tables).reduce<ForeignKeyInfo>(
		(acc, [tableName, tableDefinition]) => {
			const foreignKeys = tableDefinition.schema.foreignKeys;
			if (foreignKeys !== undefined) {
				for (const foreignKey of foreignKeys) {
					const keyName = `${tableName}_${foreignKey.columns.join("_")}_${
						foreignKey.targetTable.name
					}_${foreignKey.targetColumns.join("_")}_kinetic_fk`;
					acc[tableName] = {
						...acc[tableName],
						[keyName]: foreignKeyConstraintInfoToQuery({
							constraintType: "FOREIGN KEY",
							table: tableName,
							column: foreignKey.columns,
							targetTable: foreignKey.targetTable.name,
							targetColumns: foreignKey.targetColumns,
							deleteRule: foreignKey.options.deleteRule,
							updateRule: foreignKey.options.updateRule,
						}),
					};
				}
			}
			return acc;
		},
		{},
	);
}

function uniqueConstraintInfo(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	schema: pgDatabase<Record<string, PgTable<string, any, any>>>,
) {
	return Object.entries(schema.tables).reduce<UniqueInfo>(
		(acc, [tableName, tableDefinition]) => {
			const uniqueConstraints = tableDefinition.schema.uniqueConstraints;
			if (uniqueConstraints !== undefined) {
				for (const uniqueConstraint of uniqueConstraints) {
					const keyName = `${tableName}_${uniqueConstraint.columns.join(
						"_",
					)}_kinetic_key`;
					acc[tableName] = {
						...acc[tableName],
						[keyName]: uniqueConstraintInfoToQuery({
							constraintType: "UNIQUE",
							table: tableName,
							columns: uniqueConstraint.columns,
							nullsDistinct: uniqueConstraint.nullsDistinct,
						}),
					};
				}
			}
			return acc;
		},
		{},
	);
}
