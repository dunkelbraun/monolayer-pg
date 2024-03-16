import type { ForeignKeyRule } from "../introspection/foreign_key_constraint.js";
import type { AnyPgTable, PgTable } from "./pg_table.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForeignKeyOptions<T extends PgTable<any, any>> = {
	columns: string[];
	targetTable: T;
	targetColumns: string[];
	deleteRule: ForeignKeyRule;
	updateRule: ForeignKeyRule;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class PgForeignKey<T extends string, C extends AnyPgTable> {
	/**
	 * @hidden
	 */
	protected isExternal: boolean;

	/**
	 * @hidden
	 */
	protected options: ForeignKeyOptions<C>;

	/**
	 * @hidden
	 */
	constructor(
		/**
		 * @hidden
		 */
		protected columns: T[],
		targetTable: C,
		targetColumns: (keyof C)[],
	) {
		this.isExternal = false;
		this.options = {
			columns: this.columns,
			targetTable,
			targetColumns: targetColumns as string[],
			deleteRule: "NO ACTION",
			updateRule: "NO ACTION",
		};
	}

	deleteRule(rule: Lowercase<ForeignKeyRule>) {
		this.options.deleteRule = rule.toUpperCase() as ForeignKeyRule;
		return this;
	}

	updateRule(rule: Lowercase<ForeignKeyRule>) {
		this.options.updateRule = rule.toUpperCase() as ForeignKeyRule;
		return this;
	}

	external() {
		this.isExternal = true;
		return this;
	}
}

/**
 * @group Constraints
 */
export function foreignKey<T extends string, C extends AnyPgTable>(
	columns: T[],
	targetTable: C,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	targetColumns: C extends PgTable<infer U, any> ? (keyof U)[] : never,
) {
	return new PgForeignKey(columns, targetTable, targetColumns as (keyof C)[]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function foreignKeyOptions<T extends PgForeignKey<any, any>>(
	foreignKey: T,
) {
	assertForeignKeyWithInfo(foreignKey);
	return foreignKey.options;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isExternalForeignKey<T extends PgForeignKey<any, any>>(
	foreignKey: T,
) {
	assertForeignKeyWithInfo(foreignKey);
	return foreignKey.isExternal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertForeignKeyWithInfo<T extends PgForeignKey<any, any>>(
	val: T,
): asserts val is T & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	options: ForeignKeyOptions<PgTable<any, any>>;
	isExternal: boolean;
} {
	true;
}
