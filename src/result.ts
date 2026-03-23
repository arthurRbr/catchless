type CommonTypes<T, E1> = {
	is_ok: () => this is Ok<T>;
	is_err: () => this is Err<E1>;
	unwrap: () => T;
	unwrap_err: () => E1;
	match: <U>(handlers: { ok: (value: T) => U; err: (error: E1) => U }) => U;
};

export type Result<T, E> = Ok<T> | Err<E>;

export type Ok<T> = CommonTypes<T, never> & {
	readonly _tag: "Ok";
	readonly value: T;
};

export type Err<E> = CommonTypes<never, E> & {
	readonly _tag: "Err";
	readonly error: E;
};

export const Result = {
	ok: <T>(value: T): Ok<T> => ({
		_tag: "Ok",
		value,
		is_ok: (): this is Ok<T> => true,
		is_err: (): this is Err<never> => false,
		unwrap: () => value,
		unwrap_err: () => {
			throw new Error(`unwrap_err() on Ok: ${value}`);
		},
		match: <U>(handlers: { ok: (value: T) => U; err: (error: never) => U }) =>
			handlers.ok(value),
	}),
	err: <E1>(error: E1): Err<E1> => ({
		_tag: "Err",
		error,
		is_ok: (): this is Ok<never> => false,
		is_err: (): this is Err<E1> => true,
		unwrap: () => {
			throw error;
		},
		unwrap_err: () => error,
		match: <U>(handlers: { ok: (value: never) => U; err: (error: E1) => U }) =>
			handlers.err(error),
	}),

	is_ok: <T, E>(result: Result<T, E>): result is Ok<T> => result._tag === "Ok",

	is_err: <T, E>(result: Result<T, E>): result is Err<E> =>
		result._tag === "Err",

	map_ok:
		<T, U, E>(fn: (value: T) => U) =>
		(res: Result<T, E>): Result<U, E> =>
			res.is_ok() ? Result.ok(fn(res.value)) : res,

	map_err:
		<T, E, F>(fn: (error: E) => F) =>
		(res: Result<T, E>): Result<T, F> =>
			res.is_err() ? Result.err(fn(res.error)) : res,

	flat_map_ok:
		<T, U, E1, E2>(fn: (value: T) => Result<U, E1>) =>
		(res: Result<T, E2>): Result<U, E1 | E2> =>
			res.is_ok() ? fn(res.value) : res,

	unwrap_or:
		<T, E>(defaultValue: T) =>
		(res: Result<T, E>): T =>
			res.is_ok() ? res.value : defaultValue,

	unwrap: <T, E>(res: Result<T, E>): T => {
		return res.match({
			ok: (value) => {
				return value;
			},
			err: (error) => {
				throw error;
			},
		});
	},

	unwrap_err: <T, E>(res: Result<T, E>): E => {
		return res.match({
			ok: (value) => {
				throw new Error(`unwrap_err() on Ok: ${value}`);
			},
			err: (error) => {
				return error;
			},
		});
	},

	match:
		<T, E, U>(handlers: { ok: (value: T) => U; err: (error: E) => U }) =>
		(res: Result<T, E>): U =>
			res.is_ok() ? handlers.ok(res.value) : handlers.err(res.error),

	all_or_first_err: <T extends readonly Result<unknown, unknown>[]>(
		...results: T
	) => {
		const first_err = results.find((r) => r.is_err());
		if (first_err) {
			return first_err as T[number] extends Result<infer R, infer E>
				? Err<E>
				: never;
		}

		const values = results.filter((r) => r.is_ok()).map((r) => r.value) as {
			[K in keyof T]: T[K] extends Result<infer R, unknown> ? R : never;
		};

		return Result.ok(values);
	},
};
