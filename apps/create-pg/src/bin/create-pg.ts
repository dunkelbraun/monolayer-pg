#!/usr/bin/env tsx

import * as p from "@clack/prompts";
import {
	all,
	provide,
	runPromise,
	succeed,
	tap,
	tapErrorCause,
} from "effect/Effect";
import { effect } from "effect/Layer";
import color from "picocolors";
import { exit } from "process";
import { initFolderAndFiles } from "~create-monolayer/programs/init-folders-and-files.js";
import { installPackages } from "~create-monolayer/programs/install-package.js";
import { promptDbFolderSelection } from "~create-monolayer/prompts/db-folder-selection.js";
import {
	DbFolderState,
	defaultDbFolderRef,
} from "~create-monolayer/state/db-folder.js";
import {
	PackageManagerState,
	defaultPackageManagerRef,
} from "~create-monolayer/state/package-manager.js";

const packageManager =
	(process.env.NPM_CONFIG_USER_AGENT ?? "npm").split("/")[0] ?? "npm";

const program = all([
	succeed(packageManager).pipe(tap(PackageManagerState.updatePackageManager)),
	promptDbFolderSelection.pipe(tap(DbFolderState.update)),
	installPackages([
		{ name: "@monolayer/pg", development: false },
		{ name: "kysely", version: "^0.27.2", development: false },
		{ name: "pg", version: "^8.11.3", development: false },
		{ name: "zod", version: "^3.22.2", development: false },
		{ name: "@types/pg", development: true },
	]),
	initFolderAndFiles,
]).pipe(tapErrorCause((error) => succeed(p.log.error(error.toString()))));

p.intro("Welcome to monolayer!");

const result = await runPromise(
	provide(
		provide(program, effect(DbFolderState, defaultDbFolderRef)),
		effect(PackageManagerState, defaultPackageManagerRef),
	),
).then(
	() => true,
	() => false,
);

if (result) {
	p.outro("Done");
	exit(0);
} else {
	p.outro(`${color.red("Failed")}`);
	exit(1);
}
