import { Kysely } from "kysely";
import {
	ChangesetPhase,
	type ChangesetType,
	type SchemaTransform,
} from "../changeset/types/changeset.js";
import { MigrationLock } from "../state/migration-lock.js";

interface PushMigrationBase {
	type: ChangesetType;
	/**
	 * Whether the migration runs in a transaction.
	 */
	transaction?: boolean;
	/**
	 * Up method.
	 */
	up(db: Kysely<any>): Promise<void>;

	/**
	 * Down method.
	 */
	down(db: Kysely<any>): Promise<void>;
	transform?: SchemaTransform;
}

export interface ExpandPushMigration extends PushMigrationBase {
	phase: ChangesetPhase.Expand;
}

export interface ContractPushMigration extends PushMigrationBase {
	phase: ChangesetPhase.Contract;
}

export interface AlterPushMigration extends PushMigrationBase {
	phase: ChangesetPhase.Alter;
}

export type PushMigration =
	| ExpandPushMigration
	| AlterPushMigration
	| ContractPushMigration;

export interface MigrationsByPhase {
	expand?: ExpandPushMigration[];
	alter?: AlterPushMigration[];
	contract?: ContractPushMigration[];
}

export class PushMigrator {
	#db: Kysely<any>;
	#migrationLock: MigrationLock;

	constructor(options: { db: Kysely<any> }) {
		this.#db = options.db;
		this.#migrationLock = new MigrationLock(options.db);
	}

	async push(migrations: MigrationsByPhase) {
		let success: boolean = false;
		let error: PushMigrationError | undefined;
		const executor = new MigrationRunner({ db: this.#db });
		try {
			await this.#migrationLock.acquire();
			await executor.execute([
				...(migrations.expand ?? []),
				...(migrations.alter ?? []),
				...(migrations.contract ?? []),
			]);
			success = true;
		} catch (e) {
			await executor.rollback();
			error = new PushMigrationError([e], "failed push");
			console.dir(error, { depth: null });
		} finally {
			await this.#migrationLock.release();
		}
		if (error !== undefined) {
			throw error;
		}
		return success;
	}
}

class PushMigrationError extends AggregateError {}

class MigrationRunner {
	#db: Kysely<any>;
	#migrationsToRollBack: PushMigration[];

	constructor(options: { db: Kysely<any> }) {
		this.#db = options.db;
		this.#migrationsToRollBack = [];
	}

	async execute(migrations: PushMigration[]) {
		for (const migration of migrations) {
			const builder =
				(migration.transaction ?? true)
					? this.#db.transaction()
					: this.#db.connection();
			await builder.execute(migration.up);
			this.#migrationsToRollBack.unshift(migration);
		}
	}

	async rollback() {
		for (const migration of this.#migrationsToRollBack) {
			await this.#db.connection().execute(migration.down);
		}
	}
}
