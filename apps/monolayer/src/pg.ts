import type { Configuration } from "./configuration.js";
export { extension, PgExtension } from "./database/extension/extension.js";
export { schema, type Schema } from "./database/schema/schema.js";
export {
	columnWithType,
	type pgColumnWithType,
} from "./database/schema/table/column/column-with-type.js";
export {
	bigint,
	type PgBigInt,
} from "./database/schema/table/column/data-types/bigint.js";
export {
	bigserial,
	type PgBigSerial,
} from "./database/schema/table/column/data-types/bigserial.js";
export {
	boolean,
	type PgBoolean,
} from "./database/schema/table/column/data-types/boolean.js";
export {
	bytea,
	type PgBytea,
} from "./database/schema/table/column/data-types/bytea.js";
export {
	characterVarying,
	varchar,
	type PgCharacterVarying,
} from "./database/schema/table/column/data-types/character-varying.js";
export {
	char,
	character,
	type PgCharacter,
} from "./database/schema/table/column/data-types/character.js";
export {
	date,
	type PgDate,
} from "./database/schema/table/column/data-types/date.js";
export {
	doublePrecision,
	type PgDoublePrecision,
} from "./database/schema/table/column/data-types/double-precision.js";
export { enumerated } from "./database/schema/table/column/data-types/enumerated.js";
export {
	integer,
	type PgInteger,
} from "./database/schema/table/column/data-types/integer.js";
export {
	json,
	type PgJson,
} from "./database/schema/table/column/data-types/json.js";
export {
	jsonb,
	type PgJsonB,
} from "./database/schema/table/column/data-types/jsonb.js";
export {
	numeric,
	type PgNumeric,
} from "./database/schema/table/column/data-types/numeric.js";
export {
	real,
	type PgReal,
} from "./database/schema/table/column/data-types/real.js";
export {
	serial,
	type PgSerial,
} from "./database/schema/table/column/data-types/serial.js";
export {
	smallint,
	type PgSmallint,
} from "./database/schema/table/column/data-types/smallint.js";
export {
	text,
	type PgText,
} from "./database/schema/table/column/data-types/text.js";
export {
	timetz,
	timeWithTimeZone,
	type PgTimeWithTimeZone,
} from "./database/schema/table/column/data-types/time-with-time-zone.js";
export {
	time,
	type PgTime,
} from "./database/schema/table/column/data-types/time.js";
export {
	timestamptz,
	timestampWithTimeZone,
	type PgTimestampWithTimeZone,
} from "./database/schema/table/column/data-types/timestamp-with-time-zone.js";
export {
	timestamp,
	type PgTimestamp,
} from "./database/schema/table/column/data-types/timestamp.js";
export {
	uuid,
	type PgUuid,
} from "./database/schema/table/column/data-types/uuid.js";
export {
	check,
	unmanagedCheck,
	type PgCheck,
	type PgUnmanagedCheck,
} from "./database/schema/table/constraints/check/check.js";
export {
	foreignKey,
	unmanagedForeignKey,
	type PgForeignKey,
	type PgUnmanagedForeignKey,
} from "./database/schema/table/constraints/foreign-key/foreign-key.js";
export {
	primaryKey,
	type PgPrimaryKey,
} from "./database/schema/table/constraints/primary-key/primary-key.js";
export { type PgRawConstraint } from "./database/schema/table/constraints/raw-constraint.js";
export {
	unique,
	type PgUnique,
} from "./database/schema/table/constraints/unique/unique.js";
export {
	index,
	unmanagedIndex,
	type PgIndex,
	type PgUnmanagedIndex,
} from "./database/schema/table/index/index.js";
export {
	table,
	type PgTable,
	type TableDefinition as TableSchema,
} from "./database/schema/table/table.js";
export {
	unmanagedTrigger as externalTrigger,
	trigger,
	type PgTrigger,
	type PgUnmanagedTrigger,
	type TriggerEvent,
	type TriggerFiringTime,
	type TriggerOptions,
} from "./database/schema/table/trigger/trigger.js";
export { enumType, type EnumType } from "./database/schema/types/enum/enum.js";

export function defineConfig(config: Configuration) {
	return new MonolayerPgConfiguration(config);
}

export class MonolayerPgConfiguration {
	constructor(public configuration: Configuration) {
		this.configuration = configuration;
	}

	get schemas() {
		return this.configuration.schemas;
	}

	get extensions() {
		return this.configuration.extensions;
	}

	connection(environment: string) {
		return this.configuration.connections[environment] || {};
	}

	get camelCasePlugin() {
		return this.configuration.camelCasePlugin;
	}

	get camelCasePluginEnabled() {
		return this.configuration.camelCasePlugin?.enabled ?? false;
	}

	get camelCasePluginOptions() {
		return this.configuration.camelCasePlugin?.options ?? { enabled: false };
	}

	get generatePrismaSchema() {
		return this.configuration.generatePrismaSchema ?? false;
	}
}