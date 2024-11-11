import {
	type ComparisonOperatorExpression,
	type Expression,
	type ExpressionBuilder,
	type IndexType,
	type SqlBool,
} from "kysely";

export type IndexOptions = {
	ifNotExists: boolean;
	unique: boolean;
	nullsNotDistinct: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	expression: Expression<any> | undefined;
	using: IndexType | string | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	where: any[];
	columns: string[];
};

/**
 * @group Classes, Types, and Interfaces
 * @category Classes
 */
export class PgIndex<T extends string | (string & Record<string, never>)> {
	/**
	 * @hidden
	 */
	protected isExternal: boolean;

	/**
	 * @hidden
	 */
	protected options: IndexOptions;

	/**
	 * @hidden
	 */
	constructor(
		/**
		 * @hidden
		 */
		protected columns?: T[],
	) {
		this.isExternal = false;
		this.options = {
			ifNotExists: false,
			unique: false,
			nullsNotDistinct: false,
			expression: undefined,
			using: undefined,
			where: [],
			columns: this.columns || [],
		};
	}

	ifNotExists() {
		this.options.ifNotExists = true;
		return this;
	}

	unique() {
		this.options.unique = true;
		return this;
	}

	nullsNotDistinct() {
		this.options.nullsNotDistinct = true;
		return this;
	}

	expression(expression: Expression<SqlBool>) {
		this.options.expression = expression;
		return this;
	}

	using(indexType: IndexType | string) {
		this.options.using = indexType;
		return this;
	}

	where(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		lhs: T | Expression<any>,
		op: ComparisonOperatorExpression,
		rhs: unknown,
	): this;
	where(
		factory: (
			qb: ExpressionBuilder<
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				ShallowRecord<string, ShallowRecord<any & string, any>>,
				string
			>,
		) => Expression<SqlBool>,
	): this;
	where(expression: Expression<SqlBool>): this;

	where(...args: unknown[]) {
		this.options.where.push(args);
		return this;
	}

	external() {
		this.isExternal = true;
		return this;
	}
}

/**
 * @group Schema Definition
 * @category Indexes and Constraints
 */
export function index<T extends string | (string & Record<string, never>)>(
	columns?: T[],
) {
	return new PgIndex(columns);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function indexOptions<T extends PgIndex<any>>(index: T) {
	assertIndexWithInfo(index);
	return index.options;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isExternalIndex<T extends PgIndex<any>>(index: T) {
	assertIndexWithInfo(index);
	return index.isExternal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertIndexWithInfo<T extends PgIndex<any>>(
	val: T,
): asserts val is T & { options: IndexOptions; isExternal: boolean } {
	return;
}

type DrainOuterGeneric<T> = [T] extends [unknown] ? T : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShallowRecord<K extends keyof any, T> = DrainOuterGeneric<{
	[P in K]: T;
}>;

/**
 * @group Schema Definition
 * @category Unmanaged
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mappedIndex(name: string, definition: Expression<any>) {
	return new PgMappedIndex(name, definition);
}

/**
 * @group Classes, Types, and Interfaces
 * @category Classes
 */
export class PgMappedIndex {
	constructor(
		public name: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		protected expression: Expression<any>,
	) {}
}
