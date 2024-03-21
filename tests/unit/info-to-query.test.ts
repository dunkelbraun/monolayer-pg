import { expect, test } from "vitest";
import { foreignKeyConstraintInfoToQuery } from "~/schema/table/constraints/foreign-key/introspection.js";
import { primaryKeyConstraintInfoToQuery } from "~/schema/table/constraints/primary-key/introspection.js";
import { uniqueConstraintInfoToQuery } from "~/schema/table/constraints/unique/introspection.js";
import type { ForeignKeyConstraintInfo } from "../../src/schema/table/constraints/foreign-key/introspection.js";
import type { PrimaryKeyConstraintInfo } from "../../src/schema/table/constraints/primary-key/introspection.js";
import type { UniqueConstraintInfo } from "../../src/schema/table/constraints/unique/introspection.js";

test("#PrimaryKeyInfoToQuery", () => {
	const info: PrimaryKeyConstraintInfo = {
		constraintType: "PRIMARY KEY",
		table: "test_users",
		columns: ["book_id", "location_id"],
	};
	const expected =
		'"test_users_book_id_location_id_kinetic_pk" PRIMARY KEY ("book_id", "location_id")';
	expect(primaryKeyConstraintInfoToQuery(info)).toBe(expected);
});

test("#foreigKeyInfoToQuery", () => {
	const info: ForeignKeyConstraintInfo = {
		constraintType: "FOREIGN KEY",
		table: "test_users",
		column: ["book_id", "location_id"],
		targetTable: "test_books_fk",
		targetColumns: ["id", "location"],
		updateRule: "CASCADE",
		deleteRule: "NO ACTION",
	};
	const expected =
		'"test_users_book_id_location_id_test_books_fk_id_location_kinetic_fk" FOREIGN KEY ("book_id", "location_id") REFERENCES test_books_fk ("id", "location") ON DELETE NO ACTION ON UPDATE CASCADE';
	expect(foreignKeyConstraintInfoToQuery(info)).toBe(expected);
});

test("#uniqueConstraintInfoToQuery", () => {
	const info: UniqueConstraintInfo = {
		constraintType: "UNIQUE",
		table: "test_users",
		columns: ["book_id", "location_id"],
		nullsDistinct: true,
	};

	expect(uniqueConstraintInfoToQuery(info)).toBe(
		'"test_users_book_id_location_id_kinetic_key" UNIQUE NULLS DISTINCT ("book_id", "location_id")',
	);

	info.nullsDistinct = false;
	expect(uniqueConstraintInfoToQuery(info)).toBe(
		'"test_users_book_id_location_id_kinetic_key" UNIQUE NULLS NOT DISTINCT ("book_id", "location_id")',
	);
});
