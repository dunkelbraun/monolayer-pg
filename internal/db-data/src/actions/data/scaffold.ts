import type { Command } from "@commander-js/extra-typings";
import { kebabCase } from "case-anything";
import { all, gen, tryPromise } from "effect/Effect";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ora from "ora";
import prompts from "prompts";
import { databaseDestinationFolder } from "~db-data/programs/destination-folder.js";
import { DataCLIState } from "~db-data/state.js";
import { dataAction, dataActionWithEffect } from "../data.js";

export function dataScaffold(program: Command) {
	dataAction(program, "scaffold")
		.description("Scaffolds a new data migration file")
		.action(async (opts) => {
			await dataActionWithEffect(
				all([createDestinationFolder, createDataMigrationFile]),
				opts,
			);
		});
}

const createDestinationFolder = gen(function* () {
	mkdirSync(yield* databaseDestinationFolder("data"), {
		recursive: true,
	});
});

const promptDataMigrationName = tryPromise(() =>
	prompts({
		type: "text",
		name: "dataMigrationName",
		message: "Enter a name for the data migration",
	}),
);

const createDataMigrationFile = gen(function* () {
	const { dataMigrationName } = yield* promptDataMigrationName;
	const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
	const folder =
		(yield* DataCLIState.current).folder ??
		(yield* databaseDestinationFolder("data"));
	const dataMigrationFilePath = path.join(
		folder,
		`${timestamp}-${kebabCase(dataMigrationName)}.ts`,
	);
	const spinner = ora();
	spinner.start(`Create data migration: ${dataMigrationFilePath}`);
	writeFileSync(dataMigrationFilePath, dataMigrationTemplate);
	spinner.succeed();
});

const dataMigrationTemplate = `import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}`;
