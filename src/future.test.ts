import { Future } from "./future";
import { pipe } from "./pipe";
import { Option } from "./option";
import { Result } from "./result";

describe("Future", () => {
	describe("fluent api", () => {
		test("future.is_future", () => {
			const fut = Future.of(42);
			expect(fut.is_future()).toBe(true);
		});

		test("future.awaitable() executes Future", async () => {
			const res = await Future.of(42).awaitable();
			expect(res).toEqual(42);
		});
	});

	describe("pipe api", () => {
		test("future.of() creates resolved Future", async () => {
			const fut = Future.of(42);
			const res = await Future.awaitable(fut);
			expect(res).toEqual(42);
		});

		test("future.start() creates resolved Future with undefined", async () => {
			const fut = Future.start();
			const res = await Future.awaitable(fut);
			expect(res).toBeUndefined();
		});

		test("future.new() wraps computation", async () => {
			const fut = Future.new(() => Promise.resolve(42));
			const res = await Future.awaitable(fut);
			expect(res).toEqual(42);
		});

		test("future.awaitable() executes Future", async () => {
			const res = await pipe(Future.of(42), Future.awaitable);
			expect(res).toEqual(42);
		});

		test("future.map() transforms value", async () => {
			const res = await pipe(
				Future.of(5),
				Future.map((x: number) => x * 2),
				Future.awaitable,
			);

			expect(res).toEqual(10);
		});

		test("future.map_ok() transforms value", async () => {
			const res = await pipe(
				Future.of(Result.ok(5)),
				Future.map_ok((x: number) => x * 2),
				Future.awaitable,
			);

			expect(res.unwrap()).toEqual(10);
		});

		test("future.map_ok_to_result() transforms value", async () => {
			const res = await pipe(
				Future.of(Result.ok(5)),
				Future.map_ok_to_result((x: number) => Result.ok(x * 2)),
				Future.awaitable,
			);

			expect(res.unwrap()).toEqual(10);
		});

		test("future.map_ok_to_result() transforms value", async () => {
			const res = await pipe(
				Future.of(Result.ok(5)),
				Future.map_ok_to_result(() => Result.err("error")),
				Future.awaitable,
			);

			expect(res.unwrap_err()).toEqual("error");
		});

		test("future.map_err_to_result() transforms error", async () => {
			const res = await pipe(
				Future.of(Result.err("error")),
				Future.map_err_to_result(() => Result.ok(10)),
				Future.awaitable,
			);

			expect(res.unwrap()).toEqual(10);
		});

		test("future.flat_map() chains operations", async () => {
			const res = await pipe(
				Future.of(5),
				Future.flat_map((x: number) => Future.of(x * 2)),
				Future.awaitable,
			);

			expect(res).toEqual(10);
		});

		test("future.flat_map_err() chains operations", async () => {
			const res = await pipe(
				Future.of(Result.err(5)),
				Future.flat_map_err((x: number) => Future.of(Result.ok(x * 2))),
				Future.awaitable,
			);

			expect(res.unwrap()).toEqual(10);
		});

		test("future.flat_tap_ok() does not alter the result", async () => {
			const res = await pipe(
				Future.of(Result.ok(5)),
				Future.flat_tap_ok((x: number) => Future.of(Result.ok(`count: ${x}`))),
				Future.awaitable,
			);

			expect(res.unwrap()).toEqual(5);
		});

		test("future.flat_tap_ok() catches error", async () => {
			const res = await pipe(
				Future.of(Result.ok(5)),
				Future.flat_tap_ok(() => Future.of(Result.err("tap error"))),
				Future.awaitable,
			);

			expect(res.unwrap_err()).toEqual("tap error");
		});

		test("future.flat_tap_err() does not alter the result", async () => {
			const res = await pipe(
				Future.of(Result.err("My error")),
				Future.flat_tap_err((e: string) =>
					Future.of(Result.err(`handled: ${e}`)),
				),
				Future.awaitable,
			);

			expect(res.unwrap_err()).toEqual("My error");
		});

		test("future.concurrent() runs futures concurrently", async () => {
			const deferred_futures = [
				Future.of(Result.ok(1)),
				Future.of(Result.ok(2)),
				Future.of(Result.ok("str")),
			] as const;

			const res = await Future.concurrent(
				{ concurrency: Option.some(1) },
				deferred_futures,
			).awaitable();

			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap()).toEqual(2);
			expect(res[2].unwrap()).toEqual("str");
		});

		test("future.concurrent() stops pulling new work after an error", async () => {
			const deferred_futures = [
				Future.of(Result.ok(1)),
				Future.of(Result.err("second failed")),
				Future.of(Result.ok(3)),
			] as const;

			// concurrency: 1 — worker processes futures serially, so future[2] is
			// never started once future[1]'s error sets has_error
			const res = await Future.concurrent(
				{ concurrency: Option.some(1) },
				deferred_futures,
			).awaitable();

			expect(res.length).toEqual(2);
			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap_err()).toEqual("second failed");
		});

		test("future.concurrent() free slot picks up next future without waiting for slow peers", async () => {
			const order: string[] = [];

			const make_delayed = <T>(value: T, ms: number, label: string) =>
				Future.new(
					() =>
						new Promise<Result<T, never>>((resolve) => {
							order.push(`start:${label}`);
							setTimeout(() => {
								order.push(`end:${label}`);
								resolve(Result.ok(value));
							}, ms);
						}),
				);

			const res = await Future.concurrent(
				{ concurrency: Option.some(2) },
				[
					make_delayed(1, 100, "slow"),
					make_delayed(2, 20, "fast"),
					make_delayed(3, 20, "next"),
				] as const,
			).awaitable();

			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap()).toEqual(2);
			expect(res[2].unwrap()).toEqual(3);

			// "next" must have started before "slow" finished — the freed slot picked
			// it up immediately rather than waiting for the slow peer
			expect(order.indexOf("start:next")).toBeLessThan(order.indexOf("end:slow"));
		});

	});

	describe("throttled", () => {
		test("future.throttled() returns all results in order", async () => {
			const res = await Future.throttled(
				{ limit: 10, per_ms: 1000 },
				[
					Future.of(Result.ok(1)),
					Future.of(Result.ok(2)),
					Future.of(Result.ok(3)),
				] as const,
			).awaitable();

			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap()).toEqual(2);
			expect(res[2].unwrap()).toEqual(3);
		});

		test("future.throttled() enforces max starts per window", async () => {
			// limit: 2 per 100ms — 6 futures must span at least 2 windows
			const start_times: number[] = [];

			const futures = Array.from({ length: 6 }, (_, i) =>
				Future.new(() => {
					start_times.push(Date.now());
					return Promise.resolve(Result.ok(i));
				}),
			) as unknown as [
				Future<Result<number, never>>,
				Future<Result<number, never>>,
				Future<Result<number, never>>,
				Future<Result<number, never>>,
				Future<Result<number, never>>,
				Future<Result<number, never>>,
			];

			const res = await Future.throttled(
				{ limit: 2, per_ms: 100 },
				futures,
			).awaitable();

			expect(res.length).toEqual(6);
			res.forEach((r, i) => expect(r.unwrap()).toEqual(i));

			// 3rd future must start at least 80ms after the 2nd (rate limit kicked in)
			expect(start_times[2] - start_times[1]).toBeGreaterThanOrEqual(80);
		});

		test("future.throttled() stops on error", async () => {
			const started: number[] = [];

			const make = (i: number, fail = false) =>
				Future.new(() => {
					started.push(i);
					return Promise.resolve(fail ? Result.err("boom") : Result.ok(i));
				});

			await Future.throttled(
				{ limit: 10, per_ms: 1000 },
				[make(0), make(1, true), make(2), make(3)] as const,
			).awaitable();

			// future[2] may or may not have started (in-flight when error set),
			// but future[3] must not have started
			expect(started).not.toContain(3);
		});
	});
});
