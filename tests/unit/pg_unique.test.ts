import { describe, expect, test } from "vitest";
import { compileUnique } from "~tests/helpers/indexes.js";
import { PgUnique, unique } from "../../src/database/schema/pg_unique.js";

describe("PgUniqueConstraint", () => {
	test("it can be instantiated with pgUniqueConstraint", () => {
		const constraint = unique(["id"]);
		expect(constraint).toBeInstanceOf(PgUnique);
	});

	test("one column", () => {
		const constraint = unique("id");
		const compiled = compileUnique(constraint, "test_table");

		const expected = {
			test_table_id_kinetic_key:
				'"test_table_id_kinetic_key" UNIQUE NULLS DISTINCT ("id")',
		};
		expect(compiled).toStrictEqual(expected);
	});

	test("multiple columns", () => {
		const constraint = unique(["price", "name"]);
		const compiled = compileUnique(constraint, "test_table");

		const expected = {
			test_table_name_price_kinetic_key:
				'"test_table_name_price_kinetic_key" UNIQUE NULLS DISTINCT ("name", "price")',
		};
		expect(compiled).toStrictEqual(expected);
	});

	test("null not distinct", () => {
		const constraint = unique("id").nullsNotDistinct();
		const compiled = compileUnique(constraint, "test_table");

		const expected = {
			test_table_id_kinetic_key:
				'"test_table_id_kinetic_key" UNIQUE NULLS NOT DISTINCT ("id")',
		};
		expect(compiled).toStrictEqual(expected);
	});
});