import { identity, pipe } from "./pipe";

describe("Pipe", () => {
	test("pipe with single value returns value", () => {
		const result = pipe(42);
		expect(result).toEqual(42);
	});

	test("pipe with one function", () => {
		const double = (x: number) => x * 2;
		const result = pipe(5, double);
		expect(result).toEqual(10);
	});

	test("pipe with two functions", () => {
		const double = (x: number) => x * 2;
		const result = pipe(5, double, (x) => x.toString());
		expect(result).toEqual("10");
	});

	test("pipe with three functions", () => {
		const double = (x: number) => x * 2;
		const addPrefix = (x: string) => `value: ${x}`;
		const result = pipe(5, double, (x) => x.toString(), addPrefix);
		expect(result).toEqual("value: 10");
	});

	test("identity returns input unchanged", () => {
		expect(identity(42)).toEqual(42);
		expect(identity("hello")).toEqual("hello");
		expect(identity(null)).toEqual(null);
	});
});
