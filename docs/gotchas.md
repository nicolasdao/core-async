# Gotchas

Non-obvious behavior, pitfalls, and edge cases in core-async.

## Table of Contents
- [Putting null Closes the Channel](#putting-null-closes-the-channel)
- [sput and stake Return false, Not Throw](#sput-and-stake-return-false-not-throw)
- [sput Returns a Promise When the Channel Has a Transducer](#sput-returns-a-promise-when-the-channel-has-a-transducer)
- [Sliding Drops the Oldest, Dropping Drops the Newest](#sliding-drops-the-oldest-dropping-drops-the-newest)
- [Always Close Your Channels](#always-close-your-channels)
- [Timeout and alts Pattern](#timeout-and-alts-pattern)
- [Transducer Filter Rejection via NOMATCHKEY](#transducer-filter-rejection-via-nomatchkey)
- [async/await Is Required for Blocking Semantics](#asyncawait-is-required-for-blocking-semantics)
- [Timeout Errors Have Code 408](#timeout-errors-have-code-408)

## Putting null Closes the Channel

`null` is a special sentinel value. Putting `null` onto a channel is equivalent to calling `channel.close()`:

```js
await chan.put(null) // This closes the channel
```

This means you **cannot** use `null` as a data value in channels. If you need to represent "no value," use `undefined`, an empty object `{}`, or a custom sentinel.

After a channel is closed:
- `put` resolves with `null`
- `take` resolves with `null`
- `stake()` returns `false`

## sput and stake Return false, Not Throw

`sput` and `stake` are synchronous, non-blocking alternatives to `put` and `take`. When they cannot complete immediately, they return `false` silently — they do **not** throw or queue the operation.

```js
const chan = new Channel()

// No taker waiting — value is silently NOT queued
chan.sput('hello') // false

// No value available — returns false, not null
chan.stake() // false
```

This is fundamentally different from `put`/`take`, which block (await) until the operation completes. Use `sput`/`stake` only when you intentionally want fire-and-forget semantics.

## sput Returns a Promise When the Channel Has a Transducer

When a channel has a transducer, `sput` must run the value through the transducer (which may be async). In this case, `sput` returns a `Promise<Boolean>` instead of a plain `Boolean`:

```js
import { Channel, map } from 'core-async'

const chan = new Channel(map(x => x + 1))

// This is now a Promise, not a boolean!
const result = chan.sput(5)
result.then(success => console.log(success)) // true or false
```

## Sliding Drops the Oldest, Dropping Drops the Newest

These two modes handle buffer overflow differently, and confusing them is easy:

| Mode | What gets dropped | `put` returns |
|---|---|---|
| `dropping` | The **new** value (the one being put) | `null` |
| `sliding` | The **oldest** buffered value | `true` |

```js
// Dropping: keeps 'hello', drops 'world'
const dropping = new Channel(1, { mode: 'dropping' })
await dropping.put('hello')  // true  (buffered)
await dropping.put('world')  // null  (dropped)
await dropping.take()        // 'hello'

// Sliding: drops 'hello', keeps 'world'
const sliding = new Channel(1, { mode: 'sliding' })
await sliding.put('hello')   // true  (buffered)
await sliding.put('world')   // true  (evicts 'hello')
await sliding.take()         // 'world'
```

## Always Close Your Channels

Channels create pending tasks on the Node.js event loop. If you leave channels open with blocked `put` or `take` operations, the event loop won't drain and your process may hang or waste resources.

This is especially important in environments like **AWS Lambda**, where the runtime may keep the function alive (and billing) while the event loop has pending tasks, even after the callback has been invoked.

```js
;(async () => {
  const chan = new Channel()

  // ... use the channel ...

  chan.close() // Always close when done
})()
```

Closing a channel immediately resolves all pending operations:
- Blocked `put` operations resolve with `false`
- Blocked `take` operations resolve with `null`

## Timeout and alts Pattern

The idiomatic way to implement time-bounded operations is to combine [`alts`](./api.md#altschannels) with [`timeout`](./api.md#timeouttime):

```js
import { Channel, alts, timeout } from 'core-async'

const dataChan = new Channel()

;(async () => {
  const t = timeout(3000) // 3-second deadline
  let carryOn = true

  while (carryOn) {
    const [value, chan] = await alts([dataChan, t])

    if (chan === t) {
      carryOn = false
      console.log('Timed out!')
    } else {
      console.log(`Got: ${value}`)
    }
  }
})()
```

This is more flexible than the `timeout` option on `put`/`take` because:
1. A single timeout can govern an entire loop of operations.
2. You can react to the timeout (e.g., log, clean up) instead of catching an error.

## Transducer Filter Rejection via NOMATCHKEY

When a `filter` transducer rejects a value, it internally returns a special `NOMATCHKEY` string (`'no_match_7WmYhpJF33VG3X2dEqCQSwauKRb4zrPIRCh19zDF'`). This sentinel propagates through composed transducers and causes `put` to resolve with `false`.

You don't need to handle `NOMATCHKEY` directly — it's an internal mechanism. However, be aware that:
- In a `compose` chain, if any transducer returns `NOMATCHKEY`, all subsequent transducers in the chain are skipped.
- `put` returns `false` so you can detect that the value was rejected.

```js
const chan = new Channel(filter(x => x > 10))

;(async () => {
  const accepted = await chan.put(5)
  if (!accepted) {
    console.log('Value was filtered out')
  }
})()
```

## async/await Is Required for Blocking Semantics

`put` and `take` return Promises. To get blocking (sequential) behavior, you **must** use `await` inside an `async` function:

```js
// CORRECT: blocking behavior with async/await
;(async () => {
  await chan.put(1)           // Blocks until taken
  const v = await chan.take() // Blocks until a value is available
})()

// WRONG: these return promises but don't block
chan.put(1)    // Returns a promise, does not wait
chan.take()    // Returns a promise, does not wait
```

Without `await`, you can still use `.then()` chains, but you lose the sequential readability that makes CSP patterns ergonomic.

> **Note:** In v2.x, the `co` library and generator functions (`co(function *() { yield ... })`) were used for blocking semantics. In v3.x, `co` is no longer bundled. Use native `async`/`await` instead, which provides the same sequential behavior without any external dependency.

## Timeout Errors Have Code 408

When `put` or `take` times out (via the `timeout` option), the thrown error has a `code` property set to `408` (HTTP "Request Timeout" status code):

```js
try {
  await chan.take({ timeout: 1000 })
} catch (err) {
  console.log(err.code)    // 408
  console.log(err.message) // "'take' timed out after 1000 ms. No data was taken off the channel."
}
```

This convention allows you to distinguish timeout errors from other errors programmatically.
