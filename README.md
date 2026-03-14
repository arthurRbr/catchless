# Catchless

Small, lightweight functional utilities for TypeScript:

Inspired by Rust's approach to `Option`, `Result`, and explicit error handling.

- `Option` for optional values
- `Result` for success/error flows
- `Future` for async composition
- `pipe` for readable function pipelines

## Install

```bash
pnpm add catchless
yarn add catchless
npm install catchless
```

## API

```ts
import { Future, Option, Result, pipe } from "catchless";
```

## Quick Example

```ts
import { Future, Option, Result, pipe } from "catchless";

const get_user = (id: string): Future<Result<Option<User>, DbError>> =>
	Future.new(async () => {
		try {
			const user = await db.find_by_id();
			return Option.from_nullable(user);
		} catch {
			return Result.err(new DbError());
		}
	});

const program = pipe(
	get_user(1),
	Future.map_ok_to_result((user) =>
		user.to_result<UserNotFoundError>(new UserNotFoundError()),
	),
	Future.map_ok((user) => `Hello ${user.name}`),
);

const run = async () => {
	const result = await program.awaitable();
	console.log(
		result.match({
			ok: (message) => message,
			err: (error) => error.message,
		}),
	);
};
```

## Development

```bash
pnpm test
pnpm build
```
