import { z } from "zod";
import {
	type PgColumn,
	type SerialColumn,
} from "~/schema/table/column/column.js";
import { PgEnum } from "~/schema/table/column/data-types/enumerated.js";
import { baseSchema, finishSchema } from "../common.js";
import { nullableColumn } from "../helpers.js";

export function isEnum(
	column: PgColumn<unknown, unknown, unknown> | SerialColumn<unknown, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): column is PgEnum<any> {
	return column instanceof PgEnum;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pgEnumSchema(column: PgEnum<any>) {
	const isNullable = nullableColumn(column);
	const data = Object.fromEntries(Object.entries(column)) as {
		values: [string, ...string[]];
	};
	const enumValues = data.values as unknown as [string, ...string[]];
	const errorMessage = `Expected ${enumValues
		.map((v) => `'${v}'`)
		.join(" | ")}`;

	const base = baseSchema(isNullable, errorMessage).pipe(z.enum(enumValues));
	return finishSchema(isNullable, base);
}
