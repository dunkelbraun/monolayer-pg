import { PartialOnUndefinedDeep } from "type-fest";
import { PgColumn } from "./columns.js";

type ColumnRecord = Record<string, PgColumn>;

export type TableSchema = {
	columns: ColumnRecord;
};

type InferTableSelect<T extends ColumnRecord> = PartialOnUndefinedDeep<{
	[K in keyof T]: T[K] extends {
		_selectType: infer O;
		isNullable: infer N;
	}
		? N extends true
			? O | undefined
			: O
		: T[K] extends { _selectType: infer O }
		  ? O | undefined
		  : never;
}>;

type InferTableInsert<T extends ColumnRecord> = PartialOnUndefinedDeep<{
	[K in keyof T]: T[K] extends {
		_insertType: infer O;
		isNullable: infer N;
	}
		? N extends true
			? O | undefined
			: O
		: T[K] extends { _insertType: infer O }
		  ? O | undefined
		  : never;
}>;

export type pgTable<T extends string, C extends TableSchema> = {
	name: T;
	columns: C["columns"];
	inferSelect: InferTableSelect<C["columns"]>;
	inferInsert: InferTableInsert<C["columns"]>;
};

export function pgTable<T extends string, C extends TableSchema>(
	name: T,
	columns: C,
) {
	const table = <pgTable<T, C>>{ name: name, columns: columns.columns };
	return table;
}