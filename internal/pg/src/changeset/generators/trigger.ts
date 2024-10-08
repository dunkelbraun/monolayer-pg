import { gen } from "effect/Effect";
import type { Difference } from "microdiff";
import { ChangesetGeneratorState } from "~pg/changeset/changeset-generator.js";
import type { GeneratorContext } from "~pg/changeset/generator-context.js";
import { executeKyselyDbStatement } from "~pg/changeset/helpers/helpers.js";
import {
	type Changeset,
	ChangesetPhase,
	ChangesetType,
	MigrationOpPriority,
} from "~pg/changeset/types.js";
import { ChangeWarningType } from "~pg/changeset/warnings/change-warning-type.js";
import { ChangeWarningCode } from "~pg/changeset/warnings/codes.js";
import { currentTableName } from "~pg/introspection/introspection/table-name.js";

export function triggerMigrationOpGenerator(diff: Difference) {
	return gen(function* () {
		const context = yield* ChangesetGeneratorState.current;
		if (isTriggerCreateFirst(diff)) {
			return createTriggerFirstMigration(diff, context);
		}
		if (isTriggerCreate(diff)) {
			return createTriggerMigration(diff, context);
		}
		if (isTriggerDropFirst(diff)) {
			return dropTriggerFirstMigration(diff, context);
		}
		if (isTriggerDrop(diff)) {
			return dropTriggerMigration(diff, context);
		}
		if (isTriggerChange(diff)) {
			return changeTriggerMigration(diff, context);
		}
	});
}

type TriggerCreateFirstDiff = {
	type: "CREATE";
	path: ["triggers", string];
	value: {
		[key: string]: string;
	};
};

type TriggerCreateDiff = {
	type: "CREATE";
	path: ["triggers", string, string];
	value: string;
};

type TriggerDropFirstDiff = {
	type: "REMOVE";
	path: ["triggers", string];
	oldValue: {
		[key: string]: string;
	};
};

type TriggerDropDiff = {
	type: "REMOVE";
	path: ["triggers", string, string];
	oldValue: string;
};

type TriggerChangeDiff = {
	type: "CHANGE";
	path: ["triggers", string, string];
	value: string;
	oldValue: string;
};

function isTriggerCreateFirst(
	test: Difference,
): test is TriggerCreateFirstDiff {
	return (
		test.type === "CREATE" &&
		test.path.length === 2 &&
		test.path[0] === "triggers" &&
		typeof test.path[1] === "string" &&
		typeof test.value === "object"
	);
}

function isTriggerCreate(test: Difference): test is TriggerCreateDiff {
	return (
		test.type === "CREATE" &&
		test.path.length === 3 &&
		test.path[0] === "triggers" &&
		typeof test.path[1] === "string" &&
		typeof test.path[2] === "string" &&
		typeof test.value === "string"
	);
}

function isTriggerDropFirst(test: Difference): test is TriggerDropFirstDiff {
	return (
		test.type === "REMOVE" &&
		test.path.length === 2 &&
		test.path[0] === "triggers" &&
		typeof test.path[1] === "string" &&
		typeof test.oldValue === "object"
	);
}

function isTriggerDrop(test: Difference): test is TriggerDropDiff {
	return (
		test.type === "REMOVE" &&
		test.path.length === 3 &&
		test.path[0] === "triggers" &&
		typeof test.path[1] === "string" &&
		typeof test.path[2] === "string" &&
		typeof test.oldValue === "string"
	);
}

function isTriggerChange(test: Difference): test is TriggerChangeDiff {
	return (
		test.type === "CHANGE" &&
		test.path.length === 3 &&
		test.path[0] === "triggers" &&
		typeof test.path[1] === "string" &&
		typeof test.path[2] === "string" &&
		typeof test.value === "string" &&
		typeof test.oldValue === "string" &&
		test.value.split(":")[0] !== test.oldValue.split(":")[0]
	);
}

