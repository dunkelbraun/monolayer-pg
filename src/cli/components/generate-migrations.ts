import * as p from "@clack/prompts";
import { exit } from "process";
import { Changeset } from "~/changeset/types.js";
import { Config } from "~/config.js";
import { generateMigrationFiles } from "~/migrations/generate.js";
import { ActionStatus, throwableOperation } from "../command.js";

export async function generateMigrations(
	changeset: Changeset[],
	config: Config,
) {
	const result = await throwableOperation<typeof generateMigrationFiles>(
		async () => {
			generateMigrationFiles(changeset, config.folder);
		},
	);
	if (result.status === ActionStatus.Error) {
		p.cancel("Unexpected error while generating migration files.");
		console.error(result.error);
		exit(1);
	}
	const nextSteps = "To apply migrations, run 'npx yount migrate'";
	p.note(nextSteps, "Next Steps");
}
