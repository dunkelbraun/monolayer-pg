import { Difference } from "microdiff";
import type { GeneratorContext } from "~/changeset/generator-context.js";
import {
	addCheckWithSchemaStatements,
	dropCheckKyselySchemaStatement,
} from "~/changeset/generators/check.js";
import { executeKyselySchemaStatement } from "~/changeset/helpers/helpers.js";
import {
	type Changeset,
	ChangesetPhase,
	ChangeSetType,
	MigrationOpPriority,
} from "~/changeset/types.js";
import { ChangeWarningType } from "~/changeset/warnings/change-warning-type.js";
import { ChangeWarningCode } from "~/changeset/warnings/codes.js";
import { currentTableName } from "~/introspection/introspection/table-name.js";

export function columnNullableMigrationOpGenerator(
	diff: Difference,
	context: GeneratorContext,
) {
	if (isColumnNullable(diff)) {
		return columnNullableMigrationOperation(diff, context);
	}
}

type ColumnNullableDifference = {
	type: "CHANGE";
	path: ["table", string, "columns", string, "isNullable"];
	value: boolean;
	oldValue: boolean;
};

function isColumnNullable(test: Difference): test is ColumnNullableDifference {
	return (
		test.type === "CHANGE" &&
		test.path[0] === "table" &&
		test.path.length === 5 &&
		test.path[2] === "columns" &&
		test.path[4] === "isNullable"
	);
}

function columnNullableMigrationOperation(
	diff: ColumnNullableDifference,
	{ schemaName, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	const columnName = diff.path[3];
	const changeset: Changeset = {
		priority: MigrationOpPriority.ChangeColumnNullable,
		phase: ChangesetPhase.Alter,
		schemaName,
		tableName: tableName,
		currentTableName: currentTableName(tableName, tablesToRename, schemaName),
		type: ChangeSetType.ChangeColumnNullable,
		up: diff.value
			? [dropNotNullOp(schemaName, tableName, columnName)]
			: setNotNullOp(schemaName, tableName, columnName),
		down: diff.value
			? setNotNullOp(schemaName, tableName, columnName)
			: [dropNotNullOp(schemaName, tableName, columnName)],
	};
	if (diff.value === false) {
		changeset.warnings = [
			{
				type: ChangeWarningType.MightFail,
				code: ChangeWarningCode.ChangeColumnToNonNullable,
				schema: schemaName,
				table: tableName,
				column: columnName,
			},
		];
	}
	return changeset;
}

export function setNotNullOp(
	schemaName: string,
	tableName: string,
	columnName: string,
) {
	return [
		...addCheckWithSchemaStatements(schemaName, tableName, {
			name: `temporary_not_null_check_constraint_${schemaName}_${tableName}_${columnName}`,
			definition: `"${columnName}" IS NOT NULL`,
		}),
		executeKyselySchemaStatement(
			schemaName,
			`alterTable("${tableName}")`,
			`alterColumn("${columnName}", (col) => col.setNotNull())`,
		),
		dropCheckKyselySchemaStatement(
			schemaName,
			tableName,
			`temporary_not_null_check_constraint_${schemaName}_${tableName}_${columnName}`,
		),
	];
}

function dropNotNullOp(
	schemaName: string,
	tableName: string,
	columnName: string,
) {
	return executeKyselySchemaStatement(
		schemaName,
		`alterTable("${tableName}")`,
		`alterColumn("${columnName}", (col) => col.dropNotNull())`,
	);
}