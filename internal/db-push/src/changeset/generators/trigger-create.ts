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
	CreateMultipleTriggerDiff,
	CreateTriggerDiff,
} from "../types/diff.js";

export function createTriggerChangeset(diff: CreateTriggerDiff) {
	return gen(function* () {
		const context = yield* ChangesetGeneratorState.current;
		const tableName = diff.path[1];
		const triggerName = diff.path[2];
		const trigger = diff.value.split(":");
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
			up: createTrigger({
				name: triggerName,
				definition: trigger[1],
				debug: context.debug,
			}),
			down: dropTrigger({
				schemaName: context.schemaName,
				tableName,
				name: triggerName,
				debug: false,
			}),
		};
		return changeset;
	});
}

export function createMultipleTriggersChangeset(
	diff: CreateMultipleTriggerDiff,
) {
	return Effect.all(
		Object.entries(diff.value).map(([hash, value]) =>
			createTriggerChangeset({
				type: "CREATE",
				path: ["triggers", diff.value[1]!, hash],
				value: value,
			}),
		),
	).pipe(
		flatMap((result) => succeed(result.filter((res) => res !== undefined))),
	);
}
