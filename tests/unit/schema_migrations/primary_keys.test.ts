/* eslint-disable max-lines */
import { afterEach, beforeEach, describe, test } from "vitest";
import { text } from "~/schema/pg_column.js";
import { pgDatabase } from "~/schema/pg_database.js";
import { primaryKey } from "~/schema/pg_primary_key.js";
import { table } from "~/schema/pg_table.js";
import { testChangesetAndMigrations } from "~tests/helpers/migration_success.js";
import { type DbContext } from "~tests/setup.js";
import { setUpContext, teardownContext } from "../../helpers/test_context.js";

describe("Database migrations", () => {
	beforeEach<DbContext>(async (context) => {
		await setUpContext(context);
	});

	afterEach<DbContext>(async (context) => {
		await teardownContext(context);
	});

	test<DbContext>("add primary keys", async (context) => {
		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.addColumn("fullName", "text")
			.execute();

		await context.kysely.schema
			.createTable("books")
			.addColumn("name", "text")
			.execute();

		const users = table({
			columns: {
				fullName: text(),
				name: text(),
			},
			constraints: {
				primaryKey: primaryKey(["fullName", "name"]),
			},
		});

		const books = table({
			columns: {
				name: text(),
			},
			constraints: {
				primaryKey: primaryKey(["name"]),
			},
		});

		const database = pgDatabase({
			tables: {
				users,
				books,
			},
		});

		const expected = [
			{
				priority: 4001,
				tableName: "users",
				type: "createPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", ["fullName", "name"])',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_fullName_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("fullName", (col) => col.dropNotNull())',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
			},
			{
				priority: 4001,
				tableName: "books",
				type: "createPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("books")',
						'addPrimaryKeyConstraint("books_name_kinetic_pk", ["name"])',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("books")',
						'dropConstraint("books_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("books")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			database,
			expected,
			down: "reverse",
		});
	});

	test<DbContext>("remove primary keys", async (context) => {
		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.addColumn("fullName", "text")
			.execute();

		await context.kysely.schema
			.alterTable("users")
			.addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", [
				"name",
				"fullName",
			])
			.execute();

		await context.kysely.schema
			.createTable("books")
			.addColumn("name", "text")
			.execute();

		await context.kysely.schema
			.alterTable("books")
			.addPrimaryKeyConstraint("books_name_kinetic_pk", ["name"])
			.execute();

		const users = table({
			columns: {
				fullName: text(),
				name: text(),
			},
		});

		const books = table({
			columns: {
				name: text(),
			},
		});

		const database = pgDatabase({
			tables: {
				users,
				books,
			},
		});

		const expected = [
			{
				priority: 1004,
				tableName: "books",
				type: "dropPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("books")',
						'dropConstraint("books_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("books")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("books")',
						'addPrimaryKeyConstraint("books_name_kinetic_pk", ["name"])',
						"execute();",
					],
				],
			},
			{
				priority: 1004,
				tableName: "users",
				type: "dropPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_fullName_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("fullName", (col) => col.dropNotNull())',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", ["fullName", "name"])',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			database,
			expected,
			down: "reverse",
		});
	});

	test<DbContext>("change primary key", async (context) => {
		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.addColumn("fullName", "text")
			.execute();

		await context.kysely.schema
			.alterTable("users")
			.addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", [
				"name",
				"fullName",
			])
			.execute();

		const users = table({
			columns: {
				fullName: text(),
				name: text(),
			},
			constraints: {
				primaryKey: primaryKey(["name"]),
			},
		});

		const database = pgDatabase({
			tables: {
				users,
			},
		});

		const expected = [
			{
				priority: 1004,
				tableName: "users",
				type: "dropPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_fullName_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("fullName", (col) => col.dropNotNull())',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", ["fullName", "name"])',
						"execute();",
					],
				],
			},
			{
				priority: 4001,
				tableName: "users",
				type: "createPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_name_kinetic_pk", ["name"])',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			database,
			expected,
			down: "reverse",
		});
	});

	test<DbContext>("change a primary key and notNull on affected columns does not remove not null constraint", async (context) => {
		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.addColumn("fullName", "text")
			.execute();

		await context.kysely.schema
			.alterTable("users")
			.addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", [
				"name",
				"fullName",
			])
			.execute();

		const users = table({
			columns: {
				fullName: text().notNull(),
				name: text(),
			},
			constraints: {
				primaryKey: primaryKey(["name"]),
			},
		});

		const database = pgDatabase({
			tables: {
				users,
			},
		});

		const expected = [
			{
				priority: 1004,
				tableName: "users",
				type: "dropPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_fullName_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_fullName_name_kinetic_pk", ["fullName", "name"])',
						"execute();",
					],
				],
			},
			{
				priority: 4001,
				tableName: "users",
				type: "createPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_name_kinetic_pk", ["name"])',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			database,
			expected,
			down: "reverse",
		});
	});

	test<DbContext>("change a primary key drops not null on affected columns with explicit notNull in new primary key", async (context) => {
		await context.kysely.schema
			.createTable("users")
			.addColumn("email", "text")
			.addColumn("name", "text")
			.execute();

		await context.kysely.schema
			.alterTable("users")
			.addPrimaryKeyConstraint("users_name_kinetic_pk", ["name"])
			.execute();

		const users = table({
			columns: {
				name: text(),
				email: text().notNull(),
			},
			constraints: {
				primaryKey: primaryKey(["email"]),
			},
		});

		const database = pgDatabase({
			tables: {
				users,
			},
		});

		const expected = [
			{
				priority: 1004,
				tableName: "users",
				type: "dropPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_name_kinetic_pk")',
						"execute();",
					],
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("name", (col) => col.dropNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_name_kinetic_pk", ["name"])',
						"execute();",
					],
				],
			},
			{
				priority: 3008,
				tableName: "users",
				type: "changeColumn",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("email", (col) => col.setNotNull())',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'alterColumn("email", (col) => col.dropNotNull())',
						"execute();",
					],
				],
			},
			{
				priority: 4001,
				tableName: "users",
				type: "createPrimaryKey",
				up: [
					[
						"await db.schema",
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_email_kinetic_pk", ["email"])',
						"execute();",
					],
				],
				down: [
					[
						"await db.schema",
						'alterTable("users")',
						'dropConstraint("users_email_kinetic_pk")',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			database,
			expected,
			down: "reverse",
		});
	});
});
