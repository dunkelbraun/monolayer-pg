import { Effect, Ref } from "effect";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	SchemaNameError,
	validateUniqueSchemaName,
} from "~/changeset/validate-unique-schema-name.js";
import { schema } from "~/database/schema/schema.js";
import { AppEnvironment, type AppEnv } from "~/state/app-environment.js";
import {
	setupProgramContext,
	teardownProgramContext,
	type ProgramContext,
} from "~tests/__setup__/helpers/test-context.js";

describe("validate uique schema name", () => {
	beforeEach<ProgramContext>(async (context) => {
		await setupProgramContext(context);
	});

	afterEach<ProgramContext>(async (context) => {
		await teardownProgramContext(context);
	});

	test("pass", async () => {
		const dbSchema = schema({});
		const anotherSchema = schema({
			name: "another",
		});

		const env: AppEnv = {
			name: "development",
			configurationName: "default",
			folder: ".",
			configuration: {
				schemas: [dbSchema, anotherSchema],
				camelCasePlugin: { enabled: false },
				extensions: [],
				environments: {
					development: {},
				},
			},
		};

		const result = Effect.runSync(
			Effect.provideServiceEffect(
				validateUniqueSchemaName(),
				AppEnvironment,
				Ref.make(env),
			),
		);
		expect(result).toBe(true);
	});

	test("fail with multiple public schemas with same name", async () => {
		const dbSchema = schema({});
		const anotherSchema = schema({});

		const env: AppEnv = {
			name: "development",
			configurationName: "default",
			folder: ".",
			configuration: {
				schemas: [dbSchema, anotherSchema],
				camelCasePlugin: { enabled: false },
				extensions: [],
				environments: {
					development: {},
				},
			},
		};

		const result = Effect.runSync(
			Effect.provideServiceEffect(
				validateUniqueSchemaName(),
				AppEnvironment,
				Ref.make(env),
			).pipe(
				Effect.catchAll((error) => {
					return Effect.succeed(error);
				}),
			),
		);
		expect(result).toBeInstanceOf(SchemaNameError);
		const error = result as SchemaNameError;
		expect(error.message).toBe(
			"Multiple schemas with the same name: 'public'.",
		);
	});

	test("fail with multiple schemas with same name", async () => {
		const dbSchema = schema({ name: "demo" });
		const anotherSchema = schema({ name: "demo" });

		const env: AppEnv = {
			name: "development",
			configurationName: "default",
			folder: ".",
			configuration: {
				schemas: [dbSchema, anotherSchema],
				camelCasePlugin: { enabled: false },
				extensions: [],
				environments: {
					development: {},
				},
			},
		};

		const result = Effect.runSync(
			Effect.provideServiceEffect(
				validateUniqueSchemaName(),
				AppEnvironment,
				Ref.make(env),
			).pipe(
				Effect.catchAll((error) => {
					return Effect.succeed(error);
				}),
			),
		);
		expect(result).toBeInstanceOf(SchemaNameError);
		const error = result as SchemaNameError;
		expect(error.message).toBe("Multiple schemas with the same name: 'demo'.");
	});
});