import * as p from "@clack/prompts";
import color from "picocolors";
import { exit } from "process";
import { pgPoolAndConfig } from "~/pg/pg-pool.js";
import { pgQueryExecuteWithResult } from "~/pg/pg-query.js";
import { importConfig } from "../../config.js";
import { ActionStatus } from "../command.js";
import { checkEnvironmentIsConfigured } from "../utils/clack.js";

export async function dbCreate(environment: string) {
	p.intro("Create Database");
	const s = p.spinner();
	s.start("Creating database");
	const config = await importConfig();
	checkEnvironmentIsConfigured(config, environment, {
		spinner: s,
		outro: true,
	});

	const pool = pgPoolAndConfig(config, environment);

	const createDb = await pgQueryExecuteWithResult<{
		datname: string;
	}>(pool.adminPool, `CREATE DATABASE ${pool.config.database};`);
	if (createDb.status === ActionStatus.Error) {
		s.stop(createDb.error.message, 1);
		p.outro(`${color.red("Failed")}`);
		exit(1);
	}
	s.stop(`${color.green("created")} ${pool.config.database}`);
	p.outro("Done");
}