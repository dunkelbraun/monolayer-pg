/* eslint-disable max-lines */
import { createHash } from "crypto";
import type { Simplify } from "kysely";
import { type ColumnType, type Expression } from "kysely";
import type { ShallowRecord } from "node_modules/kysely/dist/esm/util/type-utils.js";
import { compileDefaultExpression } from "~/introspection/schemas.js";

export type ColumnInfo = {
	columnName: string | null;
	tableName: string | null;
	dataType: string;
	defaultValue: string | null;
	isNullable: boolean;
	originalIsNullable?: boolean | null;
	numericPrecision: number | null;
	numericScale: number | null;
	characterMaximumLength: number | null;
	datetimePrecision: number | null;
	renameFrom: string | null;
	identity: ColumnIdentity.Always | ColumnIdentity.ByDefault | null;
	enum: boolean;
};

export enum ColumnIdentity {
	Always = "ALWAYS",
	ByDefault = "BY DEFAULT",
}

export enum ColumnUnique {
	NullsDistinct = "NullsDistinct",
	NullsNotDistinct = "NullsNotDistinct",
}

export enum DefaultValueDataTypes {
	bigint = "bigint",
	bigserial = "bigserial",
	bit = "bit",
	"bit varying" = "bit varying",
	boolean = "boolean",
	box = "box",
	bytea = "bytea",
	character = "character(1)",
	"character varying" = "character varying",
	cidr = "cidr",
	circle = "circle",
	date = "date",
	"double precision" = "double precision",
	inet = "inet",
	integer = "integer",
	interval = "interval",
	json = "json",
	jsonb = "jsonb",
	line = "line",
	lseg = "lseg",
	macaddr = "macaddr",
	macaddr8 = "macaddr8",
	money = "money",
	numeric = "numeric",
	path = "path",
	pg_lsn = "pg_lsn",
	pg_snapshot = "pg_snapshot",
	point = "point",
	polygon = "polygon",
	real = "real",
	smallint = "smallint",
	smallserial = "smallserial",
	serial = "serial",
	text = "text",
	"time without time zone" = "time without time zone",
	"time with time zone" = "time with time zone",
	"timestamp without time zone" = "timestamp without time zone",
	"timestamp with time zone" = "timestamp with time zone",
	tsquery = "tsquery",
	tsvector = "tsvector",
	txid_snapshot = "txid_snapshot",
	uuid = "uuid",
	xml = "xml",
}

export class PgColumnBase<Select, Insert, Update> {
	/**
	 * @hidden
	 */
	protected declare readonly infer: ColumnType<Select, Insert, Update>;
	/**
	 * @hidden
	 */
	protected info: Omit<ColumnInfo, "columnName" | "tableName">;

	/**
	 * @hidden
	 */
	constructor(dataType: string) {
		this.info = {
			dataType: dataType,
			isNullable: true,
			defaultValue: null,
			characterMaximumLength: null,
			numericPrecision: null,
			numericScale: null,
			datetimePrecision: null,
			renameFrom: null,
			identity: null,
			enum: false,
		};
	}

	renameFrom(name: string) {
		this.info.renameFrom = name;
		return this;
	}
}

export abstract class PgColumn<
	Select,
	Insert,
	Update = Insert,
> extends PgColumnBase<Select, Insert, Update> {
	/**
	 * @hidden
	 */
	protected _primaryKey: boolean;

	/**
	 * @hidden
	 */
	protected readonly _native_data_type: string;

	/**
	 * @hidden
	 */
	constructor(dataType: string, postgresDataType: string) {
		super(dataType);
		this._native_data_type = postgresDataType;
		this._primaryKey = false;
	}

	/**
	 * Adds a not null constraint to the column.
	 * @public
	 * The column is not allowed to contain null values.
	 *
	 * @see PostgreSQL Docs: {@link https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-NOT-NULL | Not-Null Constraints }
	 */
	notNull() {
		this.info.isNullable = false;
		return this as this & NonNullableColumn;
	}

	default(value: Insert | Expression<unknown>) {
		if (isExpression(value)) {
			this.info.defaultValue = valueWithHash(compileDefaultExpression(value));
		} else {
			this.info.defaultValue = this.transformDefault(value);
		}
		return this as this & WithDefaultColumn;
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: Insert) {
		return valueWithHash(`'${value}'::${this._native_data_type}`);
	}
}

export abstract class PgGeneratedColumn<Select, Insert> extends PgColumnBase<
	Select,
	Insert,
	Insert
