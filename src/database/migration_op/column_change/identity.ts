import { Difference } from "microdiff";
import type {
	DbTableInfo,
	LocalTableInfo,
} from "~/database/introspection/types.js";
import { ChangeSetType, Changeset } from "~/database/migration_op/changeset.js";
import type { ColumnInfo } from "~/database/schema/pg_column.js";
import { executeKyselyDbStatement } from "../helpers.js";
import { MigrationOpPriority } from "../priority.js";

export function columnIdentityMigrationOpGenerator(
	diff: Difference,
	_addedTables: string[],
	_droppedTables: string[],
	_local: LocalTableInfo,
	_db: DbTableInfo,
) {
	if (isColumnIdentityAdd(diff)) {
		return columnIdentityAddMigrationOperation(diff);
	}
	if (isColumnIdentityDrop(diff)) {
		return columnIdentityDropMigrationOperation(diff);
	}
}

type IdentityAddDifference = {
	type: "CHANGE";
	path: ["table", string, string, "identity"];
	value: NonNullable<ColumnInfo["identity"]>;
	oldValue: null;
};

type IdentityDropDifference = {
	type: "CHANGE";
	path: ["table", string, string, "identity"];
	value: null;
	oldValue: NonNullable<ColumnInfo["identity"]>;
};

function isColumnIdentityAdd(test: Difference): test is IdentityAddDifference {
	return (
		test.type === "CHANGE" &&
		test.path[0] === "table" &&
		test.path.length === 4 &&
		test.path[3] === "identity" &&
		test.value !== null &&
		test.oldValue === null
	);
}

function isColumnIdentityDrop(
	test: Difference,
): test is IdentityDropDifference {
	return (
		test.type === "CHANGE" &&
		test.path[0] === "table" &&
		test.path.length === 4 &&
		test.path[3] === "identity" &&
		test.value === null &&
		test.oldValue !== null
	);
}

function columnIdentityAddMigrationOperation(diff: IdentityAddDifference) {
	const tableName = diff.path[1];
	const columnName = diff.path[2];
	const changeset: Changeset = {
		priority: MigrationOpPriority.ChangeColumnIdentityAdd,
		tableName: tableName,
		type: ChangeSetType.ChangeColumn,
		up:
			diff.value === "ALWAYS"
				? [
						executeKyselyDbStatement(
							`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" ADD GENERATED ALWAYS AS IDENTITY`,
						),
				  ]
				: [
						executeKyselyDbStatement(
							`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" ADD GENERATED BY DEFAULT AS IDENTITY`,
						),
				  ],
		down: [
			executeKyselyDbStatement(
				`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" DROP IDENTITY`,
			),
		],
	};
	return changeset;
}

function columnIdentityDropMigrationOperation(diff: IdentityDropDifference) {
	const tableName = diff.path[1];
	const columnName = diff.path[2];
	const changeset: Changeset = {
		priority: MigrationOpPriority.ChangeColumnIdentityDrop,
		tableName: tableName,
		type: ChangeSetType.ChangeColumn,
		up: [
			executeKyselyDbStatement(
				`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" DROP IDENTITY`,
			),
		],
		down:
			diff.oldValue === "ALWAYS"
				? [
						executeKyselyDbStatement(
							`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" ADD GENERATED ALWAYS AS IDENTITY`,
						),
				  ]
				: [
						executeKyselyDbStatement(
							`ALTER TABLE ${tableName} ALTER COLUMN "${columnName}" ADD GENERATED BY DEFAULT AS IDENTITY`,
						),
				  ],
	};
	return changeset;
}
