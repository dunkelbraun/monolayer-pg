import type {
	ColumnType,
	GeneratedAlways,
	InsertType,
	SelectType,
	Simplify,
} from "kysely";
import { z } from "zod";
import {
	GeneratedColumn,
	OptionalColumnType,
	PgColumn,
	WithDefaultColumn,
	type AnyPGColumn,
	type GeneratedAlwaysColumn,
	type GeneratedColumnType,
	type JsonValue,
	type NonNullableColumn,
	type PgBytea,
	type PgGeneratedColumn,
	type PgTimestamp,
	type PgTimestampTz,
} from "./pg_column.js";
import { ColumnRecord } from "./pg_table.js";

export type InferColumnTypes<
	T extends ColumnRecord,
	PK extends string,
> = Simplify<PrimaryKeyColumns<T, PK> & NonPrimaryKeyColumns<T, PK>>;

type PrimaryKeyColumns<
	T extends ColumnRecord,
	M extends string,
> = string extends M
	? // eslint-disable-next-line @typescript-eslint/ban-types
		{}
	: Pick<
			{
				[P in keyof T]: T[P] extends AnyPGColumn
					? InferColumType<T[P], true>
					: T[P] extends PgGeneratedColumn<infer S, infer U>
						? GeneratedColumnType<S, U, U>
						: never;
			},
			M
		>;

type NonPrimaryKeyColumns<
	T extends ColumnRecord,
	M extends string,
> = string extends M
	? {
			[P in keyof T]: T[P] extends AnyPGColumn
				? InferColumType<T[P], false>
				: T[P] extends PgGeneratedColumn<infer S, infer U>
					? GeneratedColumnType<S, U, U>
					: never;
		}
	: Omit<
			{
				[P in keyof T]: T[P] extends AnyPGColumn
					? InferColumType<T[P], false>
					: T[P] extends PgGeneratedColumn<infer S, infer U>
						? GeneratedColumnType<S, U, U>
						: never;
			},
			M
		>;

type InferColumType<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends PgColumn<any, any, any>,
	PK extends boolean,
> =
	T extends PgColumn<infer S, infer I, infer U>
		? T extends NonNullableColumn
			? T extends WithDefaultColumn
				? PK extends true
					? OptionalColumnType<
							NonNullable<S>,
							NonNullable<I> | undefined,
							NonNullable<U>
						>
					: OptionalColumnType<S, I, U>
				: T extends GeneratedAlwaysColumn
					? Simplify<GeneratedAlways<S>>
					: T extends GeneratedColumn
						? PK extends true
							? OptionalColumnType<
									NonNullable<S>,
									NonNullable<I> | undefined,
									NonNullable<U>
								>
							: OptionalColumnType<S, I, U>
						: PK extends true
							? Simplify<
									ColumnType<NonNullable<S>, NonNullable<I>, NonNullable<U>>
								>
							: Simplify<ColumnType<S, I, U>>
			: T extends WithDefaultColumn
				? PK extends true
					? Simplify<
							ColumnType<
								NonNullable<S>,
								NonNullable<I> | undefined,
								NonNullable<U>
							>
						>
					: Simplify<ColumnType<NonNullable<S>, I | null | undefined, U | null>>
				: T extends GeneratedAlwaysColumn
					? Simplify<GeneratedAlways<S>>
					: PK extends true
						? Simplify<
								ColumnType<NonNullable<S>, NonNullable<I>, NonNullable<U>>
							>
						: Simplify<ColumnType<S | null, I | null | undefined, U | null>>
		: never;

export type ZodSchemaObject<
	T extends ColumnRecord,
	PK extends string,
> = z.ZodObject<
	PrimaryKeyColumnsZodSchemaObject<T, PK> & NonPrimaryZodSchemaObject<T, PK>,
	"strip",
	z.ZodTypeAny
>;

type PrimaryKeyColumnsZodSchemaObject<
	T extends ColumnRecord,
	PK extends string,
> = string extends PK
	? // eslint-disable-next-line @typescript-eslint/ban-types
		{}
	: Pick<
			{
				[K in keyof T]: ZodType<T[K], true>;
			},
			PK
		>;

type NonPrimaryZodSchemaObject<
	T extends ColumnRecord,
	PK extends string,
> = string extends PK
	? {
			[K in keyof T]: ZodType<T[K], false>;
		}
	: Omit<
			{
				[K in keyof T]: ZodType<T[K], false>;
			},
			PK
		>;

export type ZodType<
	T extends
		| PgColumn<unknown, unknown, unknown>
		| PgGeneratedColumn<unknown, unknown>,
	PK extends boolean,
> = true extends PK ? NonNullableZodType<DefaultZodType<T>> : DefaultZodType<T>;

type DefaultZodType<
	T extends
		| PgColumn<unknown, unknown, unknown>
		| PgGeneratedColumn<unknown, unknown>,
> =
	T extends PgColumn<infer U, unknown, unknown>
		? T extends PgTimestamp | PgTimestampTz
			? DateZodType<T>
			: T extends PgBytea
				? ByteaZodType<T>
				: JsonValue extends U
					? JsonZodType<T>
					: PgColumnZodType<T>
		: z.ZodType<never, z.ZodTypeDef, never>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NonNullableZodType<T extends z.ZodType<any, any, any>> =
	T extends z.ZodType<infer Output, infer Def, infer Input>
		? z.ZodType<NonNullable<Output>, Def, NonNullable<Input>>
		: never;

type PgColumnZodType<T extends AnyPGColumn> = z.ZodType<
	T extends NonNullableColumn
		? SelectType<InferColumType<T, false>>
		: T extends GeneratedAlwaysColumn
			? never
			: SelectType<InferColumType<T, false>> | null | undefined,
	z.ZodTypeDef,
	InsertType<InferColumType<T, false>>
>;

type ByteaZodType<T extends AnyPGColumn> = z.ZodType<
	T extends NonNullableColumn
		? SelectType<InferColumType<T, false>> | string
		: T extends GeneratedAlwaysColumn
			? never
			: SelectType<InferColumType<T, false>> | string | undefined,
	z.ZodTypeDef,
	InsertType<InferColumType<T, false>>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodJson = string | number | boolean | Record<string, any>;

type JsonZodType<T extends AnyPGColumn> = z.ZodType<
	T extends NonNullableColumn
		? ZodJson
		: T extends GeneratedAlwaysColumn
			? never
			: ZodJson | null | undefined,
	z.ZodTypeDef,
	T extends NonNullableColumn ? ZodJson : ZodJson | null | undefined
>;
// T extends PgTimestamp | PgTimestampTz
type DateZodType<T extends AnyPGColumn> = z.ZodType<
	T extends NonNullableColumn
		? Date
		: T extends GeneratedAlwaysColumn
			? never
			: Date | null | undefined,
	z.ZodTypeDef,
	T extends NonNullableColumn ? Date | string : Date | string | null | undefined
>;
