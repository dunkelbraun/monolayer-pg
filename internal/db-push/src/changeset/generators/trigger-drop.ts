import { Effect } from "effect";
import { flatMap, gen, succeed } from "effect/Effect";
import { createTrigger, dropTrigger } from "../../ddl/ddl.js";
import { ChangesetGeneratorState } from "../../state/changeset-generator.js";
import { resolveCurrentTableName } from "../introspection.js";
import {
	ChangesetPhase,
	ChangesetType,
	MigrationOpPriority,
	type CodeChangeset,
} from "../types/changeset.js";
import type {
	DropMultipleTriggerDiff,
	DropTriggerDiff,
} from "../types/diff.js";

export function dropTriggerChangeset(diff: DropTriggerDiff) {
	return gen(function* () {
		const context = yield* ChangesetGeneratorState.current;
		const tableName = diff.path[1];
		const triggerName = diff.path[2];
		const trigger = diff.oldValue.split(":");
		if (trigger[1] === undefined) {
			return;
		}
		const changeset: CodeChangeset = {
			priority: MigrationOpPriority.TriggerCreate,
			phase: ChangesetPhase.Expand,
			schemaName: context.schemaName,
			tableName: tableName,
			currentTableName: resolveCurrentTableName(tableName, context),
			type: ChangesetType.CreateTrigger,
			up: dropTrigger({
				schemaName: context.schemaName,
				tableName,
				name: triggerName,
				debug: false,
			}),
			down: createTrigger({
				name: triggerName,
				definition: trigger[1].replace(
					"CREATE TRIGGER",
					"CREATE OR REPLACE TRIGGER",
				),
				debug: context.debug,
			}),
		};
		return changeset;
	});
}

export function dropMultipleTriggersChangeset(diff: DropMultipleTriggerDiff) {
	return Effect.all(
		Object.entries(diff.oldValue).map(([hash, oldValue]) =>
			dropTriggerChangeset({
				type: "REMOVE",
				path: ["triggers", diff.oldValue[1]!, hash],
				oldValue,
			}),
		),
	).pipe(
		flatMap((result) => succeed(result.filter((res) => res !== undefined))),
	);
}
