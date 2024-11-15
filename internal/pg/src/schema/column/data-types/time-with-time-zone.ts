import { PgColumn } from "~pg/schema/column/column.js";
import type { DateTimePrecision } from "~pg/schema/column/types.js";

/**
 * Column that stores times of day (no date) with time zone.
 * @param precision - Number of fractional digits retained in the seconds field. The allowed range is from 0 to 6.
 * @remarks
 * Without `precision` specified, there is no explicit bound on precision.
 *
 * **Kysely database schema type definition**
 * ```ts
 * {
 *   readonly __select__: string | null;
 *   readonly __insert__: string | null | undefined;
 *   readonly __update__: string | null;
 * };
 * ```
 * Nullability and optionality will change according to the column's constraints, generated values, and default data values.
 *
 * @example
 * ```ts
 * import { schema, table, timeWithTimeZone } from "@monolayer/pg/schema";
 * import { zodSchema } from "@monolayer/pg/zod";
 *
 * const dbSchema = schema({
 *   tables: {
 *     example: table({
 *       columns: {
 *         start: timeWithTimeZone(),
 *       },
 *     }),
 *   },
 * });
 *
 * // Kysely database schema type
 * type DB = typeof dbSchema.infer;
 * // Zod Schema
 * const schema = zodSchema(database.tables.example);
 * ```
 * @see
 * {@link https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME | time with time zone} (*PostgreSQL Docs*)
 *
 * @group Schema Definition
 * @category Column Types
 */
export function timeWithTimeZone(precision?: DateTimePrecision) {
	return new PgTimeWithTimeZone(precision);
}

/**
 * Column that stores times of day (no date) with time zone.
 * @param precision - Number of fractional digits retained in the seconds field. The allowed range is from 0 to 6.
 * @remarks
 * Without `precision` specified, there is no explicit bound on precision.
 *
 * **Kysely database schema type definition**
 * ```ts
 * {
 *   readonly __select__: string | null;
 *   readonly __insert__: string | null | undefined;
 *   readonly __update__: string | null;
 * };
 * ```
 * Nullability and optionality will change according to the column's constraints, generated values, and default data values.
 *
 * **Zod Schema**
 *
 * *Types:*
 * ```ts
 * {
 *   input?:  string | null | undefined;
 *   output?: string | null | undefined;
 * }
 * ```
 * Nullability and optionality will change according to the column's constraints, generated values, and default data values.
 *
 * *Validations:*
 * - Explicit `undefined` values are rejected.
 * - Input value must be `string`, or `null`.
 * - Non-values must be a valid string that matches a time format.
 * @example
 * ```ts
 * import { schema, table, timetz } from "@monolayer/pg/schema";
 * import { zodSchema } from "@monolayer/pg/zod";
 *
 * const dbSchema = schema({
 *   tables: {
 *     example: table({
 *       columns: {
 *         start: timetz(),
 *       },
 *     }),
 *   },
 * });
 *
 * // Kysely database schema type
 * type DB = typeof dbSchema.infer;
 * // Zod Schema
 * const schema = zodSchema(database.tables.example);
 * ```
 * @see
 * {@link https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME | time with time zone} (*PostgreSQL Docs*)
 *
 * @group Schema Definition
 * @category Column Types
 */
export function timetz(precision?: DateTimePrecision) {
	return timeWithTimeZone(precision);
}

/**
 * @group Classes, Types, and Interfaces
 * @category Classes
 */
export class PgTimeWithTimeZone extends PgColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor(precision?: DateTimePrecision) {
		if (precision !== undefined) {
			super(`time(${precision}) with time zone`, `time with time zone`);
			this.info.datetimePrecision = precision;
		} else {
			super("time with time zone", `time with time zone`);
		}
	}
}