> {
	/**
	 * @hidden
	 */
	protected readonly _native_data_type: DefaultValueDataTypes;
	/**
	 * @hidden
	 */
	protected _primaryKey: boolean;

	/**
	 * @hidden
	 */
	constructor(
		dataType: "serial" | "bigserial",
		postgresDataType: DefaultValueDataTypes,
	) {
		super(dataType);
		this.info.isNullable = false;
		this._native_data_type = postgresDataType;
		this._primaryKey = false;
	}
}

export function bigserial() {
	return new PgBigSerial();
}

export class PgBigSerial extends PgGeneratedColumn<
	string,
	number | bigint | string
> {
	/**
	 * @hidden
	 */
	constructor() {
		super("bigserial", DefaultValueDataTypes.bigserial);
	}
}

export function serial() {
	return new PgSerial();
}

export class PgSerial extends PgGeneratedColumn<number, number | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("serial", DefaultValueDataTypes.serial);
	}
}

export abstract class IdentifiableColumn<Select, Insert> extends PgColumn<
	Select,
	Insert
> {
	generatedByDefaultAsIdentity() {
		this.info.identity = ColumnIdentity.ByDefault;
		this.info.isNullable = false;
		return this as this & GeneratedColumn;
	}

	generatedAlwaysAsIdentity() {
		this.info.identity = ColumnIdentity.Always;
		this.info.isNullable = false;
		return this as this & GeneratedAlwaysColumn;
	}
}

export function boolean() {
	return new PgBoolean();
}

export type Boolish =
	| "true"
	| "false"
	| "yes"
	| "no"
	| 1
	| 0
	| "1"
	| "0"
	| "on"
	| "off";

export class PgBoolean extends PgColumn<boolean, boolean | Boolish> {
	/**
	 * @hidden
	 */
	constructor() {
		super("boolean", DefaultValueDataTypes.boolean);
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: boolean | Boolish) {
		return valueWithHash(`${value}`);
	}
}

export function text() {
	return new PgText();
}

export class PgText extends PgColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("text", DefaultValueDataTypes.text);
	}
}

export function bigint() {
	return new PgBigInt();
}

export class PgBigInt extends IdentifiableColumn<
	string,
	number | bigint | string
> {
	/**
	 * @hidden
	 */
	constructor() {
		super("bigint", DefaultValueDataTypes.bigint);
	}
}

export function bytea() {
	return new PgBytea();
}

export class PgBytea extends PgColumn<Buffer, Buffer | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("bytea", DefaultValueDataTypes.bytea);
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: string | Buffer) {
		const valueType = typeof value;
		switch (valueType) {
			case "string":
			case "boolean":
			case "number": {
				const hexVal = Buffer.from(String(value)).toString("hex");
				return valueWithHash(`'\\x${hexVal}'::${this._native_data_type}`);
			}
			case "object": {
				if (value instanceof Buffer) {
					const hexVal = value.toString("hex");
					return valueWithHash(`'\\x${hexVal}'::${this._native_data_type}`);
				}
				const hexVal = Buffer.from(JSON.stringify(value)).toString("hex");
				return valueWithHash(`'\\x${hexVal}'::${this._native_data_type}`);
			}
			default:
				return "::";
		}
	}
}

export function date() {
	return new PgDate();
}

export class PgDate extends PgColumn<Date, Date | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("date", DefaultValueDataTypes.date);
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: string | Date) {
		let val: string;
		if (value instanceof Date) {
			val = value.toISOString();
		} else {
			val = value;
		}
		return valueWithHash(
			`'${val.split("T")[0] || ""}'::${this._native_data_type}`,
		);
	}
}

export function doublePrecision() {
	return new PgDoublePrecision();
}

export class PgDoublePrecision extends PgColumn<
	string,
	number | bigint | string
> {
	/**
	 * @hidden
	 */
	constructor() {
		super("double precision", DefaultValueDataTypes["double precision"]);
	}
}

export function smallint() {
	return new PgSmallint();
}

export class PgSmallint extends IdentifiableColumn<number, number | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("smallint", DefaultValueDataTypes.smallint);
	}
}

export function integer() {
	return new PgInteger();
}

export class PgInteger extends IdentifiableColumn<number, number | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("integer", DefaultValueDataTypes.integer);
	}

	default(value: number | string | Expression<unknown>) {
		if (isExpression(value)) {
			this.info.defaultValue = valueWithHash(compileDefaultExpression(value));
		} else {
			this.info.defaultValue = valueWithHash(`${value}`);
		}
		return this as this & WithDefaultColumn;
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: string | number) {
		return valueWithHash(`${value}`);
	}
}

