import type { PgColumn, SerialColumn } from "~pg/schema/column/column.js";
import { PgTsquery } from "~pg/schema/column/data-types/tsquery.js";
import { PgTsvector } from "~pg/schema/column/data-types/tsvector.js";
import { finishSchema, stringSchema } from "~pg/schema/zod/common.js";
import { columnData } from "~pg/schema/zod/helpers.js";

export function tsvectorSchema(column: PgTsvector) {
	const data = columnData(column);
	const isNullable = !data._primaryKey && data.info.isNullable === true;
	const base = stringSchema("Expected string with tsvector format", isNullable);
	return finishSchema(isNullable, base);
}

export function tsquerySchema(column: PgTsquery) {
	const data = columnData(column);
	const isNullable = !data._primaryKey && data.info.isNullable === true;
	const base = stringSchema("Expected string with tsquery format", isNullable);
	return finishSchema(isNullable, base);
}

export function isTsvectorColumn(
	column: PgColumn<unknown, unknown, unknown> | SerialColumn<unknown, unknown>,
): column is PgTsvector {
	return column instanceof PgTsvector;
}

export function isTsQueryColumn(
	column: PgColumn<unknown, unknown, unknown> | SerialColumn<unknown, unknown>,
): column is PgTsquery {
	return column instanceof PgTsquery;
}
