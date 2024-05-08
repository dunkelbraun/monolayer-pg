import * as p from "@clack/prompts";
import { Effect } from "effect";
import { promises as fs, mkdirSync, writeFileSync } from "fs";
import nunjucks from "nunjucks";
import path from "path";
import color from "picocolors";
import { cwd } from "process";
import { DbFolderState, UndefinedDbFolderError } from "./state/db-folder.js";

export const initFolderAndFiles = Effect.gen(function* () {
	const dbFolder = yield* DbFolderState.current;
	const dbFolderPath = dbFolder?.path;
	if (dbFolderPath === undefined) {
		yield* Effect.fail(new UndefinedDbFolderError());
	} else {
		yield* Effect.tryPromise(async () => {
			log.lineMessage("");

			await createFile(
				path.join(cwd(), "monolayer.ts"),
				configTemplate.render({ folder: dbFolderPath }),
				true,
			);
			await createDir(dbFolderPath, true);
			await createFile(`${dbFolderPath}/db.ts`, dbTemplate.render(), true);
			await createFile(
				`${dbFolderPath}/schema.ts`,
				schemaTemplate.render(),
				true,
			);
			await createFile(
				`${dbFolderPath}/configuration.ts`,
				configurationTemplate.render(),
				true,
			);
			await createFile(
				`${dbFolderPath}/extensions.ts`,
				extensionsTemplate.render(),
				true,
			);
			await createFile(`${dbFolderPath}/seed.ts`, seedTemplate.render(), true);
			await createDir(`${dbFolderPath}/migrations`, true);

			const nextSteps = `1) Edit the default configuration in \`${path.join(dbFolderPath, "configuration.ts")}\`.
2) Run \`npx monolayer db:create\` to create the database.
3) Edit the schema file at \`${path.join(dbFolderPath, "schema.ts")}\`.
4) Run 'npx monolayer generate' to create migrations.
5) Run 'npx monolayer migrate' to migrate the database.`;
			p.note(nextSteps, "Next Steps");
		});
	}
});

export async function createDir(path: string, outputLog = false) {
	try {
		await fs.access(path);
		if (outputLog) log.lineMessage(`${color.yellow("exists")} ${path}`);
	} catch {
		mkdirSync(path, { recursive: true });
		if (outputLog) log.lineMessage(`${color.green("created")} ${path}`);
	}
}

export async function createFile(
	path: string,
	content: string,
	outputLog = false,
) {
	try {
		await fs.access(path);
		if (outputLog) log.lineMessage(`${color.yellow("exists")} ${path}`);
	} catch {
		writeFileSync(path, content);
		if (outputLog) log.lineMessage(`${color.green("created")} ${path}`);
	}
}

type LogWithSimpleMessage = typeof p.log & {
	lineMessage: (message?: string) => void;
};

const log: LogWithSimpleMessage = {
	...p.log,
	lineMessage: (message = "") => {
		process.stdout.write(`${color.gray("│")}  ${message}\n`);
	},
};

export const configTemplate =
	nunjucks.compile(`import type { Monolayer } from "monolayer/config";

const monolayer = {
	folder: "{{ folder }}"
} satisfies Monolayer;

export default monolayer;
`);

export const configurationTemplate =
	nunjucks.compile(`import { type Configuration } from "monolayer/config";
import { dbSchema } from "./schema";
import { dbExtensions } from "./extensions";

export default {
	schemas: [dbSchema],
	extensions: dbExtensions,
	connections: {
		development: {
			// With credentials
			database: "#database_development",
			user: "#user",
			password: "#password",
			host: "#host",
			port: 5432,
			// With connection string
			// connectionString: "#connection_string",
		},
		production: {
			connectionString: process.env.DATABASE_URL,
		}
	},
	camelCasePlugin: {
		enabled: false,
	},
} satisfies Configuration;
`);

export const dbTemplate = nunjucks.compile(`import { Kysely } from "kysely";
import { kyselyConfig } from "monolayer/config";
import configuration from "./configuration";
import { type DB } from "./schema";

export const defaultDb = new Kysely<DB>(
	kyselyConfig(configuration, process.env.NODE_ENV || "development")
);
`);

export const schemaTemplate =
	nunjucks.compile(`import { schema } from "monolayer/pg";

export const dbSchema = schema({});
x
export type DB = typeof dbSchema.infer;
`);

export const seedTemplate =
	nunjucks.compile(`import type { Kysely } from "kysely";
import type { DB } from "./schema";

export async function seed(db: Kysely<DB>){}
`);

export const extensionsTemplate =
	nunjucks.compile(`export const dbExtensions = [];
`);
