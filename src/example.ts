import { Future, type None, Option, Result } from "./index";

interface User {
	id: number;
	name: string;
	email: string;
}

export class NotFoundError extends Error {
	type = "NotFound" as const;

	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export const mockUsers: Map<number, User> = new Map();

export const findById = (id: number): Future<Result<Option<User>, None>> =>
	Future.new(async () => {
		const user = mockUsers.get(id);
		return Result.ok(user ? Option.some(user) : Option.none);
	});

export const update_user = (
	id: number,
	updates: Partial<Pick<User, "name" | "email">>,
): Future<Result<User, NotFoundError>> =>
	Future.new(async () => {
		const user = mockUsers.get(id);
		if (!user) {
			return Result.err(new NotFoundError("User not found"));
		}

		const updatedUser: User = {
			...user,
			...updates,
		};

		mockUsers.set(id, updatedUser);
		return Result.ok(updatedUser);
	});
