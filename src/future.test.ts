import { Future } from "./future";
import { pipe } from "./pipe";
import { Result } from "./result";

describe("Future", () => {
	describe("fluent api", () => {
		test("future.isFuture", () => {
			const fut = Future.of(42);
			expect(fut.isFuture()).toBe(true);
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
				{ concurrency: 1 },
				deferred_futures,
			).awaitable();

			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap()).toEqual(2);
			expect(res[2].unwrap()).toEqual("str");
		});

		test("future.concurrent() with concurrency 2 and second future failing", async () => {
			const deferred_futures = [
				Future.of(Result.ok(1)),
				Future.of(Result.err("second failed")),
				Future.of(Result.ok(3)),
			] as const;

			const res = await Future.concurrent(
				{ concurrency: 2 },
				deferred_futures,
			).awaitable();

			expect(res.length).toEqual(2);
			expect(res[0].unwrap()).toEqual(1);
			expect(res[1].unwrap_err()).toEqual("second failed");
		});
	});
});
