export type ChangeWarning =
	| BackwardIncompatibleChange
	| DestructiveChange
	| BlockingChange
	| MightFailChange;

export enum ChangeWarningType {
	BackwardIncompatible = "backwardIncompatible",
	Destructive = "destructive",
	Blocking = "blocking",
	MightFail = "mightFail",
}

export enum ChangeWarningCode {
	TableRename = "BI001",
	ColumnRename = "BI002",
	SchemaDrop = "D001",
	TableDrop = "D002",
	ColumnDrop = "D003",
	ChangeColumnType = "B001",
	AddVolatileDefault = "B002",
	AddSerialColumn = "B003",
	AddBigSerialColumn = "B004",
	AddPrimaryKeyToExistingNullableColumn = "MF001",
	AddPrimaryKeyToNewColumn = "MF002",
}

export type BackwardIncompatibleChange =
	| TableRenameWarning
	| ColumnRenameWarning;

export type TableRenameWarning = {
	type: ChangeWarningType.BackwardIncompatible;
	code: ChangeWarningCode.TableRename;
	schema: string;
	tableRename: { from: string; to: string };
};

export type ColumnRenameWarning = {
	type: ChangeWarningType.BackwardIncompatible;
	code: ChangeWarningCode.ColumnRename;
	schema: string;
	table: string;
	columnRename: { from: string; to: string };
};

export type DestructiveChange =
	| SchemaDropWarning
	| TableDropWarning
	| ColumnDropWarning;

export type SchemaDropWarning = {
	type: ChangeWarningType.Destructive;
	code: ChangeWarningCode.SchemaDrop;
	schema: string;
};

export type TableDropWarning = {
	type: ChangeWarningType.Destructive;
	code: ChangeWarningCode.TableDrop;
	schema: string;
	table: string;
};

export type ColumnDropWarning = {
	type: ChangeWarningType.Destructive;
	code: ChangeWarningCode.ColumnDrop;
	schema: string;
	table: string;
	column: string;
};

export type BlockingChange =
	| ChangeColumnType
	| AddVolatileDefault
	| AddSerialColumn
	| AddBigSerialColumn;

export type ChangeColumnType = {
	type: ChangeWarningType.Blocking;
	code: ChangeWarningCode.ChangeColumnType;
	schema: string;
	table: string;
	column: string;
	from: string;
	to: string;
};

export type AddVolatileDefault = {
	type: ChangeWarningType.Blocking;
	code: ChangeWarningCode.AddVolatileDefault;
	schema: string;
	table: string;
	column: string;
};

export type AddSerialColumn = {
	type: ChangeWarningType.Blocking;
	code: ChangeWarningCode.AddSerialColumn;
	schema: string;
	table: string;
	column: string;
};

export type AddBigSerialColumn = {
	type: ChangeWarningType.Blocking;
	code: ChangeWarningCode.AddBigSerialColumn;
	schema: string;
	table: string;
	column: string;
};

export type MightFailChange =
	| AddPrimaryKeyToExistingNullableColumn
	| AddPrimaryKeyToNewColumn;

export type AddPrimaryKeyToExistingNullableColumn = {
	type: ChangeWarningType.MightFail;
	code: ChangeWarningCode.AddPrimaryKeyToExistingNullableColumn;
	schema: string;
	table: string;
	columns: string[];
};

export type AddPrimaryKeyToNewColumn = {
	type: ChangeWarningType.MightFail;
	code: ChangeWarningCode.AddPrimaryKeyToNewColumn;
	schema: string;
	table: string;
	columns: string[];
};
