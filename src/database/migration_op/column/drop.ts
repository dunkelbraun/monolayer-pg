import { Difference } from "microdiff";
import { ChangeSetType, Changeset } from "~/database/changeset.js";
import type { ColumnInfo } from "~/database/schema/pg_column.js";
import {
	MigrationOpPriority,
	executeKyselySchemaStatement,
} from "../compute.js";
import { foreignKeyConstraint, optionsForColumn } from "../table_common.js";

export type DropColumnDiff = {
	type: "REMOVE";
	path: ["table", string, string];
	oldValue: ColumnInfo;
};

export function isDropColumn(test: Difference): test is DropColumnDiff {
	return (
		test.type === "REMOVE" && test.path.length === 3 && test.path[0] === "table"
	);
}

export function dropColumnMigration(diff: DropColumnDiff) {
	const tableName = diff.path[1];
	const columnDef = diff.oldValue;
	const columnName = diff.path[2];

	const changeset: Changeset = {
		priority: MigrationOpPriority.Column,
		tableName: tableName,
		type: ChangeSetType.DropColumn,
		up: executeKyselySchemaStatement(
			`alterTable("${tableName}")`,
			`dropColumn(\"${columnName}\")`,
		),

		down: executeKyselySchemaStatement(
			`alterTable("${tableName}")`,
			`addColumn(\"${columnName}\", \"${columnDef.dataType}\"${optionsForColumn(
				columnDef,
			)})`,
			foreignKeyConstraint(columnDef),
		),
	};
	return changeset;
}