export function json() {
	return new PgJson();
}

export type JsonArray = JsonValue[];

export type JsonValue =
	| boolean
	| number
	| string
	| Record<string, unknown>
	| JsonArray;

export class PgJson extends PgColumn<JsonValue, JsonValue> {
	/**
	 * @hidden
	 */
	constructor() {
		super("json", DefaultValueDataTypes.json);
	}
}

export function jsonb() {
	return new PgJsonB();
}

export class PgJsonB extends PgColumn<JsonValue, string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("jsonb", DefaultValueDataTypes.jsonb);
	}
}

export function real() {
	return new PgReal();
}

export class PgReal extends PgColumn<number, number | bigint | string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("real", DefaultValueDataTypes.real);
	}
}

export function uuid() {
	return new PgUuid();
}

export class PgUuid extends PgColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor() {
		super("uuid", DefaultValueDataTypes.uuid);
	}

	/**
	 * @hidden
	 */
	protected transformDefault(value: string) {
		return valueWithHash(`'${value.toLowerCase()}'::uuid`);
	}
}

export abstract class PgColumnWithMaximumLength<T, U> extends PgColumn<T, U> {
	/**
	 * @hidden
	 */
	constructor(dataType: string, maximumLength?: number) {
		if (maximumLength !== undefined) {
			super(`${dataType}(${maximumLength})`, dataType);
			this.info.characterMaximumLength = maximumLength;
		} else {
			super(dataType, dataType);
		}
	}
}

export function characterVarying(maximumLength?: number) {
	return new PgCharacterVarying("character varying", maximumLength);
}

export function varchar(maximumLength?: number) {
	return characterVarying(maximumLength);
}

export class PgCharacterVarying extends PgColumnWithMaximumLength<
	string,
	string
> {}

export function character(maximumLength?: number) {
	return new PgCharacter("character", maximumLength ? maximumLength : 1);
}

export function char(maximumLength?: number) {
	return character(maximumLength);
}

export class PgCharacter extends PgColumnWithMaximumLength<string, string> {}

type DateTimePrecision = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export abstract class PgTimeColumn<Select, Insert> extends PgColumn<
	Select,
	Insert
> {
	/**
	 * @hidden
	 */
	constructor(
		dataType: string,
		withTimeZone: boolean,
		precision?: DateTimePrecision,
	) {
		if (precision !== undefined) {
			if (withTimeZone) {
				super(
					`${dataType}(${precision}) with time zone`,
					`${dataType} with time zone`,
				);
			} else {
				super(`${dataType}(${precision})`, `${dataType} without time zone`);
			}
			this.info.datetimePrecision = precision;
		} else {
			if (withTimeZone) {
				super(`${dataType} with time zone`, `${dataType} with time zone`);
			} else {
				super(dataType, `${dataType} without time zone`);
			}
		}
	}
}

export function time(precision?: DateTimePrecision) {
	return new PgTime(precision);
}

export class PgTime extends PgTimeColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor(precision?: DateTimePrecision) {
		super("time", false, precision);
	}
}

export function timeWithTimeZone(precision?: DateTimePrecision) {
	return new PgTimeWithTimeZone(precision);
}

export function timetz(precision?: DateTimePrecision) {
	return timeWithTimeZone(precision);
}

export class PgTimeWithTimeZone extends PgTimeColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor(precision?: DateTimePrecision) {
		super("time", true, precision);
	}
}

export function timestamp(precision?: DateTimePrecision) {
	return new PgTimestamp("timestamp", false, precision);
}

export class PgTimestamp extends PgTimeColumn<Date, Date | string> {
	/**
	 * @hidden
	 */
	protected transformDefault(value: string | Date) {
		let val: string;
		if (value instanceof Date) {
			val = value.toISOString();
		} else {
			val = value;
		}
		return valueWithHash(`'${val}'::${this._native_data_type}`);
	}
}

export function timestampWithTimeZone(precision?: DateTimePrecision) {
	return new PgTimestampWithTimeZone("timestamp", true, precision);
}

export function timestamptz(precision?: DateTimePrecision) {
	return timestampWithTimeZone(precision);
}

export class PgTimestampWithTimeZone extends PgTimeColumn<Date, Date | string> {
	/**
	 * @hidden
	 */
	protected transformDefault(value: string | Date) {
		let val: string;
		if (value instanceof Date) {
			val = value.toISOString();
		} else {
			val = value;
		}
		return valueWithHash(`'${val}'::${this._native_data_type}`);
	}
}

export function numeric(precision?: number, scale?: number) {
	return new PgNumeric(precision, scale);
}

