import diff from "microdiff";
import { DbTableInfo, LocalTableInfo } from "./introspection/types.js";
import { computeMigrationOps } from "./migration_op/compute.js";

export function dbChangeset(
	local: LocalTableInfo,
	db: DbTableInfo,
): Changeset[] {
	const newDiff = diff(
		{
			table: db.columns,
			index: db.indexes,
		},
		{
			table: local.columns,
			index: local.indexes,
		},
	);
	return computeMigrationOps(newDiff);
}

export type DbChangeset = Record<string, Changeset[]>;

export enum ChangeSetType {
	CreateTable = "createTable",
	DropTable = "dropTable",
	CreateColumn = "createColumn",
	DropColumn = "dropColumn",
	ChangeColumn = "changeColumn",
	ChangeTable = "changeTable",
	CreateIndex = "createIndex",
	DropIndex = "dropIndex",
}

export type Changeset = {
	tableName: string;
	type: ChangeSetType;
	up: string[];
	down: string[];
	priority?: number;
};