function createTriggerFirstMigration(
	diff: TriggerCreateFirstDiff,
	{ schemaName, addedTables, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	return Object.entries(diff.value).reduce((acc, [key, value]) => {
		const trigger = value.split(":");
		const changeset: Changeset = {
			priority: MigrationOpPriority.TriggerCreate,
			phase: ChangesetPhase.Expand,
			schemaName,
			tableName: tableName,
			currentTableName: currentTableName(tableName, tablesToRename, schemaName),
			type: ChangesetType.CreateTrigger,
			up: [executeKyselyDbStatement(`${trigger[1]}`)],
			down: addedTables.includes(tableName)
				? [[]]
				: [
						executeKyselyDbStatement(
							`DROP TRIGGER ${key} ON "${schemaName}"."${tableName}"`,
						),
					],
		};
		return acc.concat(changeset);
	}, [] as Changeset[]);
}

function createTriggerMigration(
	diff: TriggerCreateDiff,
	{ schemaName, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	const triggerName = diff.path[2];
	const trigger = diff.value.split(":");
	const changeset: Changeset = {
		priority: MigrationOpPriority.TriggerCreate,
		phase: ChangesetPhase.Expand,
		schemaName,
		tableName: tableName,
		currentTableName: currentTableName(tableName, tablesToRename, schemaName),
		type: ChangesetType.CreateTrigger,
		up: [executeKyselyDbStatement(`${trigger[1]}`)],
		down: [
			executeKyselyDbStatement(
				`DROP TRIGGER ${triggerName} ON "${schemaName}"."${tableName}"`,
			),
		],
	};
	return changeset;
}

function dropTriggerFirstMigration(
	diff: TriggerDropFirstDiff,
	{ schemaName, droppedTables, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	return Object.entries(diff.oldValue).reduce((acc, [key, value]) => {
		const trigger = value.split(":");
		const changeset: Changeset = {
			priority: MigrationOpPriority.TriggerDrop,
			phase: ChangesetPhase.Contract,
			schemaName,
			tableName: tableName,
			currentTableName: currentTableName(tableName, tablesToRename, schemaName),
			type: ChangesetType.DropTrigger,
			warnings: [
				{
					type: ChangeWarningType.Destructive,
					code: ChangeWarningCode.TriggerDrop,
					schema: schemaName,
					table: currentTableName(tableName, tablesToRename, schemaName),
				},
			],
			up: droppedTables.includes(tableName)
				? [[]]
				: [
						executeKyselyDbStatement(
							`DROP TRIGGER ${key} ON "${schemaName}"."${tableName}"`,
						),
					],
			down: [
				executeKyselyDbStatement(
					`${trigger[1]?.replace(
						"CREATE TRIGGER",
						"CREATE OR REPLACE TRIGGER",
					)}`,
				),
			],
		};
		acc.push(changeset);
		return acc;
	}, [] as Changeset[]);
}

function dropTriggerMigration(
	diff: TriggerDropDiff,
	{ schemaName, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	const triggerName = diff.path[2];
	const trigger = diff.oldValue.split(":");
	const changeset: Changeset = {
		priority: MigrationOpPriority.TriggerDrop,
		phase: ChangesetPhase.Contract,
		schemaName,
		tableName: tableName,
		currentTableName: currentTableName(tableName, tablesToRename, schemaName),
		type: ChangesetType.DropTrigger,
		warnings: [
			{
				type: ChangeWarningType.Destructive,
				code: ChangeWarningCode.TriggerDrop,
				schema: schemaName,
				table: currentTableName(tableName, tablesToRename, schemaName),
			},
		],
		up: [
			executeKyselyDbStatement(
				`DROP TRIGGER ${triggerName} ON "${schemaName}"."${tableName}"`,
			),
		],
		down: [
			executeKyselyDbStatement(
				`${trigger[1]?.replace("CREATE TRIGGER", "CREATE OR REPLACE TRIGGER")}`,
			),
		],
	};
	return changeset;
}

function changeTriggerMigration(
	diff: TriggerChangeDiff,
	{ schemaName, tablesToRename }: GeneratorContext,
) {
	const tableName = diff.path[1];
	const newValue = diff.value;
	const newTrigger = newValue.split(":");
	const oldValue = diff.oldValue;
	const oldTrigger = oldValue.split(":");

	const changeset: Changeset = {
		priority: MigrationOpPriority.TriggerUpdate,
		phase: ChangesetPhase.Alter,
		schemaName,
		tableName: tableName,
		currentTableName: currentTableName(tableName, tablesToRename, schemaName),
		type: ChangesetType.UpdateTrigger,
		up: [executeKyselyDbStatement(`${newTrigger[1]}`)],
		down: [
			executeKyselyDbStatement(
				`${oldTrigger[1]?.replace(
					"CREATE TRIGGER",
					"CREATE OR REPLACE TRIGGER",
				)}`,
			),
		],
	};
	return changeset;
}