export class PgNumeric extends PgColumn<string, number | bigint | string> {
	/**
	 * @hidden
	 */
	constructor(precision?: number, scale = 0) {
		if (precision !== undefined) {
			super(`numeric(${precision}, ${scale})`, DefaultValueDataTypes.numeric);
			this.info.numericPrecision = precision;
			this.info.numericScale = scale;
		} else {
			super("numeric", DefaultValueDataTypes.numeric);
		}
	}
}

export function enumType<V extends string>(name: string, values: V[]) {
	return new EnumType(name, values);
}

export class EnumType<Value extends string> {
	/**
	 * @hidden
	 */
	protected isExternal: boolean;
	/**
	 * @hidden
	 */
	constructor(
		public name: string,
		public values: Value[],
	) {
		this.isExternal = false;
	}

	external() {
		this.isExternal = true;
		return this;
	}
}

export function enumerated<Value extends string>(enumerated: EnumType<Value>) {
	return new PgEnum(enumerated.name, enumerated.values);
}

export class PgEnum<Value extends string> extends PgColumn<Value, Value> {
	protected readonly values: Value[];

	/**
	 * @hidden
	 */
	constructor(name: string, values: Value[]) {
		super(name, name);
		this.values = values;
		this.info.enum = true;
	}
}

export abstract class PgStringColumn extends PgColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor(dataType: string) {
		super(dataType, dataType);
	}
}

export function tsquery() {
	return new PgTsquery();
}

export class PgTsquery extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("tsquery");
	}
}

export function tsvector() {
	return new PgTsvector();
}

export class PgTsvector extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("tsvector");
	}
}

export function xml() {
	return new PgXML();
}

export class PgXML extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("xml");
	}
}

export abstract class PgBitStringColumn extends PgColumn<string, string> {
	/**
	 * @hidden
	 */
	constructor(dataType: string, maximumLength?: number) {
		if (maximumLength !== undefined) {
			super(`${dataType}(${maximumLength})`, dataType);
			this.info.characterMaximumLength = maximumLength;
		} else {
			super(dataType, dataType);
		}
	}
}

export function bit(fixedLength?: number) {
	return new PgBit(fixedLength);
}

export class PgBit extends PgBitStringColumn {
	/**
	 * @hidden
	 */
	constructor(fixedLength?: number) {
		super("bit", fixedLength ?? 1);
	}
}

export function varbit(maximumLength?: number) {
	return new PgBitVarying(maximumLength);
}

export function bitVarying(maximumLength?: number) {
	return varbit(maximumLength);
}

export class PgBitVarying extends PgBitStringColumn {
	/**
	 * @hidden
	 */
	constructor(maximumLength?: number) {
		super("varbit", maximumLength);
	}
}

export function inet() {
	return new PgInet();
}

export class PgInet extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("inet");
	}
}

export function cidr() {
	return new PgCIDR();
}

export class PgCIDR extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("cidr");
	}
}

export function macaddr() {
	return new PgMacaddr();
}

export class PgMacaddr extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("macaddr");
	}
}

export function macaddr8() {
	return new PgMacaddr8();
}

export class PgMacaddr8 extends PgStringColumn {
	/**
	 * @hidden
	 */
	constructor() {
		super("macaddr8");
	}
}

export type TableColumn =
	| PgBigInt
	| PgBigSerial
	| PgBoolean
	| PgBytea
	| PgCharacter
	| PgDate
	| PgDoublePrecision
	| PgSmallint
	| PgInteger
	| PgJson
	| PgJsonB
	| PgNumeric
	| PgReal
	| PgSerial
	| PgText
	| PgTime
	| PgTimeWithTimeZone
	| PgTimestamp
	| PgTimestampWithTimeZone
	| PgUuid
	| PgCharacterVarying
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	| PgEnum<any>;

// From Kysely. To avoid bundling Kysely in client code.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isExpression(obj: unknown): obj is Expression<any> {
	return (
		isObject(obj) &&
		"expressionType" in obj &&
		typeof obj.toOperationNode === "function"
	);
}

function isObject(obj: unknown): obj is ShallowRecord<string, unknown> {
	return typeof obj === "object" && obj !== null;
}

export function valueWithHash(value: string): `${string}:${string}` {
	const hash = createHash("sha256");
	hash.update(value);
	return `${hash.digest("hex")}:${value}`;
}

export type OptionalColumnType<Select, Insert, Update> = Simplify<
	ColumnType<Select, Insert | undefined, Update>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPGColumn = PgColumn<any, any>;