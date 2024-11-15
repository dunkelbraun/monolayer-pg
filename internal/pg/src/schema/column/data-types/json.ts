import type { Expression } from "kysely";
import { compileDefaultExpression } from "~pg/helpers/compile-default-expression.js";
import {
	isExpression,
	PgColumn,
	valueWithHash,
} from "~pg/schema/column/column.js";
import type { JsonValue, WithDefaultColumn } from "~pg/schema/column/types.js";

/**
 * Column that stores JSON data.
 *
 * @remarks
 * Data stored is an exact copy of the input text and processing functions must reparse on each execution.
 *
 * Does not support indexing.
 *
 * **Kysely database schema type definition**
 * ```ts
 * type JsonArray = JsonValue[];
 * type JsonValue = boolean | number | string | Record<string, any> | JsonArray;
 * {
 *   readonly __select__: JsonValue | null;
 *   readonly __insert__: JsonValue | null | undefined;
 *   readonly __update__: JsonValue | null;
 * };
 * ```
 *
 * Nullability and optionality will change according to the column's constraints, generated values, and default data values.
 *
 * You can customize the data type of the column by providing a type argument to the `json` function.
 *
 * **Warning**: the Zod schema for a `json` column only validates that data can be conforms to the `JsonValue` type.
 * When using a custom data type you shoud adapt it. See examples.
 *
 * @example
 *
 * *Default Data Type*
 * ```ts
 * import { json, schema, table } from "@monolayer/pg/schema";
 * import { zodSchema } from "@monolayer/pg/zod";
 *
 * const dbSchema = schema({
 *   tables: {
 *     example: table({
 *       columns: {
 *         document: json(),
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
 *
 * *Custom Data Example*
 * ```ts
 * import { json, schema, table } from "@monolayer/pg/schema";
 * import { zodSchema } from "@monolayer/pg/zod";
 *
 * type Data = { count: number; name: string  };
 *
 * const dbSchema = schema({
 *   tables: {
 *     example: table({
 *       columns: {
 *         info: json<Data>(),
 *       },
 *     }),
 *   },
 * });
 *
 * // Kysely database schema type
 * type DB = typeof dbSchema.infer;
 *
 * // Zod Schema
 * const schemaShape = zodSchema(database.tables.example).shape;
 * const schema = z.object({
 *   ...schemaShape,
 *   info: schemaShape.id.superRefine((data, ctx) => {
 *     const objectKeys = Object.keys(data).sort();
 *     if (
 *       objectKeys.length !== 2 ||
 *       objectKeys[0] !== "count" ||
 *       typeof objectKeys[0] !== "number" ||
 *       objectKeys[1] !== "name"
 *       typeof objectKeys[1] !== "string" ||
 *     ) {
 *       ctx.addIssue({
 *         code: z.ZodIssueCode.custom,
 *         message: "Invalid data",
 *       });
 *     }
 *     return z.NEVER;
 *   }),
 * });
 * ```
 *
 * @see
 * *PostgreSQL Docs*: {@link https://www.postgresql.org/docs/current/datatype-json.html#DATATYPE-JSON | json}
 *
 * @group Schema Definition
 * @category Column Types
 */
export function json<T extends JsonValue = JsonValue>() {
	return new PgJson<T, T>();
}

/**
 * @group Classes, Types, and Interfaces
 * @category Classes
 */
export class PgJson<S extends JsonValue = JsonValue, I = S> extends PgColumn<
	S,
	I
> {
	/**
	 * @hidden
	 */
	protected declare readonly __select__: S;
	/**
	 * @hidden
	 */
	protected declare readonly __insert__: S;

	/**
	 * @hidden
	 */
	constructor() {
		super("json", "json");
	}

	default(value: I | Expression<unknown>) {
		if (isExpression(value)) {
			this.info.defaultValue = valueWithHash(compileDefaultExpression(value));
			this.info.volatileDefault = "yes";
		} else {
			if (typeof value === "string") {
				this.info.defaultValue = this.transformDefault(value);
			} else {
				this.info.defaultValue = this.transformDefault(
					JSON.stringify(value) as I,
				);
			}
			this.info.volatileDefault = "no";
		}
		return this as this & WithDefaultColumn;
	}
}
