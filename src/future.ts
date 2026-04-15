import { Option, Result } from "./index";

export type Future<T> = {
	readonly awaitable: () => Promise<T>;
	readonly is_future: () => this is Future<T>;
};

export const Future = {
	new: <T>(computation: () => Promise<T>): Future<T> => ({
		awaitable: computation,
		is_future: (): this is Future<T> => true,
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
			concurrency: Option<number>;
		},
		deferred_futures: { [K in keyof T]: Future<T[K]> },
	): Future<T> => {
		return Future.new(async () => {
			const results: Result<unknown, unknown>[] = [];
			let next_index = 0;
			let has_error = false;

			const worker = async (): Promise<void> => {
				while (!has_error && next_index < deferred_futures.length) {
					const index = next_index++;
					const result = await deferred_futures[index].awaitable();
					results[index] = result;
					if (result.is_err()) {
						has_error = true;
					}
				}
			};

			// None = 0 = unlimited: run all futures concurrently
			const worker_count = options.concurrency.unwrap_or(deferred_futures.length);

			await Promise.all(
				Array.from(
					{ length: Math.min(worker_count, deferred_futures.length) },
					worker,
				),
			);

			return results as unknown as T;
		});
	},

	throttled: <T extends readonly Result<unknown, unknown>[]>(
		rate: { limit: number; per_ms: number },
		deferred_futures: { [K in keyof T]: Future<T[K]> },
	): Future<T> => {
		return Future.new(async () => {
			const results: Result<unknown, unknown>[] = [];
			let has_error = false;

			// Sliding-window gate: timestamps of futures started within the current window.
			const timestamps: number[] = [];
			const wait_for_slot = async (): Promise<void> => {
				const now = Date.now();
				while (timestamps.length > 0 && now - timestamps[0] >= rate.per_ms) {
					timestamps.shift();
				}
				if (timestamps.length >= rate.limit) {
					await new Promise<void>((r) =>
						setTimeout(r, timestamps[0] + rate.per_ms - Date.now()),
					);
					return wait_for_slot();
				}
				timestamps.push(Date.now());
			};

			// Fire futures one-by-one respecting the rate limit; collect in-flight promises.
			const in_flight: Promise<void>[] = [];
			for (let i = 0; i < deferred_futures.length; i++) {
				await wait_for_slot();
				if (has_error) break;
				const index = i;
				in_flight.push(
					deferred_futures[index].awaitable().then((result) => {
						results[index] = result;
						if (result.is_err()) has_error = true;
					}),
				);
			}

			await Promise.all(in_flight);
			return results as unknown as T;
		});
	},
};
