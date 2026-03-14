import {
	findById,
	mockUsers,
	NotFoundError,
	update_user,
} from "./example";
import { Future, pipe, Result } from "./index";

describe("User Management Example", () => {
	beforeEach(() => {
		mockUsers.clear();
		mockUsers.set(1, {
			id: 1,
			name: "Alice",
			email: "alice@example.com",
		});
		mockUsers.set(2, {
			id: 2,
			name: "Bob",
			email: "bob@example.com",
		});
	});

	test("should find a user by id", async () => {
		const res = await findById(1).awaitable();
		expect(res.unwrap().unwrap()).toStrictEqual({
			id: 1,
			name: "Alice",
			email: "alice@example.com",
		});
	});

	test("should find user by id and update them successfully", async () => {
		const fut: Future<Result<{ id: number }, NotFoundError>> = pipe(
			findById(1),
			Future.flat_map((res) => {
				return res.match({
					err: () =>
						Future.of(
							Result.err(new NotFoundError("User not found")),
						),
					ok: (maybe_user) =>
						maybe_user.match({
							some: (u) => update_user(u.id, { name: "John Doe" }),
							none: () =>
								Future.of(
									Result.err(new NotFoundError("User not found")),
								),
						}),
				});
			}),
		);

		const user = await fut.awaitable();

		expect(user.unwrap()).toStrictEqual({
			id: 1,
			name: "John Doe",
			email: "alice@example.com",
		});
	});

	test("should handle user not found with instance methods", async () => {
		const res = await update_user(999, { name: "John" }).awaitable();
		const err = res.unwrap_err();
		expect(err).toBeInstanceOf(NotFoundError);
		expect(err.message).toBe("User not found");
		expect(err.type).toBe("NotFound");
	});
});
