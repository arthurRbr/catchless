import { Result } from "./index";

export type Future<T> = {
	readonly awaitable: () => Promise<T>;
	readonly isFuture: () => this is Future<T>;
};

export const Future = {
	new: <T>(computation: () => Promise<T>): Future<T> => ({
		awaitable: computation,
		isFuture: (): this is Future<T> => true,
	}),

	awaitable: <T>(fut: Future<T>): Promise<T> => fut.awaitable(),

	of: <T>(value: T): Future<T> => Future.new(() => Promise.resolve(value)),

	start: (): Future<undefined> => Future.of(undefined),

	map:
		<T, U>(fn: (value: T) => U) =>
		(fut: Future<T>): Future<U> =>
			Future.new(() => fut.awaitable().then(fn)),

	flat_map:
		<T, U>(fn: (value: T) => Future<U>) =>
		(fut: Future<T>): Future<U> =>
			Future.new(() =>
				fut
					.awaitable()
					.then(fn)
					.then((f) => f.awaitable()),
			),

	map_ok:
		<T, U, E>(fn: (value: T) => U) =>
		(fut: Future<Result<T, E>>): Future<Result<U, E>> =>
			Future.new(() =>
				fut
					.awaitable()
					.then((res) => (res.is_ok() ? Result.ok(fn(res.value)) : res)),
			),

	map_err:
		<T1, E1, E2>(fn: (error: E1) => E2) =>
		(fut: Future<Result<T1, E1>>): Future<Result<T1, E2>> =>
			Future.new(() =>
				fut
					.awaitable()
					.then((res) => (res.is_err() ? Result.err(fn(res.error)) : res)),
			),

	map_ok_to_result:
		<T1, T2, E1, E2>(fn: (value: T1) => Result<T2, E2>) =>
		(fut: Future<Result<T1, E1>>): Future<Result<T2, E1 | E2>> =>
			Future.new(() =>
				fut.awaitable().then((res) => (res.is_ok() ? fn(res.value) : res)),
			),

	map_err_to_result:
		<T1, E1, T2, E2>(fn: (error: E1) => Result<T2, E2>) =>
		(fut: Future<Result<T1, E1>>): Future<Result<T1 | T2, E2>> =>
			Future.new(() =>
				fut
					.awaitable()
					.then(
						(res): Result<T1 | T2, E2> => (res.is_err() ? fn(res.error) : res),
					),
			),

	flat_map_ok:
		<T, U, E1, E2>(fn: (value: T) => Future<Result<U, E2>>) =>
		(fut: Future<Result<T, E1>>): Future<Result<U, E1 | E2>> =>
			Future.new(() =>
				fut
					.awaitable()
					.then(
						(res): Promise<Result<U, E1 | E2>> =>
							res.is_ok()
								? fn(res.value).awaitable()
								: Future.of(res).awaitable(),
					),
			),

	flat_map_err:
		<T1, E1, T2, E2>(fn: (error: E1) => Future<Result<T2, E2>>) =>
		(fut: Future<Result<T1, E1>>): Future<Result<T1 | T2, E2>> =>
			Future.new(() =>
				fut
					.awaitable()
					.then(
						(res): Promise<Result<T1 | T2, E2>> =>
							res.is_err()
								? fn(res.error).awaitable()
								: Future.of(res).awaitable(),
					),
			),

	flat_tap_ok:
		<T, E1, E2>(fn: (value: T) => Future<Result<unknown, E2>>) =>
		(fut: Future<Result<T, E1>>): Future<Result<T, E1 | E2>> =>
			Future.new(() =>
				fut.awaitable().then((res) =>
					res.is_ok()
						? fn(res.value)
								.awaitable()
								.then((res2) => (res2.is_err() ? res2 : res))
						: res,
				),
			),

	flat_tap_err:
		<T, E1, E2>(fn: (error: E1) => Future<Result<unknown, E2>>) =>
		(fut: Future<Result<T, E1>>): Future<Result<T, E1 | E2>> =>
			Future.new(() =>
				fut.awaitable().then((res) =>
					res.is_err()
						? fn(res.error)
								.awaitable()
								.then(() => res)
						: res,
				),
			),

	concurrent: <T extends readonly Result<unknown, unknown>[]>(
		options: {
			concurrency: number;
		},
		deferred_futures: { [K in keyof T]: Future<T[K]> },
	): Future<T> => {
		const chunk_size = options.concurrency;
		const chunks: Future<Result<unknown, unknown>>[][] = [];

		for (let i = 0; i < deferred_futures.length; i += chunk_size) {
			const chunk = deferred_futures.slice(i, i + chunk_size);
			chunks.push(chunk);
		}

		return Future.new(async () =>
			chunks.reduce<Promise<T>>(
				async (acc, chunk) => {
					const prev_acc = await acc;
					if (prev_acc.some((res) => res.is_err())) {
						// Stop now, return all results so far
						return [...prev_acc] as unknown as T;
					}

					// Continue with the next chunk
					const chunk_res = await Promise.all(chunk.map((f) => f.awaitable()));

					return [...prev_acc, ...chunk_res] as unknown as T;
				},
				Promise.resolve([] as unknown as T),
			),
		);
	},
};
