import { describe, expect, test } from "vitest";
import { columnInfoFactory } from "~tests/helpers/factories/column_info_factory.js";
import { CreateColumnDiff, createColumnMigration } from "./create.js";

describe("createTableMigration", () => {
	test("has a priority of 1", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "id",
				dataType: "serial",
				isNullable: true,
			}),
		};

		const result = createColumnMigration(column);
		expect(result.priority).toBe(2);
	});

	test("columns", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "id",
				dataType: "serial",
				isNullable: true,
			}),
		};

		const expected = {
			priority: 2,
			tableName: "books",
			type: "createColumn",
			up: [
				"await db.schema",
				'alterTable("books")',
				'addColumn("id", "serial")',
				"execute();",
			],
			down: [
				"await db.schema",
				'alterTable("books")',
				'dropColumn("id")',
				"execute();",
			],
		};

		expect(createColumnMigration(column)).toStrictEqual(expected);
	});

	test("primary key column", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "id",
				dataType: "serial",
				isNullable: false,
				primaryKey: true,
			}),
		};

		const expected = {
			priority: 2,
			tableName: "books",
			type: "createColumn",
			up: [
				"await db.schema",
				'alterTable("books")',
				'addColumn("id", "serial", (col) => col.notNull().primaryKey())',
				"execute();",
			],
			down: [
				"await db.schema",
				'alterTable("books")',
				'dropColumn("id")',
				"execute();",
			],
		};

		expect(createColumnMigration(column)).toStrictEqual(expected);
	});

	test("not nullable columns", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "id",
				dataType: "serial",
				isNullable: false,
			}),
		};

		const expected = {
			priority: 2,
			tableName: "books",
			type: "createColumn",
			up: [
				"await db.schema",
				'alterTable("books")',
				'addColumn("id", "serial", (col) => col.notNull())',
				"execute();",
			],
			down: [
				"await db.schema",
				'alterTable("books")',
				'dropColumn("id")',
				"execute();",
			],
		};

		expect(createColumnMigration(column)).toStrictEqual(expected);
	});

	test("columns with default value", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "id",
				dataType: "text",
				defaultValue: "foo",
			}),
		};

		const expected = {
			priority: 2,
			tableName: "books",
			type: "createColumn",
			up: [
				"await db.schema",
				'alterTable("books")',
				'addColumn("id", "text", (col) => col.defaultTo("foo"))',
				"execute();",
			],
			down: [
				"await db.schema",
				'alterTable("books")',
				'dropColumn("id")',
				"execute();",
			],
		};

		expect(createColumnMigration(column)).toStrictEqual(expected);
	});

	test("columns with a foreign key contraint", () => {
		const column: CreateColumnDiff = {
			type: "CREATE",
			path: ["table", "books", "author_id"],
			value: columnInfoFactory({
				tableName: "books",
				columnName: "author_id",
				dataType: "text",
				foreignKeyConstraint: {
					table: "authors",
					column: "id",
				},
			}),
		};

		const expected = {
			priority: 2,
			tableName: "books",
			type: "createColumn",
			up: [
				"await db.schema",
				'alterTable("books")',
				'addColumn("author_id", "text")',
				'.addForeignKeyConstraint("books_author_id_fkey", ["author_id"], "authors", ["id"])',
				"execute();",
			],
			down: [
				"await db.schema",
				'alterTable("books")',
				'dropColumn("author_id")',
				"execute();",
			],
		};

		expect(createColumnMigration(column)).toStrictEqual(expected);
	});
});
