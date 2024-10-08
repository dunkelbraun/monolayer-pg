import { pgAdminPool } from "~test-setup/pool.js";
import type { TestProgramContext } from "~test-setup/setup.js";

export async function createTestDatabase(context: TestProgramContext) {
	const pool = pgAdminPool();
	await pool.query(`CREATE DATABASE "${context.databaseName}"`);
}

export async function dropTestDatabase(context: TestProgramContext) {
	const pool = pgAdminPool();
	await pool.query(`DROP DATABASE IF EXISTS "${context.databaseName}"`);
}

export function setDefaultDatabaseURL(databaseName: string) {
	const databaseURL = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${databaseName}`;
	process.env.MONO_PG_DEFAULT_DATABASE_URL = databaseURL;
}
