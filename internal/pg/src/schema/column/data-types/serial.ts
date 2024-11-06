import { SerialColumn } from "~pg/schema/column/column.js";

/**
 * Unique identifier column.
 * @remarks
 * Not a true native PostgreSQL data type. A `serial` column is a column that has:
 * - an `integer` data type.
 * - default values assigned from a sequence generator.
 * - a `NOT NULL` constraint.
 *
 * **Kysely database schema type definition**
 * ```ts
 * {
 *   readonly __select__: number;
 *   readonly __insert__: number | string | undefined;
 *   readonly __update__: number | string;
 * };
 * ```
 * @example
 * ```ts
 * import { schema, serial, table  } from "monolayer/pg";
 * import { zodSchema } from "monolayer/zod";
 *
 * const dbSchema = schema({
 *   tables: {
 *     example: table({
 *       columns: {
 *         id: serial(),
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
 * *PostgreSQL Docs*: {@link https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-SERIAL | serial }
 *
 * @group Schema Definition
 * @category Column Types
 */
export function serial() {
	return new PgSerial();
}
/**
 * @group Classes, Types, and Interfaces
 * @category Classes
 */
export class PgSerial extends SerialColumn<number, number | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("serial", "serial");
	}
}
