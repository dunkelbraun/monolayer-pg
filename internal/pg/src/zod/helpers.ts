import { z } from "zod";
import type { TableColumn } from "~pg/schema/column.js";
import type { PgColumnBase } from "~pg/schema/column/column.js";
import type { ColumnInfo } from "~pg/schema/column/types.js";

type ColumnData = {
	info: ColumnInfo;
	_primaryKey: boolean;
};

export function columnData(column: PgColumnBase<unknown, unknown, unknown>) {
	const data = Object.fromEntries(Object.entries(column)) as ColumnData;
	return data;
}

export function customIssue(ctx: z.RefinementCtx, message: string) {
	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message,
	});
	return z.NEVER;
}

export function nullableColumn<T extends TableColumn>(column: T) {
	const data = columnData(column);
	return !data._primaryKey && data.info.isNullable === true;
}
