import { Option } from "./option";
import { pipe } from "./pipe";

describe("Option", () => {
	describe("fluent api", () => {
		test("option.some() creates Some value", () => {
			const opt = Option.some(42);
			expect(opt).toStrictEqual(
				expect.objectContaining({
					_tag: "Some",
					value: 42,
				}),
			);
		});

		test('"option.some(null) creates Some', () => {
			const opt = Option.some(null);
			expect(opt).toStrictEqual(
				expect.objectContaining({
					_tag: "Some",
					value: null,
				}),
			);
		});

		test("option.none() creates None value", () => {
			const none = Option.none;
			expect(none).toStrictEqual(
				expect.objectContaining({
					_tag: "None",
				}),
			);
		});

		test("option.is_some() returns true for Some", () => {
			const opt = Option.some(42);
			expect(opt.is_some()).toEqual(true);
		});

		test("option.is_some() returns false for None", () => {
			const none = Option.none;
			expect(none.is_some()).toEqual(false);
		});

		test("option.is_none() returns true for None", () => {
			const none = Option.none;
			expect(none.is_none()).toEqual(true);
		});

		test("option.is_none() returns false for Some", () => {
			const opt = Option.some(42);
			expect(opt.is_none()).toEqual(false);
		});

		describe("option.from_nullish()", () => {
			test("option.from_nullish() creates Some for non-nullish value", () => {
				const opt = Option.from_nullish(42);
				expect(opt.unwrap()).toEqual(42);
			});

			test("option.from_nullish() creates None for null value", () => {
				const name: string | null = null;
				const opt = Option.from_nullish(name);
				expect(opt.is_none()).toEqual(true);
			});

			test("option.from_nullish() creates None for undefined value", () => {
				const name: string | undefined = undefined as string | undefined;
				const opt = Option.from_nullish(name);
				expect(opt.is_none()).toEqual(true);
			});
		});

		describe("option.from_undefined()", () => {
			test("option.from_undefined() creates None for undefined value", () => {
				const name: string | undefined = undefined as string | undefined;
				const opt = Option.from_undefined(name);
				expect(opt.is_none()).toEqual(true);
			});

			test("option.from_undefined() creates Some for null value", () => {
				const name: string | undefined | null = null as
					| string
					| undefined
					| null;
				const opt = Option.from_undefined(name);
				expect(opt.is_some()).toEqual(true);
			});
		});

		test("option.unwrap() returns value for Some", () => {
			const opt = Option.some(42);
			expect(opt.unwrap()).toEqual(42);
		});

		test("option.unwrap() throws for None", () => {
			const none = Option.none;
			expect(() => none.unwrap()).toThrow("Called unwrap on None");
		});

		test("option.unwrap_or() returns value for Some", () => {
			const age: number = 42;
			const opt: Option<number> = Option.some(age);
			expect(opt.unwrap_or(0)).toEqual(42);
		});

		test("option.unwrap_or() returns value for None", () => {
			const none = Option.none;
			expect(none.unwrap_or(0)).toEqual(0);
		});

		test("option.match() calls some handler for Some", () => {
			const opt = Option.some(42);
			const result = opt.match({
				some: (value) => `Value: ${value}`,
				none: () => "No value",
			});
			expect(result).toEqual("Value: 42");
		});

		test("option.match() calls none handler for None", () => {
			const opt = Option.none;
			const result = opt.match({
				some: (value) => `Value: ${value}`,
				none: () => "No value",
			});
			expect(result).toEqual("No value");
		});

		test("option.to_result() converts Some to Ok", () => {
			const opt = Option.some(42);
			const result = opt.to_result();
			expect(result.unwrap()).toEqual(42);
		});

		test("option.to_result() converts None to Err", () => {
			const opt = Option.none;
			const result = opt.to_result("Error");
			expect(result.unwrap_err()).toEqual("Error");
		});

		test("option.map_none() returns original value for Some", () => {
			const opt = Option.some("hello");
			const result = pipe(
				opt,
				Option.map_none(() => Option.some("world" as string)),
			);
			expect(result.unwrap()).toEqual("hello");
		});

		test("option.map_none() applies function for None", () => {
			const opt = Option.none;
			const result = pipe(
				opt,
				Option.map_none(() => Option.some("Hello world")),
			);
			expect(result.unwrap()).toEqual("Hello world");
		});

		test("option.flat() flattens Some(Some(value)) to Some(value)", () => {
			const opt = Option.some(42);
			const outer = Option.some(opt);
			const result = Option.flat(outer);
			expect(result.unwrap()).toEqual(42);
		});

		test("option.flat() flattens Some(None) to None", () => {
			const outer = Option.some(Option.none);
			const result = Option.flat(outer);
			expect(result.is_none()).toEqual(true);
		});

		test("option.flat() flattens None to None", () => {
			const nested: Option<Option<number>> = Option.none;
			const result = Option.flat(nested);
			expect(result.is_none()).toEqual(true);
		});
	});

	describe("pipe api", () => {
		test("option.unwrap() returns value for Some", () => {
			const value = pipe(Option.some(42), Option.unwrap);
			expect(value).toEqual(42);
		});

		test("option.unwrap() throws for None", () => {
			expect(() => pipe(Option.none, Option.unwrap)).toThrow(
				"Called unwrap on None",
			);
		});

		test("option.map transforms Some value (piped)", () => {
			const age: number = 42;
			const value = pipe(
				Option.some(age),
				Option.map((x: number) => x * 2),
				Option.unwrap,
			);

			expect(value).toEqual(84);
		});

		test("option.flat_map() chains Some operations", () => {
			const age: number = 42;
			const value = pipe(
				Option.some(age),
				Option.flat_map((x: number) => Option.some(x * 2)),
				Option.unwrap,
			);

			expect(value).toEqual(84);
		});

		test("option.match() calls some handler for Some (piped)", () => {
			const result = pipe(
				Option.some(42),
				Option.match({
					some: (value) => `Value: ${value}`,
					none: () => "No value",
				}),
			);
			expect(result).toEqual("Value: 42");
		});

		test("option.match() calls none handler for None (piped)", () => {
			const result = pipe(
				Option.none,
				Option.match({
					some: (value) => `Value: ${value}`,
					none: () => "No value",
				}),
			);
			expect(result).toEqual("No value");
		});

		test("option.to_result() converts Some to Ok", () => {
			const opt = Option.some(42);
			const result = Option.to_result(opt, "Error");
			expect(result.unwrap()).toEqual(42);
		});

		test("option.to_result() converts None to Error", () => {
			const opt = Option.none;
			const result = Option.to_result(opt, "Error");
			expect(result.unwrap_err()).toEqual("Error");
		});

		describe("Option.to_null()", () => {
			test("returns value for Some", () => {
				const opt = Option.some(42);
				expect(Option.to_null(opt)).toEqual(42);
			});

			test("returns null for None", () => {
				const opt: Option<number> = Option.none;
				expect(Option.to_null(opt)).toBeNull();
			});
		});

		describe("Option.to_undefined()", () => {
			test("returns value for Some", () => {
				const opt = Option.some(42);
				expect(Option.to_undefined(opt)).toEqual(42);
			});

			test("returns undefined for None", () => {
				const opt: Option<number> = Option.none;
				expect(Option.to_undefined(opt)).toBeUndefined();
			});
		});
	});
});
