# Catchless

> ⚠️ **Disclaimer**: This documentation is AI-generated.

Small, lightweight functional utilities for TypeScript, inspired by Rust's approach to `Option`, `Result`, and explicit error handling.

- `pipe` for readable function pipelines
- `Option` for optional values
- `Result` for success/error flows
- `Future` for async composition

## Install

```bash
pnpm add catchless
yarn add catchless
npm install catchless
```

## Example

```ts
import { Future, Option, Result, pipe } from "catchless";

const find_user = (id: string): Future<Result<Option<User>, DbError>> =>
  Future.new(async () => {
    try {
      const row = await db.find_by_id(id);
      return Result.ok(Option.from_nullish(row));
    } catch {
      return Result.err({ message: "db error" });
    }
  });

const greet = (id: string) =>
  pipe(
    find_user(id),
    Future.map_ok_to_result((user) =>
      Option.to_result(user, { message: "user not found" } as UserNotFoundError),
    ),
    Future.map_ok((user) => `Hello, ${user.name}!`),
    Future.awaitable,
  );

const message = await greet("42");

message.match({
  ok: (text) => console.log(text),
  err: (e) => console.error(e.message),
});
```

---

## API

```ts
import { Future, Option, Result, pipe } from "catchless";
```

### `pipe`

Pipes a value through a sequence of functions left-to-right: `pipe(value, fn1, fn2, ...)`.

---

### `Option`

Represents an optional value — either `Some<T>` or `None`.

| Method | Description | Fluent |
|---|---|:---:|
| `Option.some(value)` | Creates `Some<T>`. Value must not be `undefined`. | |
| `Option.none` | The singleton `None` value. | |
| `Option.from_undefined(value)` | `Some` if value is not `undefined`, else `None`. | |
| `Option.from_nullish(value)` | `Some` if value is not `null`/`undefined`, else `None`. | |
| `Option.is_some(opt)` | Type guard — narrows to `Some<T>`. | ✓ |
| `Option.is_none(opt)` | Type guard — narrows to `None`. | ✓ |
| `Option.map(fn)(opt)` | Applies `fn` to the value if `Some`, otherwise `None`. | |
| `Option.map_none(fn)(opt)` | Calls `fn` if `None`; passes `Some` through. | |
| `Option.flat_map(fn)(opt)` | Like `map` but `fn` returns `Option<U>`. | |
| `Option.flat(opt)` | Flattens `Option<Option<T>>` → `Option<T>`. | |
| `Option.unwrap(opt)` | Returns the value or throws if `None`. | ✓ |
| `Option.unwrap_or(fallback)(opt)` | Returns the value or `fallback`. | ✓ |
| `Option.match(handlers)(opt)` | Pattern-matches on `Some`/`None`. | ✓ |
| `Option.to_result(opt, error)` | `Ok(value)` or `Err(error)`. | ✓ |
| `Option.to_null(opt)` | Returns the value or `null`. | |
| `Option.to_undefined(opt)` | Returns the value or `undefined`. | |

---

### `Result`

Represents either success — `Ok<T>` — or failure — `Err<E>`.

| Method | Description | Fluent |
|---|---|:---:|
| `Result.ok(value)` | Creates `Ok<T>`. | |
| `Result.err(error)` | Creates `Err<E>`. | |
| `Result.is_ok(res)` | Type guard — narrows to `Ok<T>`. | ✓ |
| `Result.is_err(res)` | Type guard — narrows to `Err<E>`. | ✓ |
| `Result.map_ok(fn)(res)` | Maps the `Ok` value; passes `Err` through. | |
| `Result.map_err(fn)(res)` | Maps the `Err` value; passes `Ok` through. | |
| `Result.flat_map_ok(fn)(res)` | Like `map_ok` but `fn` returns `Result<U, E>`. | |
| `Result.unwrap(res)` | Returns `Ok` value or throws. | ✓ |
| `Result.unwrap_err(res)` | Returns `Err` value or throws. | ✓ |
| `Result.unwrap_or(default)(res)` | Returns `Ok` value or `default`. | |
| `Result.match(handlers)(res)` | Pattern-matches on `Ok`/`Err`. | ✓ |
| `Result.all_or_first_err(...results)` | `Ok([...values])` or the first `Err`. | |

---

### `Future`

Represents a lazy async computation executed only when `.awaitable()` is called.

| Method | Description | Fluent |
|---|---|:---:|
| `Future.new(fn)` | Wraps a `() => Promise<T>` into a `Future<T>`. | |
| `Future.of(value)` | Resolves immediately to `value`. | |
| `Future.start()` | Resolves to `undefined`. Useful as a pipeline entry point. | |
| `Future.awaitable(fut)` | Executes the future and returns its `Promise`. | ✓ |
| `Future.map(fn)(fut)` | Maps the resolved value. | |
| `Future.flat_map(fn)(fut)` | Chains a function returning a `Future`. | |
| `Future.map_ok(fn)(fut)` | Maps the `Ok` value inside `Future<Result<T,E>>`. | |
| `Future.map_err(fn)(fut)` | Maps the `Err` value inside `Future<Result<T,E>>`. | |
| `Future.map_ok_to_result(fn)(fut)` | Maps `Ok` to a new `Result`, merging error types. | |
| `Future.map_err_to_result(fn)(fut)` | Maps `Err` to a new `Result`, merging value types. | |
| `Future.flat_map_ok(fn)(fut)` | Chains `fn: T => Future<Result<U,E2>>` on `Ok`. | |
| `Future.flat_map_err(fn)(fut)` | Chains `fn: E => Future<Result<T2,E2>>` on `Err`. | |
| `Future.flat_tap_ok(fn)(fut)` | Side-effect on `Ok`; propagates errors from the effect. | |
| `Future.flat_tap_err(fn)(fut)` | Side-effect on `Err`; value passes through unchanged. | |
| `Future.concurrent(options, futures)` | Runs futures in batches of `options.concurrency`. Stops on first `Err`. | |

---

## Development

```bash
pnpm test
pnpm build
```
