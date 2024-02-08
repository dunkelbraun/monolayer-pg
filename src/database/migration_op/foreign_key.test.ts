import { describe, expect, test } from "vitest";
import { changesetDiff } from "~/database/changeset.js";
import { migrationSchemaFactory } from "~tests/helpers/factories/migration_schema.js";
import { foreignKeyMigrationOps } from "./foreign_key.js";

describe("foreignKeyMigrationOps", () => {
	test("add foreign key constraint", () => {
		const local = migrationSchemaFactory({
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
			},
		});
		const remote = migrationSchemaFactory();
		const { diff, addedTables, droppedTables } = changesetDiff(local, remote);
		const result = foreignKeyMigrationOps(diff, addedTables, droppedTables);

		const expected = [
			{
				priority: 7.11,
				tableName: "users",
				type: "createForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE users ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE users DROP CONSTRAINT users_book_id_books_id_kinetic_fk`.execute(db);",
				],
			},
			{
				priority: 7.11,
				tableName: "books",
				type: "createForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE books ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk`.execute(db);",
				],
			},
		];
		expect(result).toStrictEqual(expected);
	});

	test("add foreign key on table creation", () => {
		const local = migrationSchemaFactory({
			table: {
				users: {},
			},
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
			},
		});
		const remote = migrationSchemaFactory();
		const { diff, addedTables, droppedTables } = changesetDiff(local, remote);
		const result = foreignKeyMigrationOps(diff, addedTables, droppedTables);

		const expected = [
			{
				priority: 7.11,
				tableName: "users",
				type: "createForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE users ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
				down: [],
			},
			{
				priority: 7.11,
				tableName: "books",
				type: "createForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE books ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk`.execute(db);",
				],
			},
		];
		expect(result).toStrictEqual(expected);
	});

	test("drop foreign key constraint", () => {
		const local = migrationSchemaFactory();
		const remote = migrationSchemaFactory({
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
			},
		});
		const { diff, addedTables, droppedTables } = changesetDiff(local, remote);
		const result = foreignKeyMigrationOps(diff, addedTables, droppedTables);

		const expected = [
			{
				priority: 7,
				tableName: "users",
				type: "dropForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE users DROP CONSTRAINT users_book_id_books_id_kinetic_fk`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE users ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
			{
				priority: 7,
				tableName: "books",
				type: "dropForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE books ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
		];
		expect(result).toStrictEqual(expected);
	});

	test("drop foreign key constraint when dropping a table", () => {
		const local = migrationSchemaFactory();
		const remote = migrationSchemaFactory({
			table: {
				users: {},
			},
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
			},
		});
		const { diff, addedTables, droppedTables } = changesetDiff(local, remote);
		const result = foreignKeyMigrationOps(diff, addedTables, droppedTables);

		const expected = [
			{
				priority: 7,
				tableName: "users",
				type: "dropForeignKeyConstraint",
				up: [],
				down: [
					"await sql`ALTER TABLE users ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
			{
				priority: 7,
				tableName: "books",
				type: "dropForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE books ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
		];
		expect(result).toStrictEqual(expected);
	});

	test("replace unique constraint", () => {
		const local = migrationSchemaFactory({
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE NO ACTION ON UPDATE NO ACTION",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE NO ACTION ON UPDATE NO ACTION",
				},
			},
		});
		const remote = migrationSchemaFactory({
			foreignKeyConstraints: {
				users: {
					users_book_id_books_id_kinetic_fk:
						"users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
				books: {
					books_location_id_locations_id_kinetic_fk:
						"books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE",
				},
			},
		});
		const { diff, addedTables, droppedTables } = changesetDiff(local, remote);
		const result = foreignKeyMigrationOps(diff, addedTables, droppedTables);

		const expected = [
			{
				priority: 7.12,
				tableName: "users",
				type: "changeForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE users DROP CONSTRAINT users_book_id_books_id_kinetic_fk, ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE NO ACTION ON UPDATE NO ACTION`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE users DROP CONSTRAINT users_book_id_books_id_kinetic_fk, ADD CONSTRAINT users_book_id_books_id_kinetic_fk FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
			{
				priority: 7.12,
				tableName: "books",
				type: "changeForeignKeyConstraint",
				up: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk, ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE NO ACTION ON UPDATE NO ACTION`.execute(db);",
				],
				down: [
					"await sql`ALTER TABLE books DROP CONSTRAINT books_location_id_locations_id_kinetic_fk, ADD CONSTRAINT books_location_id_locations_id_kinetic_fk FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE ON UPDATE CASCADE`.execute(db);",
				],
			},
		];
		expect(result).toStrictEqual(expected);
	});
});