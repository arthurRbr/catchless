import { pipe } from "./pipe";
import { Result } from "./result";

describe("Result", () => {
	describe("fluent api", () => {
		test("result.ok() creates Ok value", () => {
			const res = Result.ok(42);
			expect(res).toStrictEqual(
				expect.objectContaining({
					_tag: "Ok",
					value: 42,
				}),
			);
		});

		test("result.err() creates Err value", () => {
			const res = Result.err("error");
			expect(res).toStrictEqual(
				expect.objectContaining({
					_tag: "Err",
					error: "error",
				}),
			);
		});

		test("result.is_ok() returns true for Ok", () => {
			const res = Result.ok(42);
			expect(res.is_ok()).toEqual(true);
		});

		test("result.is_ok() returns false for Err", () => {
			const res = Result.err("error");
			expect(res.is_ok()).toEqual(false);
		});

		test("result.is_err() returns true for Err", () => {
			const res = Result.err("error");
			expect(res.is_err()).toEqual(true);
		});

		test("result.is_err() returns false for Ok", () => {
			const res = Result.ok(42);
			expect(res.is_err()).toEqual(false);
		});

		test("result.unwrap() returns value for Ok", () => {
			const res = Result.ok(42);
			expect(res.unwrap()).toEqual(42);
		});

		test("result.unwrap() throws for Err", () => {
			const res = Result.err("error");
			expect(() => res.unwrap()).toThrow("error");
		});

		test("result.unwrap_err() returns error for Err", () => {
			const res = Result.err("error");
			expect(res.unwrap_err()).toEqual("error");
		});

		test("result.unwrap_err() throws for Ok", () => {
			const res = Result.ok(42);
			expect(() => res.unwrap_err()).toThrow("unwrap_err() on Ok: 42");
		});

		test("result.match() calls ok handler for Ok", () => {
			const message = Result.ok(42).match({
				ok: (value) => `Success: ${value}`,
				err: (error) => `Error: ${error}`,
			});
			expect(message).toEqual("Success: 42");
		});

		test("result.match() calls err handler for Err", () => {
			const message = Result.err("something went wrong").match({
				ok: (value) => `Success: ${value}`,
				err: (error) => `Error: ${error}`,
			});
			expect(message).toEqual("Error: something went wrong");
		});
	});

	describe("pipe api", () => {
		test("result.unwrap() returns value for Ok", () => {
			const value = pipe(Result.ok(42), Result.unwrap);
			expect(value).toEqual(42);
		});

		test("result.unwrap() throws for Err", () => {
			expect(() => pipe(Result.err("error"), Result.unwrap)).toThrow("error");
		});

		test("result.unwrap_err() returns error for Err", () => {
			const error = pipe(Result.err("error"), Result.unwrap_err);
			expect(error).toEqual("error");
		});

		test("result.unwrap_err() throws for Ok", () => {
			expect(() => pipe(Result.ok(42), Result.unwrap_err)).toThrow(
				new Error("unwrap_err() on Ok: 42"),
			);
		});

		test("result.unwrap_or() returns value for Ok", () => {
			const value = pipe(Result.ok(42), Result.unwrap_or(0));
			expect(value).toEqual(42);
		});

		test("result.unwrap_or() returns default for Err", () => {
			const value = pipe(Result.err("error"), Result.unwrap_or(0));
			expect(value).toEqual(0);
		});

		test("result.map_ok() transforms Ok value (piped)", () => {
			const value = pipe(
				Result.ok(5),
				Result.map_ok((x: number) => x * 2),
				Result.unwrap,
			);

			expect(value).toEqual(10);
		});

		test("result.map_err() transforms Err value (piped)", () => {
			const error = pipe(
				Result.err("error"),
				Result.map_err((e: string) => e.toUpperCase()),
				Result.unwrap_err,
			);

			expect(error).toEqual("ERROR");
		});

		test("result.flat_map_ok() chains Ok operations", () => {
			const value = pipe(
				Result.ok(5),
				Result.flat_map_ok((x: number) => Result.ok(x * 2)),
				Result.unwrap,
			);

			expect(value).toEqual(10);
		});

		test("result.match() calls ok handler for Ok (piped)", () => {
			const result = pipe(
				Result.ok(42),
				Result.match({
					ok: (value) => `Success: ${value}`,
					err: (error) => `Error: ${error}`,
				}),
			);
			expect(result).toEqual("Success: 42");
		});

		test("result.match() calls err handler for Err (piped)", () => {
			const result = pipe(
				Result.err("something went wrong"),
				Result.match({
					ok: (value) => `Success: ${value}`,
					err: (error) => `Error: ${error}`,
				}),
			);
			expect(result).toEqual("Error: something went wrong");
		});

		test("result.all_or_first_err() returns Ok with all values if all are Ok", () => {
			type MyError = {
				type: "MyError";
			};

			const first_res = Result.ok(1) as Result<number, MyError>;
			const second_res = Result.ok("hello") as Result<string, boolean>;
			const result = Result.all_or_first_err(...[first_res, second_res]);

			expect(result.unwrap()).toEqual([1, "hello"]);
		});

		test("result.all_or_first_err() returns Err with first error if any are Err", () => {
			type MyError = {
				type: "MyError";
			};

			const first_res = Result.ok(1) as Result<number, MyError>;
			const second_res = Result.err({
				type: "MyError",
			} satisfies MyError) as Result<string, MyError>;

			const result = Result.all_or_first_err(...[first_res, second_res]);

			expect(result.unwrap_err()).toEqual({ type: "MyError" });
		});
	});
});
