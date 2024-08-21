import { Context, Effect, Ref } from "effect";
import path from "node:path";

export interface DbFolder {
	path?: string;
}
export class DbFolderState extends Context.Tag("DbFolderState")<
	DbFolderState,
	Ref.Ref<DbFolder>
>() {
	static get current() {
		return Effect.gen(function* () {
			return yield* Ref.get(yield* DbFolderState);
		});
	}

	static update(folderPath: string) {
		return Effect.gen(function* () {
			yield* Ref.update(yield* DbFolderState, () => {
				return { path: path.join(folderPath, "db") };
			});
		});
	}
}

export class UndefinedDbFolderError extends TypeError {
	constructor() {
		super(`The db folder path is undefined.`);
	}
}
