import { Effect } from "effect";
import fs from "fs/promises";
import path from "path";
import { pgQuery } from "~/services/db-clients.js";
import { checkWithFail } from "../cli/check-with-fail.js";
import { spinnerTask } from "../cli/spinner-task.js";
import { DbClients } from "../services/db-clients.js";
import { Environment } from "../services/environment.js";
import { createDatabase } from "./create.js";
import { dropDatabase } from "./drop.js";

export function structureLoad() {
	return checkStructureFile().pipe(
		Effect.tap(dropDatabase),
		Effect.tap(createDatabase),
		Effect.tap(restoreDatabaseFromStructureFile),
	);
}

function checkStructureFile() {
	return Environment.pipe(
		Effect.flatMap((environment) =>
			checkWithFail({
				name: `Check structure.sql file`,
				nextSteps: `Follow these steps to generate a structure file:

1) Create the development database: \`npx yount db:create -e development\`.

2) Generate migrations: \`npx yount generate -e development\`

3) Apply migrations: \`npx yount migrate -e development\``,
				errorMessage: `Structure file not found. Expected location: ${path.join(
					environment.folder,
					"dumps",
					`structure.${environment.configurationName}.sql`,
				)}`,
				failMessage: "Structure file does not exist",
				callback: () =>
					Effect.tryPromise(async () => {
						const structurePath = path.join(
							environment.folder,
							"dumps",
							`structure.${environment.configurationName}.sql`,
						);
						try {
							await fs.stat(structurePath);
						} catch (error) {
							return false;
						}
						return true;
					}),
			}),
		),
	);
}

function restoreDatabaseFromStructureFile() {
	return Effect.all([Environment, DbClients]).pipe(
		Effect.flatMap(([environment, dbClients]) =>
			spinnerTask(
				`Restore ${dbClients.currentEnvironment.databaseName} from structure.${environment.configurationName}.sql`,
				() =>
					Effect.tryPromise(async () => {
						const structurePath = path.join(
							environment.folder,
							"dumps",
							`structure.${environment.configurationName}.sql`,
						);
						return (await fs.readFile(structurePath)).toString();
					}).pipe(
						Effect.flatMap((structure) =>
							pgQuery<{
								datname: string;
							}>(structure),
						),
					),
			),
		),
	);
}