/* eslint-disable max-lines */
import { integer } from "@monorepo/pg/schema/column/data-types/integer.js";
import { text } from "@monorepo/pg/schema/column/data-types/text.js";
import { extension } from "@monorepo/pg/schema/extension.js";
import { schema } from "@monorepo/pg/schema/schema.js";
import { table } from "@monorepo/pg/schema/table.js";
import { unique } from "@monorepo/pg/schema/unique.js";
import { sql } from "kysely";
import { afterEach, beforeEach, describe, test } from "vitest";
import { type DbContext } from "~tests/__setup__/helpers/kysely.js";
import { testChangesetAndMigrations } from "~tests/__setup__/helpers/migration-success.js";
import {
	setUpContext,
	teardownContext,
} from "~tests/__setup__/helpers/test-context.js";

describe("Table drop migrations", () => {
	beforeEach<DbContext>(async (context) => {
		await setUpContext(context);
	});

	afterEach<DbContext>(async (context) => {
		await teardownContext(context);
	});

	test<DbContext>("drop empty tables", async (context) => {
		const dbSchema = schema({
			tables: {
				books: table({
					columns: {},
				}),
			},
		});

		await context.kysely.schema.createTable("users").execute();
		await context.kysely.schema.createTable("books").execute();
		await context.kysely.schema.createTable("organizations").execute();

		const expected = [
			{
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						"execute();",
					],
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
			},
			{
				tableName: "organizations",
				currentTableName: "organizations",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "organizations",
						type: "destructive",
					},
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("organizations")',
						"execute();",
					],
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("organizations")',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with columns", async (context) => {
		const dbSchema = schema({
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});
		await context.kysely.schema.createTable("organizations").execute();

		await context.kysely.schema
			.createTable("users")
			.addColumn("bigInt", "bigint")
			.addColumn("bigInt2", "bigint", (col) => col.notNull())
			.addColumn("bigSerial", "bigserial", (col) => col.notNull())
			.addColumn("boolean", "boolean")
			.addColumn("bytea", "bytea")
			.addColumn("char", "char(1)")
			.addColumn("char10", "char(10)")
			.addColumn("date", "date")
			.addColumn("doublePrecision", "double precision")
			.addColumn("float4", "float4")
			.addColumn("float8", "float8")
			.addColumn("smallint", "smallint")
			.addColumn("int4", "int4")
			.addColumn("int8", "int8")
			.addColumn("integer", "integer")
			.addColumn("integerAlwaysAsIdentity", "integer", (col) =>
				col.generatedAlwaysAsIdentity(),
			)
			.addColumn("integerDefaultAsIdentity", "integer", (col) =>
				col.generatedByDefaultAsIdentity(),
			)
			.execute();

		await context.kysely.schema
			.createTable("books")
			.addColumn("json", "json")
			.addColumn("jsonB", "jsonb")
			.addColumn("numeric", "numeric")
			.addColumn("numeric5", "numeric(5, 0)")
			.addColumn("numeric52", "numeric(5, 2)")
			.addColumn("real", "real")
			.addColumn("serial", "serial", (col) => col.notNull())
			.addColumn("text", "text")
			.addColumn("time", "time")
			.addColumn("time4", "time(4)")
			.addColumn("timeTz", "timetz")
			.addColumn("timeTz4", sql`timetz(4)`)
			.addColumn("timestamp", "timestamp")
			.addColumn("timestamp3", "timestamp(3)")
			.addColumn("timestampTz", "timestamptz")
			.addColumn("timestampTz3", "timestamptz(3)")
			.addColumn("uuid", "uuid")
			.addColumn("varChar", "varchar")
			.addColumn("varCharWithDefault", "varchar", (col) =>
				col.defaultTo(sql`\'foo\'::character varying`),
			)
			.addColumn("varChar255", sql`character varying(255)`)
			.execute();

		await sql`COMMENT ON COLUMN "books"."varCharWithDefault" IS 'ae72411e'`.execute(
			context.kysely,
		);

		const expected = [
			{
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("books")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("books")',
						'addColumn("time", "time")',
						'addColumn("timestamp", "timestamp")',
						'addColumn("timestampTz", sql`timestamp with time zone`)',
						'addColumn("timeTz", sql`time with time zone`)',
						'addColumn("serial", "serial", (col) => col.notNull())',
						'addColumn("real", "real")',
						'addColumn("uuid", "uuid")',
						'addColumn("json", "json")',
						'addColumn("jsonB", "jsonb")',
						'addColumn("numeric", "numeric")',
						'addColumn("text", "text")',
						'addColumn("varChar", sql`character varying`)',
						"addColumn(\"varCharWithDefault\", sql`character varying`, (col) => col.defaultTo(sql`'foo'::character varying`))",
						'addColumn("numeric5", "numeric(5, 0)")',
						'addColumn("numeric52", "numeric(5, 2)")',
						'addColumn("time4", "time(4)")',
						'addColumn("timestamp3", "timestamp(3)")',
						'addColumn("timestampTz3", sql`timestamp(3) with time zone`)',
						'addColumn("timeTz4", sql`time(4) with time zone`)',
						'addColumn("varChar255", sql`character varying(255)`)',
						"execute();",
					],
					[
						'await sql`COMMENT ON COLUMN "public"."books"."varCharWithDefault" IS \'ae72411e\'`',
						"execute(db);",
					],
				],
			},
			{
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("bigInt2", "bigint", (col) => col.notNull())',
						'addColumn("bigSerial", "bigserial", (col) => col.notNull())',
						'addColumn("bigInt", "bigint")',
						'addColumn("doublePrecision", "double precision")',
						'addColumn("float8", "double precision")',
						'addColumn("int8", "bigint")',
						'addColumn("integerAlwaysAsIdentity", "integer", (col) => col.notNull().generatedAlwaysAsIdentity())',
						'addColumn("integerDefaultAsIdentity", "integer", (col) => col.notNull().generatedByDefaultAsIdentity())',
						'addColumn("date", "date")',
						'addColumn("float4", "real")',
						'addColumn("int4", "integer")',
						'addColumn("integer", "integer")',
						'addColumn("smallint", sql`smallint`)',
						'addColumn("boolean", "boolean")',
						'addColumn("bytea", "bytea")',
						'addColumn("char", sql`character(1)`)',
						'addColumn("char10", sql`character(10)`)',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with primary key", async (context) => {
		const dbSchema = schema({
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});
		await context.kysely.schema.createTable("organizations").execute();

		await context.kysely.schema
			.createTable("users")
			.addColumn("id", "serial", (col) => col.notNull())
			.execute();
		await sql`ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY ("id")`.execute(
			context.kysely,
		);

		await context.kysely.schema
			.createTable("books")
			.addColumn("id", "bigserial", (col) => col.notNull())
			.execute();
		await sql`ALTER TABLE books ADD CONSTRAINT books_pkey PRIMARY KEY ("id")`.execute(
			context.kysely,
		);

		const expected = [
			{
				down: [
					[
						'await db.withSchema("public").schema',
						'alterTable("books")',
						'addPrimaryKeyConstraint("books_pkey", ["id"])',
						"execute();",
					],
				],
				priority: 1004,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropPrimaryKey",
				phase: "contract",
				up: [[]],
			},
			{
				down: [
					[
						'await db.withSchema("public").schema',
						'alterTable("users")',
						'addPrimaryKeyConstraint("users_pkey", ["id"])',
						"execute();",
					],
				],
				priority: 1004,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropPrimaryKey",
				phase: "contract",
				up: [[]],
			},
			{
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("books")',
						'addColumn("id", "bigserial", (col) => col.notNull())',
						"execute();",
					],
				],
				priority: 1006,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("books")',
						"execute();",
					],
				],
			},
			{
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("id", "serial", (col) => col.notNull())',
						"execute();",
					],
				],
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with unique constraints", async (context) => {
		await context.kysely.schema
			.createTable("books")
			.addColumn("id", "integer")
			.execute();

		await context.kysely.schema
			.alterTable("books")
			.addUniqueConstraint("books_a91945e0_monolayer_key", ["id"], (uc) =>
				uc.nullsNotDistinct(),
			)
			.execute();

		await context.kysely.schema
			.createTable("users")
			.addColumn("id", "serial")
			.addColumn("fullName", "varchar")
			.execute();

		await context.kysely.schema
			.alterTable("users")
			.addUniqueConstraint("users_83137b76_monolayer_key", ["id", "fullName"])
			.execute();

		const books = table({
			columns: {
				id: integer(),
			},
			constraints: {
				unique: [unique(["id"]).nullsNotDistinct()],
			},
		});

		const dbSchema = schema({
			tables: {
				books,
			},
		});

		const expected = [
			{
				priority: 811,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropUniqueConstraint",
				phase: "contract",
				up: [[]],
				down: [
					[
						'await db.withSchema("public").schema',
						'alterTable("users")',
						'addUniqueConstraint("users_83137b76_monolayer_key", ["fullName", "id"])',
						"execute();",
					],
				],
			},
			{
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("id", "serial", (col) => col.notNull())',
						'addColumn("fullName", sql`character varying`)',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with foreign keys", async (context) => {
		const dbSchema = schema({
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});
		await context.kysely.schema.createTable("organizations").execute();

		await context.kysely.schema
			.createTable("books")
			.addColumn("id", "bigserial", (col) => col.notNull())
			.execute();
		await sql`ALTER TABLE books ADD CONSTRAINT books_pkey PRIMARY KEY ("id")`.execute(
			context.kysely,
		);

		await context.kysely.schema
			.createTable("users")
			.addColumn("id", "serial", (col) => col.notNull())
			.execute();
		await sql`ALTER TABLE users ADD CONSTRAINT "users_262b6933_monolayer_fk" FOREIGN KEY ("id") REFERENCES books ("id") ON DELETE SET NULL ON UPDATE SET NULL`.execute(
			context.kysely,
		);

		const expected = [
			{
				priority: 810,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropForeignKey",
				phase: "contract",
				up: [[]],
				down: [
					[
						`await sql\`\${sql.raw(
  db
    .withSchema("public")
    .schema.alterTable("users")
    .addForeignKeyConstraint("users_8abc8e0b_monolayer_fk", ["id"], "public.books", ["id"])
    .onDelete("set null")
    .onUpdate("set null")
    .compile()
    .sql.concat(" not valid")
)}\`.execute(db);`,
					],
					[
						'await sql`ALTER TABLE "public"."users" VALIDATE CONSTRAINT "users_8abc8e0b_monolayer_fk"`',
						"execute(db);",
					],
				],
			},
			{
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("id", "serial", (col) => col.notNull())',
						"execute();",
					],
				],
			},
			{
				priority: 1004,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropPrimaryKey",
				phase: "contract",
				up: [[]],
				down: [
					[
						'await db.withSchema("public").schema',
						'alterTable("books")',
						'addPrimaryKeyConstraint("books_pkey", ["id"])',
						"execute();",
					],
				],
			},
			{
				priority: 1006,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("books")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("books")',
						'addColumn("id", "bigserial", (col) => col.notNull())',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with self referential foreign keys", async (context) => {
		const dbSchema = schema({
			tables: {},
		});
		await context.kysely.schema
			.createTable("tree")
			.addColumn("node_id", "integer", (col) => col.generatedAlwaysAsIdentity())
			.addColumn("parent_id", "integer")
			.execute();

		await sql`ALTER TABLE tree ADD CONSTRAINT tree_pkey PRIMARY KEY ("node_id")`.execute(
			context.kysely,
		);

		await context.kysely.schema
			.alterTable("tree")
			.addForeignKeyConstraint(
				"tree_136bac6e_monolayer_fk",
				["parent_id"],
				"tree",
				["node_id"],
			)
			.execute();

		const expected = [
			{
				priority: 810,
				tableName: "tree",
				currentTableName: "tree",
				schemaName: "public",
				type: "dropForeignKey",
				phase: "contract",
				up: [[]],
				down: [
					[
						`await sql\`\${sql.raw(
  db
    .withSchema("public")
    .schema.alterTable("tree")
    .addForeignKeyConstraint("tree_136bac6e_monolayer_fk", ["parent_id"], "public.tree", ["node_id"])
    .onDelete("no action")
    .onUpdate("no action")
    .compile()
    .sql.concat(" not valid")
)}\`.execute(db);`,
					],
					[
						'await sql`ALTER TABLE "public"."tree" VALIDATE CONSTRAINT "tree_136bac6e_monolayer_fk"`',
						"execute(db);",
					],
				],
			},
			{
				priority: 1004,
				tableName: "tree",
				currentTableName: "tree",
				schemaName: "public",
				type: "dropPrimaryKey",
				phase: "contract",
				up: [[]],
				down: [
					[
						'await db.withSchema("public").schema',
						'alterTable("tree")',
						'addPrimaryKeyConstraint("tree_pkey", ["node_id"])',
						"execute();",
					],
				],
			},
			{
				priority: 1006,
				tableName: "tree",
				currentTableName: "tree",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "tree",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("tree")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("tree")',
						'addColumn("node_id", "integer", (col) => col.notNull().generatedAlwaysAsIdentity())',
						'addColumn("parent_id", "integer")',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with check constraints", async (context) => {
		const dbSchema = schema({
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});
		await context.kysely.schema.createTable("organizations").execute();

		await context.kysely.schema
			.createTable("books")
			.addColumn("id", "integer", (col) => col.notNull())
			.execute();

		await context.kysely.schema
			.alterTable("books")
			.addCheckConstraint("books_971041d9_monolayer_chk", sql`"id" > 50`)
			.execute();

		await sql`COMMENT ON CONSTRAINT "books_971041d9_monolayer_chk" ON "books" IS \'971041d9_monolayer_chk\'`.execute(
			context.kysely,
		);

		const expected = [
			{
				priority: 812,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropCheckConstraint",
				phase: "contract",
				down: [
					[
						'await sql`ALTER TABLE "public"."books" ADD CONSTRAINT "books_971041d9_monolayer_chk" CHECK ((id > 50)) NOT VALID`',
						"execute(db);",
					],
					[
						'await sql`ALTER TABLE "public"."books" VALIDATE CONSTRAINT "books_971041d9_monolayer_chk"`',
						"execute(db);",
					],
				],
				up: [[]],
			},
			{
				priority: 1006,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("books")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("books")',
						'addColumn("id", "integer", (col) => col.notNull())',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with indexes", async (context) => {
		const dbSchema = schema({
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});
		await context.kysely.schema.createTable("organizations").execute();

		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.execute();
		await sql`create index "users_qa1qaw23_monolayer_idx" on "users" ("name");`.execute(
			context.kysely,
		);
		await context.kysely.schema
			.createTable("books")
			.addColumn("id", "text")
			.execute();
		await sql`create unique index "books_mk3e4r3e_monolayer_idx" on "books" ("id");`.execute(
			context.kysely,
		);

		const expected = [
			{
				priority: 800,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropIndex",
				phase: "contract",
				up: [[]],
				down: [
					[
						"await sql`CREATE UNIQUE INDEX books_mk3e4r3e_monolayer_idx ON public.books USING btree (id)`",
						"execute(db);",
					],
				],
			},
			{
				priority: 800,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropIndex",
				phase: "contract",
				up: [[]],
				down: [
					[
						"await sql`CREATE INDEX users_qa1qaw23_monolayer_idx ON public.users USING btree (name)`",
						"execute(db);",
					],
				],
			},
			{
				priority: 1006,
				tableName: "books",
				currentTableName: "books",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("books")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("books")',
						'addColumn("id", "text")',
						"execute();",
					],
				],
			},
			{
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("name", "text")',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with enums", async (context) => {
		const dbSchema = schema({});

		await context.kysely.schema
			.createType("role")
			.asEnum(["admin", "user"])
			.execute();
		await sql`COMMENT ON TYPE "role" IS 'monolayer'`.execute(context.kysely);

		await context.kysely.schema
			.createTable("users")
			.addColumn("name", "text")
			.addColumn("role", sql`role`)
			.execute();

		const expected = [
			{
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("role", sql`"role"`)',
						'addColumn("name", "text")',
						"execute();",
					],
				],
			},
			{
				priority: 6003,
				tableName: "none",
				currentTableName: "none",
				schemaName: "public",
				type: "dropEnum",
				phase: "contract",
				up: [
					[
						'await db.withSchema("public").schema',
						'dropType("role")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createType("role")',
						'asEnum(["admin", "user"])',
						"execute();",
					],
					[
						'await sql`COMMENT ON TYPE "public"."role" IS \'monolayer\'`',
						"execute(db);",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with triggers", async (context) => {
		await context.kysely.schema
			.createTable("teams")
			.addColumn("name", "text")
			.execute();

		await context.kysely.schema
			.createTable("users")
			.addColumn("id", "integer")
			.addColumn("createdAt", "timestamp", (col) => col.defaultTo(sql`now()`))
			.addColumn("updatedAt", "timestamp", (col) => col.defaultTo(sql`now()`))
			.execute();

		await sql`COMMENT ON COLUMN "users"."updatedAt" IS 'ae72411e'`.execute(
			context.kysely,
		);

		await sql`COMMENT ON COLUMN "users"."createdAt" IS 'ae72411e'`.execute(
			context.kysely,
		);

		await sql`CREATE EXTENSION IF NOT EXISTS moddatetime;`.execute(
			context.kysely,
		);

		await sql`CREATE OR REPLACE TRIGGER foo_before_update_monolayer_trg
							BEFORE UPDATE ON users
							FOR EACH ROW
							EXECUTE FUNCTION moddatetime(updatedAt);
							COMMENT ON TRIGGER foo_before_update_monolayer_trg ON users IS 'c2304485eb6b41782bcb408b5118bc67aca3fae9eb9210ad78ce93ddbf438f67';`.execute(
			context.kysely,
		);

		const dbSchema = schema({
			tables: {
				teams: table({
					columns: {
						name: text(),
					},
				}),
			},
		});

		const expected = [
			{
				priority: 1001,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTrigger",
				phase: "contract",
				up: [[]],
				down: [
					[
						"await sql`CREATE OR REPLACE TRIGGER foo_before_update_monolayer_trg BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION moddatetime('updatedat')`",
						"execute(db);",
					],
				],
				warnings: [
					{
						code: "D004",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
			},
			{
				priority: 1006,
				tableName: "users",
				currentTableName: "users",
				schemaName: "public",
				type: "dropTable",
				phase: "contract",
				warnings: [
					{
						code: "D002",
						schema: "public",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("public").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("public").schema',
						'createTable("users")',
						'addColumn("createdAt", "timestamp", (col) => col.defaultTo(sql`now()`))',
						'addColumn("updatedAt", "timestamp", (col) => col.defaultTo(sql`now()`))',
						'addColumn("id", "integer")',
						"execute();",
					],
					[
						'await sql`COMMENT ON COLUMN "public"."users"."createdAt" IS \'ae72411e\'`',
						"execute(db);",
					],
					[
						'await sql`COMMENT ON COLUMN "public"."users"."updatedAt" IS \'ae72411e\'`',
						"execute(db);",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: {
				id: "default",
				schemas: [dbSchema],
				extensions: [extension("moddatetime")],
			},
			expected,
			down: "same",
		});
	});

	test<DbContext>("drop table with in demo schema", async (context) => {
		const dbSchema = schema({
			name: "demo",
			tables: {
				organizations: table({
					columns: {},
				}),
			},
		});

		await sql`CREATE SCHEMA IF NOT EXISTS "demo"`.execute(context.kysely);
		await sql`COMMENT ON SCHEMA "demo" is 'monolayer'`.execute(context.kysely);

		await context.kysely
			.withSchema("demo")
			.schema.createTable("organizations")
			.execute();

		await context.kysely
			.withSchema("demo")
			.schema.createTable("users")
			.addColumn("bigInt", "bigint")
			.addColumn("bigInt2", "bigint", (col) => col.notNull())
			.addColumn("bigSerial", "bigserial", (col) => col.notNull())
			.addColumn("boolean", "boolean")
			.addColumn("bytea", "bytea")
			.addColumn("char", "char(1)")
			.addColumn("char10", "char(10)")
			.addColumn("date", "date")
			.addColumn("doublePrecision", "double precision")
			.addColumn("float4", "float4")
			.addColumn("float8", "float8")
			.addColumn("smallint", "smallint")
			.addColumn("int4", "int4")
			.addColumn("int8", "int8")
			.addColumn("integer", "integer")
			.addColumn("integerAlwaysAsIdentity", "integer", (col) =>
				col.generatedAlwaysAsIdentity(),
			)
			.addColumn("integerDefaultAsIdentity", "integer", (col) =>
				col.generatedByDefaultAsIdentity(),
			)
			.execute();

		await context.kysely
			.withSchema("demo")
			.schema.createTable("books")
			.addColumn("json", "json")
			.addColumn("jsonB", "jsonb")
			.addColumn("numeric", "numeric")
			.addColumn("numeric5", "numeric(5, 0)")
			.addColumn("numeric52", "numeric(5, 2)")
			.addColumn("real", "real")
			.addColumn("serial", "serial", (col) => col.notNull())
			.addColumn("text", "text")
			.addColumn("time", "time")
			.addColumn("time4", "time(4)")
			.addColumn("timeTz", "timetz")
			.addColumn("timeTz4", sql`timetz(4)`)
			.addColumn("timestamp", "timestamp")
			.addColumn("timestamp3", "timestamp(3)")
			.addColumn("timestampTz", "timestamptz")
			.addColumn("timestampTz3", "timestamptz(3)")
			.addColumn("uuid", "uuid")
			.addColumn("varChar", "varchar")
			.addColumn("varCharWithDefault", "varchar", (col) =>
				col.defaultTo(sql`\'foo\'::character varying`),
			)
			.addColumn("varChar255", sql`character varying(255)`)
			.execute();

		await sql`COMMENT ON COLUMN "demo"."books"."varCharWithDefault" IS 'ae72411e'`.execute(
			context.kysely,
		);

		const expected = [
			{
				tableName: "books",
				currentTableName: "books",
				schemaName: "demo",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "demo",
						table: "books",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("demo").schema',
						'dropTable("books")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("demo").schema',
						'createTable("books")',
						'addColumn("time", "time")',
						'addColumn("timestamp", "timestamp")',
						'addColumn("timestampTz", sql`timestamp with time zone`)',
						'addColumn("timeTz", sql`time with time zone`)',
						'addColumn("serial", "serial", (col) => col.notNull())',
						'addColumn("real", "real")',
						'addColumn("uuid", "uuid")',
						'addColumn("json", "json")',
						'addColumn("jsonB", "jsonb")',
						'addColumn("numeric", "numeric")',
						'addColumn("text", "text")',
						'addColumn("varChar", sql`character varying`)',
						"addColumn(\"varCharWithDefault\", sql`character varying`, (col) => col.defaultTo(sql`'foo'::character varying`))",
						'addColumn("numeric5", "numeric(5, 0)")',
						'addColumn("numeric52", "numeric(5, 2)")',
						'addColumn("time4", "time(4)")',
						'addColumn("timestamp3", "timestamp(3)")',
						'addColumn("timestampTz3", sql`timestamp(3) with time zone`)',
						'addColumn("timeTz4", sql`time(4) with time zone`)',
						'addColumn("varChar255", sql`character varying(255)`)',
						"execute();",
					],
					[
						'await sql`COMMENT ON COLUMN "demo"."books"."varCharWithDefault" IS \'ae72411e\'`',
						"execute(db);",
					],
				],
			},
			{
				tableName: "users",
				currentTableName: "users",
				schemaName: "demo",
				type: "dropTable",
				phase: "contract",
				priority: 1006,
				warnings: [
					{
						code: "D002",
						schema: "demo",
						table: "users",
						type: "destructive",
					},
				],
				up: [
					[
						'await db.withSchema("demo").schema',
						'dropTable("users")',
						"execute();",
					],
				],
				down: [
					[
						'await db.withSchema("demo").schema',
						'createTable("users")',
						'addColumn("bigInt2", "bigint", (col) => col.notNull())',
						'addColumn("bigSerial", "bigserial", (col) => col.notNull())',
						'addColumn("bigInt", "bigint")',
						'addColumn("doublePrecision", "double precision")',
						'addColumn("float8", "double precision")',
						'addColumn("int8", "bigint")',
						'addColumn("integerAlwaysAsIdentity", "integer", (col) => col.notNull().generatedAlwaysAsIdentity())',
						'addColumn("integerDefaultAsIdentity", "integer", (col) => col.notNull().generatedByDefaultAsIdentity())',
						'addColumn("date", "date")',
						'addColumn("float4", "real")',
						'addColumn("int4", "integer")',
						'addColumn("integer", "integer")',
						'addColumn("smallint", sql`smallint`)',
						'addColumn("boolean", "boolean")',
						'addColumn("bytea", "bytea")',
						'addColumn("char", sql`character(1)`)',
						'addColumn("char10", sql`character(10)`)',
						"execute();",
					],
				],
			},
		];

		await testChangesetAndMigrations({
			context,
			configuration: { id: "default", schemas: [dbSchema] },
			expected,
			down: "same",
		});
	});
});
