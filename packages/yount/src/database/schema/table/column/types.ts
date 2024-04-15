import type { ColumnType, Simplify } from "kysely";

export type JsonArray = JsonValue[];

export type JsonValue =
	| boolean
	| number
	| string
	| Record<string, unknown>
	| JsonArray;

export type DateTimePrecision = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type OptionalColumnType<Select, Insert, Update> = Simplify<
	ColumnType<Select, Insert | undefined, Update>
>;

export type OptionalNullableColumnType<Select, Insert, Update> = Simplify<
	ColumnType<Select | null, Insert | null | undefined, Update | null>
>;

export type GeneratedColumnType<Select, Insert, Update> = OptionalColumnType<
	Select,
	Insert,
	Update
>;

export type WithDefaultColumn = {
	_hasDefault: true;
};

export type NonNullableColumn = { _nullable: false };

export type GeneratedColumn = {
	_generatedByDefault: true;
	_nullable: false;
};

export type GeneratedAlwaysColumn = {
	_generatedAlways: true;
};

export type ColumnInfo = {
	columnName: string | null;
	dataType: string;
	defaultValue: string | null;
	isNullable: boolean;
	originalIsNullable?: boolean | null;
	numericPrecision: number | null;
	numericScale: number | null;
	characterMaximumLength: number | null;
	datetimePrecision: number | null;
	renameFrom: string | null;
	identity: "ALWAYS" | "BY DEFAULT" | null;
	enum: boolean;
};