import { z } from "zod";
import type { ZodType } from "~/schema/inference.js";
import {
	PgCharacter,
	PgCharacterVarying,
	PgText,
	type PgColumn,
	type PgColumnBase,
	type PgGeneratedColumn,
} from "~/schema/pg_column.js";
import { finishSchema } from "../common.js";
import { columnData, nullableColumn } from "../helpers.js";

export function pgVarcharSchema<
	T extends PgCharacterVarying,
	PK extends boolean,
>(column: T): ZodType<T, PK> {
	return characterSchema<T, PK>(column);
}

export function pgCharSchema<T extends PgCharacter, PK extends boolean>(
	column: T,
): ZodType<T, PK> {
	return characterSchema<T, PK>(column);
}

export function isVarchar(
	column:
		| PgColumn<unknown, unknown, unknown>
		| PgGeneratedColumn<unknown, unknown>,
): column is PgCharacterVarying {
	return column instanceof PgCharacterVarying;
}

export function isChar(
	column:
		| PgColumn<unknown, unknown, unknown>
		| PgGeneratedColumn<unknown, unknown>,
): column is PgCharacter {
	return column instanceof PgCharacter;
}

export function isPgText(
	column: PgColumnBase<unknown, unknown, unknown>,
): column is PgText {
	return column instanceof PgText;
}

export function pgTextSchema<T extends PgText, PK extends boolean>(
	column: T,
): ZodType<T, PK> {
	const isNullable = nullableColumn(column);
	return finishSchema(isNullable, z.string()) as unknown as ZodType<T, PK>;
}

export function characterSchema<
	T extends PgCharacter | PgCharacterVarying,
	PK extends boolean,
>(column: T): ZodType<T, PK> {
	const data = columnData(column);
	const isNullable = !data._primaryKey && data.info.isNullable === true;
	if (data.info.characterMaximumLength !== null) {
		return finishSchema(
			isNullable,
			z.string().max(data.info.characterMaximumLength),
		) as unknown as ZodType<T, PK>;
	}
	return finishSchema(isNullable, z.string()) as unknown as ZodType<T, PK>;
}