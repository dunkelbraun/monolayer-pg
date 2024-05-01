import { Effect } from "effect";
import { unlinkSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { seed } from "~/database/seed.js";
import { layers } from "~tests/__setup__/helpers/layers.js";
import { programWithErrorCause } from "~tests/__setup__/helpers/run-program.js";
import {
	setupProgramContext,
	teardownProgramContext,
	type ProgramContext,
} from "~tests/__setup__/helpers/test-context.js";

describe("seed", () => {
	beforeEach<ProgramContext>(async (context) => {
		await setupProgramContext(context);
	});

	afterEach<ProgramContext>(async (context) => {
		await teardownProgramContext(context);
	});

	test<ProgramContext>("seeds database", async (context) => {
		await context.migrator.migrateToLatest();

		writeFileSync(path.join(context.folder, "db", "seed.ts"), seedFile);

		await Effect.runPromise(
			Effect.provide(programWithErrorCause(seed({})), layers),
		);
		await Effect.runPromise(
			Effect.provide(programWithErrorCause(seed({})), layers),
		);

		const result = await context.kysely
			.selectFrom("regulus_mint")
			.select("name")
			.execute();

		const expected = [{ name: "test1" }, { name: "test1" }];
		expect(result).toStrictEqual(expected);
	});

	test<ProgramContext>("seeds database with seed file", async (context) => {
		await context.migrator.migrateToLatest();

		writeFileSync(
			path.join(context.folder, "db", "anotherSeed.ts"),
			anotherSeedFile,
		);

		await Effect.runPromise(
			Effect.provide(
				programWithErrorCause(seed({ seedFile: "anotherSeed.ts" })),
				layers,
			),
		);

		await Effect.runPromise(
			Effect.provide(
				programWithErrorCause(seed({ seedFile: "anotherSeed.ts" })),
				layers,
			),
		);

		const result = await context.kysely
			.selectFrom("regulus_mint")
			.select("name")
			.execute();

		const expected = [
			{ name: "test1" },
			{ name: "test2" },
			{ name: "test1" },
			{ name: "test2" },
		];
		expect(result).toStrictEqual(expected);
	});

	test<ProgramContext>("seeds database with replant", async (context) => {
		await context.migrator.migrateToLatest();

		writeFileSync(path.join(context.folder, "db", "seed.ts"), seedFile);

		await Effect.runPromise(
			Effect.provide(programWithErrorCause(seed({})), layers),
		);

		await Effect.runPromise(
			Effect.provide(
				programWithErrorCause(seed({ replant: true, disableWarnings: true })),
				layers,
			),
		);

		const result = await context.kysely
			.selectFrom("regulus_mint")
			.select("name")
			.execute();

		const expected = [{ name: "test1" }];
		expect(result).toEqual(expected);
	});

	test<ProgramContext>("fails with pending schema migrations", async () => {
		expect(
			async () =>
				await Effect.runPromise(
					Effect.provide(programWithErrorCause(seed({})), layers),
				),
		).rejects.toThrowError("Pending schema migrations");
	});

	test<ProgramContext>("fails with missing configuration.ts", async (context) => {
		await context.migrator.migrateToLatest();

		unlinkSync(path.join(context.folder, "db", "configuration.ts"));
		writeFileSync(path.join(context.folder, "db", "seed.ts"), seedFile);

		expect(
			async () =>
				await Effect.runPromise(
					Effect.provide(programWithErrorCause(seed({})), layers),
				),
		).rejects.toThrowError(/Failed to load url/);
	});

	test<ProgramContext>("fails with seeded function missing", async (context) => {
		await context.migrator.migrateToLatest();

		writeFileSync(path.join(context.folder, "db", "seed.ts"), "");

		expect(
			async () =>
				await Effect.runPromise(
					Effect.provide(programWithErrorCause(seed({})), layers),
				),
		).rejects.toThrowError("Seeder function missing");
	});
});

const seedFile = `import type { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: Kysely<any>) {
	await db
		.insertInto("regulus_mint")
		.values([{ name: "test1" }])
		.execute();
}
`;

const anotherSeedFile = `import type { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: Kysely<any>) {
	await db
		.insertInto("regulus_mint")
		.values([{ name: "test1" }, { name: "test2" }])
		.execute();
}
`;