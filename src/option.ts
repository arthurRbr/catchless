import { type Err, type Ok, Result } from "./result";

export type Option<T> = Some<T> | None;

export type Some<T> = {
	readonly _tag: "Some";
	readonly value: T;
	readonly is_some: () => this is Some<T>;
	readonly is_none: () => this is None;
	readonly unwrap: () => T;
	readonly unwrap_or: (fallback_value: unknown) => T;
	readonly match: <U1, U2>(handlers: {
		some: (value: T) => U1;
		none: () => U2;
	}) => U1 | U2;
	readonly to_result: () => Ok<T>;
};

export type None = {
	readonly _tag: "None";
	readonly is_some: <T>() => this is Some<T>;
	readonly is_none: () => this is None;
	readonly unwrap: () => never;
	readonly unwrap_or: <T>(fallback_value: T) => T;
	readonly match: <U1, U2>(handlers: {
		some: (value: never) => U1;
		none: () => U2;
	}) => U1 | U2;
	readonly to_result: <E>(error: E) => Err<E>;
};

export const Option = {
	some: <T>(value: Exclude<T, undefined>): Some<T> => ({
		_tag: "Some",
		value,
		is_some: (): this is Some<T> => true,
		is_none: (): this is None => false,
		unwrap: () => value,
		unwrap_or: (): T => value,
		match: <U1, U2>(handlers: { some: (value: T) => U1; none: () => U2 }) =>
			handlers.some(value),
		to_result: (): Ok<T> => Result.ok(value),
	}),

	none: {
		_tag: "None",
		is_some: <T>(): this is Some<T> => false,
		is_none: (): this is None => true,
		unwrap: () => {
			throw new Error("Called unwrap on None");
		},
		unwrap_or: <T>(fallback_value: T): T => fallback_value,
		match: <U1, U2>(handlers: { some: (value: never) => U1; none: () => U2 }) =>
			handlers.none(),
		to_result: <E>(error: E): Err<E> => Result.err(error),
	} satisfies None,

	is_some: <T>(option: Option<T>): option is Some<T> => option._tag === "Some",

	is_none: <T>(option: Option<T>): option is None => option._tag === "None",

	map:
		<T, U>(fn: (value: T) => Exclude<U, undefined>) =>
		(opt: Option<T>): Option<U> =>
			Option.is_some(opt) ? Option.some(fn(opt.value)) : Option.none,

	map_none:
		<T>(fn: () => Option<T>) =>
		(opt: Option<T>): Option<T> =>
			Option.is_none(opt) ? fn() : opt,

	flat_map:
		<T, U>(fn: (value: T) => Option<U>) =>
		(opt: Option<T>): Option<U> =>
			Option.is_some(opt) ? fn(opt.value) : Option.none,

	unwrap: <T>(opt: Option<T>): T => {
		if (Option.is_none(opt)) {
			throw new Error("Called unwrap on None");
		}

		return opt.value;
	},

	unwrap_or:
		<T, U>(fallback_value: U) =>
		(opt: Option<T>): T | U =>
			Option.is_some(opt) ? opt.value : fallback_value,

	match:
		<T, U1, U2 = U1>(handlers: { some: (value: T) => U1; none: () => U2 }) =>
		(opt: Option<T>): U1 | U2 =>
			Option.is_some(opt) ? handlers.some(opt.value) : handlers.none(),

	flat: <T>(opt: Option<Option<T>>): Option<T> =>
		Option.is_some(opt) ? opt.value : Option.none,

	from_undefined: <T>(value: Exclude<T, undefined> | undefined): Option<T> =>
		value !== undefined ? Option.some(value) : Option.none,

	from_nullish: <T>(value: NonNullable<T> | null | undefined): Option<T> =>
		value !== null && value !== undefined ? Option.some(value) : Option.none,

	to_null: <T>(opt: Option<NonNullable<T>>): NonNullable<T> | null => {
		return opt.match({
			some: (value) => value,
			none: () => null,
		});
	},

	to_undefined: <T>(
		opt: Option<Exclude<T, undefined>>,
	): Exclude<T, undefined> | undefined => {
		return opt.match({
			some: (value) => value,
			none: () => undefined,
		});
	},

	to_result: <T, E>(opt: Option<T>, error: E): Result<T, E> =>
		opt.match({
			some: (value) => Result.ok(value),
			none: () => Result.err(error),
		}),
};
