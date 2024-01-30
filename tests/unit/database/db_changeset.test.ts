import { beforeEach, describe, expect, test } from "vitest";
import {
	TableColumnInfo,
	dbDiff,
	isColumnChangeDifference,
	isColumnCreateDifference,
	isColumnDropDifference,
	isTableCreateDifference,
	isTableDropDifference,
} from "~/database/change_set/diff.js";
import { dbChangeset } from "~/database/db_changeset.js";
import { pgIndex } from "~/database/schema/indexes.js";
import { columnInfoFactory } from "~tests/helpers/factories/column_info_factory.js";

type TableDiffContext = {
	localSchema: TableColumnInfo;
	dbSchema: TableColumnInfo;
};

describe("#dbDiff", () => {
	beforeEach((context: TableDiffContext) => {
		context.localSchema = {
			users: {
				name: columnInfoFactory({
					tableName: "users",
					columnName: "name",
					dataType: "varchar",
					defaultValue: "hello",
				}),
				email: columnInfoFactory({
					tableName: "users",
					columnName: "email",
					dataType: "varchar(255)",
					characterMaximumLength: 255,
				}),
			},
			members: {
				name: columnInfoFactory({
					tableName: "members",
					columnName: "name",
					dataType: "varchar",
					defaultValue: "hello",
				}),
				email: columnInfoFactory({
					tableName: "members",
					columnName: "email",
					dataType: "varchar(255)",
					characterMaximumLength: 255,
				}),
				city: columnInfoFactory({
					tableName: "members",
					columnName: "city",
					dataType: "text",
				}),
			},
			accounts: {
				name: columnInfoFactory({
					tableName: "accounts",
					columnName: "name",
					dataType: "text",
				}),
			},
			memberships: {
				title: columnInfoFactory({
					tableName: "memberships",
					columnName: "title",
					dataType: "text",
				}),
			},
		};
		context.dbSchema = {
			accounts: {
				name: columnInfoFactory({
					tableName: "accounts",
					columnName: "name",
					dataType: "text",
				}),
			},
			books: {
				name: columnInfoFactory({
					tableName: "books",
					columnName: "name",
					dataType: "text",
				}),
			},
			members: {
				name: columnInfoFactory({
					tableName: "members",
					columnName: "name",
					dataType: "text",
				}),
				email: columnInfoFactory({
					tableName: "members",
					columnName: "email",
					dataType: "text",
				}),
				location: columnInfoFactory({
					tableName: "members",
					columnName: "location",
					dataType: "text",
				}),
			},
		};
	});

	test("results", (context: TableDiffContext) => {
		const diff = dbDiff(
			{ columns: context.localSchema },
			{ columns: context.dbSchema },
		);
		expect(diff).toStrictEqual({
			added: [
				{
					path: ["users"],
					type: "CREATE",
					value: {
						name: columnInfoFactory({
							tableName: "users",
							columnName: "name",
							dataType: "varchar",
							defaultValue: "hello",
						}),
						email: columnInfoFactory({
							tableName: "users",
							columnName: "email",
							dataType: "varchar(255)",
							characterMaximumLength: 255,
						}),
					},
				},
				{
					path: ["memberships"],
					type: "CREATE",
					value: {
						title: columnInfoFactory({
							tableName: "memberships",
							columnName: "title",
							dataType: "text",
						}),
					},
				},
			],
			removed: [
				{
					path: ["books"],
					type: "REMOVE",
					oldValue: {
						name: columnInfoFactory({
							tableName: "books",
							columnName: "name",
							dataType: "text",
						}),
					},
				},
			],
			changed: {
				members: [
					{
						path: ["members", "name", "dataType"],
						type: "CHANGE",
						value: "varchar",
						oldValue: "text",
					},
					{
						path: ["members", "name", "defaultValue"],
						type: "CHANGE",
						value: "hello",
						oldValue: null,
					},
					{
						path: ["members", "email", "dataType"],
						type: "CHANGE",
						value: "varchar(255)",
						oldValue: "text",
					},
					{
						path: ["members", "email", "characterMaximumLength"],
						type: "CHANGE",
						value: 255,
						oldValue: null,
					},
					{
						path: ["members", "location"],
						type: "REMOVE",
						oldValue: columnInfoFactory({
							tableName: "members",
							columnName: "location",
							dataType: "text",
						}),
					},
					{
						path: ["members", "city"],
						type: "CREATE",
						value: columnInfoFactory({
							tableName: "members",
							columnName: "city",
							dataType: "text",
						}),
					},
				],
			},
		});
	});

	test("difference type guards", (context: TableDiffContext) => {
		const diff = dbDiff(
			{ columns: context.localSchema },
			{ columns: context.dbSchema },
		);
		for (const added of diff.added) {
			expect(isTableCreateDifference(added)).toBe(true);
		}
		for (const changed of diff.removed) {
			expect(isTableDropDifference(changed)).toBe(true);
		}
		for (const changed of Object.entries(diff.changed)) {
			const changes = changed[1];
			for (const change of changes) {
				if (change.type === "CHANGE") {
					expect(isColumnChangeDifference(change)).toBe(true);
				}
				if (change.type === "CREATE") {
					expect(isColumnCreateDifference(change)).toBe(true);
				}
				if (change.type === "REMOVE") {
					expect(isColumnDropDifference(change)).toBe(true);
				}
			}
		}
	});
});

