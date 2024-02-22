import type { MigrationResultSet, Migrator } from "kysely";
import { expect } from "vitest";
import type { Changeset } from "~/database/migration_op/changeset.js";
import { generateMigrationFiles } from "~/database/migrations/generate.js";
import type { pgDatabase } from "~/database/schema/pg_database.js";
import type { DbContext } from "~tests/setup.js";
import { computeChangeset } from "./compute_changeset.js";

async function migrateUp(
	folder: string,
	migrator: Migrator,
	changeset: Changeset[],
) {
	generateMigrationFiles(changeset, folder);
	return await migrator.migrateToLatest();
}

async function migrateDown(migrator: Migrator) {
	return await migrator.migrateDown();
}

function expectMigrationSuccess(resultSet: MigrationResultSet) {
	expect(resultSet.error, resultSet.error as string).toBeUndefined();
	if (resultSet.results === undefined) {
		throw new Error("results is undefined");
	}
	for (const result of resultSet.results) {
		expect(result.status).toBe("Success");
	}
}

export async function testUpAndDownMigrations(
	context: DbContext,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	database: pgDatabase<any>,
	cs: Changeset[],
	reverseChangesetAfterDown = true,
) {
	expectMigrationSuccess(await migrateUp(context.folder, context.migrator, cs));

	const afterUpCs = await computeChangeset(context.kysely, database);
	expect(afterUpCs).toEqual([]);

	expectMigrationSuccess(await migrateDown(context.migrator));

	if (reverseChangesetAfterDown) {
		const afterDownCs = await computeChangeset(context.kysely, database);
		expect(afterDownCs).toEqual(cs.reverse());
	} else {
		const afterDownCs = await computeChangeset(context.kysely, database);
		expect(afterDownCs).toEqual(cs);
	}
}

export async function testChangesetAndMigrations({
	context,
	database,
	expected,
	reverseChangesetAfterDown,
}: {
	context: DbContext;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	database: pgDatabase<any>;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	expected: any[];
	reverseChangesetAfterDown: boolean;
}) {
	const cs = await computeChangeset(context.kysely, database);
	expect(cs).toEqual(expected);

	await testUpAndDownMigrations(
		context,
		database,
		cs,
		reverseChangesetAfterDown,
	);
}