describe("#dbChangeset", () => {
	test("added tables", () => {
		const changeset = dbChangeset(
			{
				columns: {
					users: {
						name: columnInfoFactory({
							tableName: "users",
							columnName: "name",
							dataType: "varchar",
						}),
					},
					books: {
						id: columnInfoFactory({
							tableName: "books",
							columnName: "id",
							dataType: "serial",
							primaryKey: true,
						}),
						name: columnInfoFactory({
							tableName: "books",
							columnName: "name",
							dataType: "text",
						}),
					},
					members: {
						name: columnInfoFactory({
							tableName: "members",
							columnName: "name",
							dataType: "varchar",
							defaultValue: "hello",
						}),
						email: columnInfoFactory({
							tableName: "members",
							columnName: "email",
							dataType: "varchar(255)",
							characterMaximumLength: 255,
						}),
						city: columnInfoFactory({
							tableName: "members",
							columnName: "city",
							dataType: "text",
							isNullable: false,
						}),
					},
					samples: {
						id: columnInfoFactory({
							tableName: "samples",
							columnName: "id",
							dataType: "bigserial",
							isNullable: false,
							primaryKey: true,
						}),
						name: columnInfoFactory({
							tableName: "samples",
							columnName: "name",
							dataType: "text",
							isNullable: false,
						}),
					},
					addresses: {
						id: columnInfoFactory({
							tableName: "addresses",
							columnName: "id",
							dataType: "serial",
							primaryKey: true,
						}),
						country: columnInfoFactory({
							tableName: "members",
							columnName: "country",
							dataType: "text",
						}),
						name: columnInfoFactory({
							tableName: "members",
							columnName: "name",
							dataType: "varchar",
							defaultValue: "hello",
							isNullable: true,
						}),
						email: columnInfoFactory({
							tableName: "members",
							columnName: "email",
							dataType: "varchar",
						}),
						city: columnInfoFactory({
							tableName: "members",
							columnName: "city",
							dataType: "text",
							isNullable: false,
						}),
					},
				},
				indexes: {
					samples: [pgIndex("samples_name_idx", (idx) => idx.column("name"))],
					books: [pgIndex("books_name_idx", (idx) => idx.column("name"))],
					addresses: [
						pgIndex("addresses_city_idx", (idx) =>
							idx.column("city").using("btree").unique(),
						),
						pgIndex("addresses_city_and_country_idx", (idx) =>
							idx.columns(["city", "country"]).using("btree").unique(),
						),
					],
				},
			},
			{
				columns: {
					users: {
						name: columnInfoFactory({
							tableName: "users",
							columnName: "name",
							dataType: "varchar",
						}),
					},
					shops: {
						name: columnInfoFactory({
							tableName: "members",
							columnName: "name",
							dataType: "varchar",
							defaultValue: "hello",
						}),
						email: columnInfoFactory({
							tableName: "members",
							columnName: "email",
							dataType: "varchar(255)",
							characterMaximumLength: 255,
						}),
						city: columnInfoFactory({
							tableName: "members",
							columnName: "city",
							dataType: "text",
							isNullable: false,
						}),
					},
					samples: {
						id: columnInfoFactory({
							tableName: "samples",
							columnName: "id",
							dataType: "bigserial",
							isNullable: false,
						}),
						name: columnInfoFactory({
							tableName: "samples",
							columnName: "name",
							dataType: "text",
							isNullable: false,
							primaryKey: true,
						}),
					},
					addresses: {
						name: columnInfoFactory({
							tableName: "members",
							columnName: "name",
							dataType: "text",
							isNullable: false,
						}),
						email: columnInfoFactory({
							tableName: "members",
							columnName: "email",
							dataType: "varchar(255)",
							characterMaximumLength: 255,
						}),
						city: columnInfoFactory({
							tableName: "members",
							columnName: "city",
							dataType: "text",
							defaultValue: "bcn",
						}),
					},
				},
				indexes: {
					addresses: {
						addresses_city_idx:
							'create unique index "addresses_city_idx" on "addresses" using btree ("city")',
						addresses_country_idx:
							'create unique index "addresses_country_idx" on "addresses" using btree ("country")',
					},
					shops: {
						shops_mail_idx:
							'create unique index "shops_mail_idx" on "shops" using btree ("email")',
						shops_city_idx:
							'create unique index "shops_city_idx" on "shops" using btree ("city")',
					},
				},
			},
		);

		const expected = {
			books: {
				columns: {
					tableName: "books",
					type: "create",
					up: [
						'createTable("books")',
						'addColumn("id", "serial", (col) => col.primaryKey())',
						'addColumn("name", "text")',
					],
					down: ['dropTable("books")'],
				},
				indexes: [
					{
						tableName: "books",
						type: "createIndex",
						up: [
							'await sql`create index "books_name_idx" on "books" ("name")`.execute(db);',
						],
						down: ['await db.schema.dropIndex("books_name_idx").execute();'],
					},
				],
			},
			members: {
				columns: {
					tableName: "members",
					type: "create",
					up: [
						'createTable("members")',
						'addColumn("name", "varchar", (col) => col.defaultTo("hello"))',
						'addColumn("email", "varchar(255)")',
						'addColumn("city", "text", (col) => col.notNull())',
					],
					down: ['dropTable("members")'],
				},
				indexes: [],
			},
			shops: {
				columns: {
					tableName: "shops",
					type: "drop",
					up: ['dropTable("shops")'],
					down: [
						'createTable("shops")',
						'addColumn("name", "varchar", (col) => col.defaultTo("hello"))',
						'addColumn("email", "varchar(255)")',
						'addColumn("city", "text", (col) => col.notNull())',
					],
				},
				indexes: [
					{
						tableName: "shops",
						type: "dropIndex",
						up: [],
						down: [
							'await sql`create unique index "shops_mail_idx" on "shops" using btree ("email")`.execute(db);',
						],
					},
					{
						tableName: "shops",
						type: "dropIndex",
						up: [],
						down: [
							'await sql`create unique index "shops_city_idx" on "shops" using btree ("city")`.execute(db);',
						],
					},
				],
			},
			samples: {
				columns: {
					tableName: "samples",
					type: "change",
					up: [
						'alterTable("samples")',
						'dropConstraint("samples_pk")',
						'alterColumn("id", (col) => col.primaryKey())',
					],
					down: [
						'alterTable("samples")',
						'dropConstraint("samples_pk")',
						'alterColumn("name", (col) => col.primaryKey())',
					],
				},
				indexes: [
					{
						tableName: "samples",
						type: "createIndex",
						up: [
							'await sql`create index "samples_name_idx" on "samples" ("name")`.execute(db);',
						],
						down: ['await db.schema.dropIndex("samples_name_idx").execute();'],
					},
				],
			},
			addresses: {
				columns: {
					tableName: "addresses",
					type: "change",
					up: [
						'alterTable("addresses")',
						'alterColumn("name", (col) => col.setDataType("varchar"))',
						'alterColumn("name", (col) => col.setDefault("hello"))',
						'alterColumn("name", (col) => col.setNotNull())',
						'alterColumn("email", (col) => col.setDataType("varchar"))',
						'alterColumn("city", (col) => col.dropDefault())',
						'alterColumn("city", (col) => col.setNotNull())',
						'addColumn("id", "serial", (col) => col.primaryKey())',
						'addColumn("country", "text")',
					],
					down: [
						'alterTable("addresses")',
						'dropColumn("country")',
						'dropColumn("id")',
						'alterColumn("city", (col) => col.dropNotNull())',
						'alterColumn("city", (col) => col.setDefault("bcn"))',
						'alterColumn("email", (col) => col.setDataType("varchar(255)"))',
						'alterColumn("name", (col) => col.dropNotNull())',
						'alterColumn("name", (col) => col.dropDefault())',
						'alterColumn("name", (col) => col.setDataType("text"))',
					],
				},
				indexes: [
					{
						tableName: "addresses",
						type: "createIndex",
						up: [
							'await sql`create unique index "addresses_city_and_country_idx" on "addresses" using btree ("city", "country")`.execute(db);',
						],
						down: [
							'await db.schema.dropIndex("addresses_city_and_country_idx").execute();',
						],
					},
					{
						tableName: "addresses",
						type: "dropIndex",
						up: [
							'await db.schema.dropIndex("addresses_country_idx").execute();',
						],
						down: [
							'await sql`create unique index "addresses_country_idx" on "addresses" using btree ("country")`.execute(db);',
						],
					},
				],
			},
		};
		expect(changeset).toStrictEqual(expected);
	});
});
