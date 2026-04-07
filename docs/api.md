# API Reference

> **v3.0.0 Import Style:** All public APIs are now available as direct named exports using ESM `import` syntax. CommonJS `require` is still supported but ESM is the recommended style. The nested `transducer.*` and `utils.*` namespaces have been flattened — you can now `import { filter, map, PubSub, alts }` directly from `'core-async'`.

## Table of Contents
- [Channel](#channel)
  - [Constructor Signatures](#constructor-signatures)
  - [Buffered vs Unbuffered Channels](#buffered-vs-unbuffered-channels)
  - [Dropping and Sliding Modes](#dropping-and-sliding-modes)
  - [Channel.put(brick, options)](#channelputbrick-options)
  - [Channel.take(options)](#channeltakeoptions)
  - [Channel.sput(brick)](#channelsputbrick)
  - [Channel.stake()](#channelstake)
  - [Channel.close()](#channelclose)
  - [Channel State Properties](#channel-state-properties)
- [Transducers](#transducers)
  - [filter(predicate)](#filterpredicate)
  - [map(transform)](#maptransform)
  - [reduce(reduceFn, accumulator)](#reducereducefn-accumulator)
  - [compose(...transducers)](#composetransducers)
- [Utilities](#utilities)
  - [alts(channels)](#altschannels)
  - [merge(channels)](#mergechannels)
  - [timeout(time)](#timeouttime)
  - [delay(ms)](#delayms)
  - [subscribe(channel, subscribers)](#subscribechannel-subscribers)
  - [PubSub](#pubsub)
    - [pubSub.pub(topics, value)](#pubsubpubtopics-value)
    - [pubSub.sub(topics, subscriber)](#pubsubsubtopics-subscriber)
    - [pubSub.unsub(topics, subscriber)](#pubsubunsubtopics-subscriber)
    - [pubSub.close()](#pubsubclose)
  - [throttle(tasks, buffer)](#throttletasks-buffer)

## Channel

The `Channel` is the core primitive in core-async. It provides a communication mechanism between concurrent processes. A process can **put** data onto a channel and another process can **take** data off it. When no matching counterpart is ready, the operation blocks (awaits) until one becomes available.

### Constructor Signatures

```js
import { Channel } from 'core-async'

// Unbuffered channel
const chan = new Channel()

// Buffered channel (buffer size = 2)
const chan = new Channel(2)

// Channel with a transducer
const chan = new Channel(myTransducer)

// Buffered channel with a transducer
const chan = new Channel(2, myTransducer)

// Channel with options
const chan = new Channel(2, { mode: 'sliding', onClosing: () => console.log('closing') })

// Buffered channel with transducer and options
const chan = new Channel(2, myTransducer, { mode: 'dropping' })

// Transducer with options (no buffer)
const chan = new Channel(myTransducer, { onClosing: () => console.log('closing') })
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `buffer` | `Number` | No | Buffer size. Defaults to `0` (unbuffered). Must be >= 1 when mode is `'sliding'` or `'dropping'`. |
| `transform` | `Function` | No | A transducer function applied to every value put onto the channel. See [Transducers](#transducers). |
| `options.mode` | `String` | No | One of `'default'`, `'sliding'`, or `'dropping'`. Defaults to `'default'`. |
| `options.onClosing` | `Function` | No | Callback invoked when `close()` is called. |

### Buffered vs Unbuffered Channels

An **unbuffered** channel (buffer = 0) blocks every `put` until a corresponding `take` is ready, and vice versa. This provides strict synchronization between producer and consumer.

A **buffered** channel allows up to `buffer` puts to complete immediately without a waiting taker. Once the buffer is full, subsequent puts block until a take frees a slot.

```js
import { Channel } from 'core-async'

const bufferedChan = new Channel(2)
const unbufferedChan = new Channel()

;(async () => {
  await bufferedChan.put(1) // Completes immediately (buffer slot 1)
  await bufferedChan.put(2) // Completes immediately (buffer slot 2)
  await bufferedChan.put(3) // Blocks until a take frees a slot
})()

;(async () => {
  await unbufferedChan.put(1) // Blocks until a taker is ready
})()
```

### Dropping and Sliding Modes

Both modes require a buffer size >= 1.

**Dropping mode** (`mode: 'dropping'`): When the buffer is full, new puts are silently dropped. The `put` resolves immediately with `null` instead of blocking.

**Sliding mode** (`mode: 'sliding'`): When the buffer is full, the **oldest** buffered value is discarded to make room for the new one. The `put` resolves immediately with `true`.

```js
import { Channel } from 'core-async'

const droppingChan = new Channel(1, { mode: 'dropping' })
const slidingChan = new Channel(1, { mode: 'sliding' })

// Dropping: 'baby' and 'world!' are dropped because the buffer is full
;(async () => {
  const p1 = await droppingChan.put('hello')  // true  (fills buffer)
  const p2 = await droppingChan.put('baby')   // null  (dropped)
  const p3 = await droppingChan.put('world!') // null  (dropped)
})()

// Only 'hello' can be taken
;(async () => {
  const val = await droppingChan.take() // 'hello'
})()

// Sliding: each new put evicts the oldest
;(async () => {
  const p1 = await slidingChan.put('hello')  // true (fills buffer)
  const p2 = await slidingChan.put('baby')   // true (evicts 'hello')
  const p3 = await slidingChan.put('world!') // true (evicts 'baby')
})()

// Only 'world!' (the most recent) can be taken
;(async () => {
  const val = await slidingChan.take() // 'world!'
})()
```

### Channel.put(brick, options)

Asynchronously puts a value ("brick") onto the channel. Returns a `Promise<Boolean>`.

- Resolves with `true` when the value is successfully taken by a consumer.
- Resolves with `false` when a transducer filters the value out (see [Transducers](#transducers)).
- Resolves with `null` when the channel is closed or the value is dropped (dropping mode).
- **Putting `null` closes the channel.** See [gotchas](./gotchas.md#putting-null-closes-the-channel).

**Options:**

| Option | Type | Description |
|---|---|---|
| `timeout` | `Number` | Milliseconds. If the put is not consumed within this time, the promise rejects with a timeout error (code `408`). |

```js
;(async () => {
  const status = await chan.put('hello')

  // With timeout — throws if not consumed within 5000ms
  try {
    await chan.put('hello', { timeout: 5000 })
  } catch (err) {
    console.log(err.message) // "'put' timed out after 5000 ms. No data was added to the channel."
    console.log(err.code)    // 408
  }
})()
```

### Channel.take(options)

Asynchronously takes a value from the channel. Returns a `Promise<Object>`.

- Resolves with the value when one is available.
- Resolves with `null` when the channel is closed and no more values are available.

**Options:**

| Option | Type | Description |
|---|---|---|
| `timeout` | `Number` | Milliseconds. If no value is available within this time, the promise rejects with a timeout error (code `408`). |

```js
;(async () => {
  const value = await chan.take()

  // With timeout — throws if nothing available within 3000ms
  try {
    const value = await chan.take({ timeout: 3000 })
  } catch (err) {
    console.log(err.message) // "'take' timed out after 3000 ms. No data was taken off the channel."
    console.log(err.code)    // 408
  }
})()
```

### Channel.sput(brick)

**Synchronous put.** Attempts to put a value onto the channel without blocking. Only succeeds if a taker is already waiting.

- Returns `true` if the value was immediately delivered to a waiting taker.
- Returns `false` if no taker is waiting (the value is **not** queued).

When the channel has a transducer, `sput` returns a `Promise` that resolves to `true` or `false`.

```js
const chan = new Channel()

// No taker is waiting yet
const result = chan.sput('hello') // false — value was not delivered

// If a taker is already waiting:
chan.take() // Sets up a waiting taker
const result = chan.sput('hello') // true — delivered immediately
```

### Channel.stake()

**Synchronous take.** Attempts to take a value from the channel without blocking. Only succeeds if a value has already been put.

- Returns the value if one is available.
- Returns `false` if no value is available.

```js
const chan = new Channel()

const result = chan.stake() // false — nothing available

chan.put('hello') // Queues a value
const result = chan.stake() // 'hello'
```

### Channel.close()

Closes the channel. After closing:

- All pending (blocked) `take` operations resolve with `null`.
- All pending (blocked) `put` operations resolve with `false`.
- Any future `put` resolves immediately with `null`.
- Any future `take` resolves immediately with `null`.
- `stake()` returns `false`.

The `options.onClosing` callback (if provided at construction) is invoked when `close()` is called.

You can also close a channel by putting `null`: `await chan.put(null)`.

```js
const chan = new Channel()

chan.close()

;(async () => {
  const putResult = await chan.put('hello') // null (channel closed)
  const takeResult = await chan.take()      // null (channel closed)
})()
```

### Channel State Properties

| Property | Type | Description |
|---|---|---|
| `chan.opened` | `Boolean` | `true` until `close()` is called. |
| `chan.closing` | `Boolean` | `true` after `close()` is called. |
| `chan.closed` | `Boolean` | `true` after `close()` has finished resolving all pending operations. |

## Transducers

Transducers are composable functions that transform data flowing through a channel. When a transducer is attached to a channel, every value put onto that channel passes through the transducer before being delivered to a taker.

Transducers support both synchronous functions and functions that return Promises.

Import transducers from:

```js
import { filter, map, reduce, compose } from 'core-async'
```

### filter(predicate)

Creates a transducer that only allows values matching the predicate through the channel.

**Signature:** `filter(predicate: (value, index) => Boolean) => Transducer`

- When the predicate returns `true`, the value passes through.
- When the predicate returns `false`, the value is rejected and `put` resolves with `false`.
- The predicate can return a `Promise<Boolean>`.

```js
import { Channel, filter } from 'core-async'

const chan = new Channel(filter(x => x > 1))

;(async () => {
  const s1 = await chan.put(1) // false (filtered out)
  const s2 = await chan.put(2) // true  (accepted)
  const s3 = await chan.put(3) // true  (accepted)
})()

;(async () => {
  const a = await chan.take() // 2
  const b = await chan.take() // 3
})()
```

### map(transform)

Creates a transducer that transforms each value before it enters the channel.

**Signature:** `map(transform: (value, index) => Object) => Transducer`

- The transform function can return a `Promise`.

```js
import { Channel, map } from 'core-async'

const chan = new Channel(map(x => x * 10))

;(async () => {
  await chan.put(1)
  await chan.put(2)
})()

;(async () => {
  const a = await chan.take() // 10
  const b = await chan.take() // 20
})()
```

### reduce(reduceFn, accumulator)

Creates a transducer that accumulates values using a reducer function. Each put receives the accumulated result rather than the raw input.

**Signature:** `reduce(reduceFn: (accumulator, value, index) => Object, initialAccumulator) => Transducer`

- The reduce function can return a `Promise`.

```js
import { Channel, reduce } from 'core-async'

const chan = new Channel(reduce((acc, x, idx) => ({ total: acc.total + x, idx }), { total: 0 }))

;(async () => {
  await chan.put(1)
  await chan.put(2)
  await chan.put(3)
})()

;(async () => {
  const a = await chan.take() // { total: 1, idx: 0 }
  const b = await chan.take() // { total: 3, idx: 1 }
  const c = await chan.take() // { total: 6, idx: 2 }
})()
```

### compose(...transducers)

Composes multiple transducers into a single transducer. Transducers execute left-to-right. If any transducer in the chain rejects a value (e.g., a `filter`), the remaining transducers are skipped and `put` resolves with `false`.

**Signature:** `compose(...transducers: Transducer[]) => Transducer`

```js
import { Channel, compose, filter, map } from 'core-async'

const chan = new Channel(compose(
  filter(x => x > 1),   // Only values > 1
  map(x => x + 10),     // Add 10
  filter(x => x < 13)   // Only values < 13
))

;(async () => {
  await chan.put(1) // Rejected by first filter
  await chan.put(2) // Passes: 2 -> 12 -> accepted (12 < 13)
  await chan.put(3) // Rejected by last filter: 3 -> 13 -> rejected (13 not < 13)
})()

;(async () => {
  const a = await chan.take() // 12
})()
```

## Utilities

Utilities are available as direct named exports:

```js
import { PubSub, subscribe, merge, throttle, timeout, delay, alts } from 'core-async'
```

### alts(channels)

Waits for the first value to become available on any of the given channels, then takes it. Returns a two-element array `[value, channel]` identifying which channel produced the value.

**Signature:** `alts(channels: Channel[]) => Promise<[Object, Channel]>`

When multiple channels have values ready simultaneously, `alts` takes from the one whose value was put first (by sequence number).

```js
import { Channel, alts } from 'core-async'

const chan1 = new Channel()
const chan2 = new Channel()

;(async () => {
  const [value, winnerChan] = await alts([chan1, chan2])

  if (winnerChan === chan1)
    console.log(`chan1 won with: ${value}`)
  else
    console.log(`chan2 won with: ${value}`)
})()

chan1.put('hello')
chan2.put('world')
// Output: "chan1 won with: hello" (chan1's put was first)
```

A common pattern is combining `alts` with [`timeout`](#timeouttime) to implement time-bounded operations. See [gotchas — Timeout and alts pattern](./gotchas.md#timeout-and-alts-pattern).

### merge(channels)

Merges multiple channels into a single output channel. Values from all input channels are forwarded to the output channel as they arrive. When an input channel is closed, it stops contributing but the output channel remains open.

**Signature:** `merge(channels: Channel[]) => Channel`

```js
import { Channel, merge } from 'core-async'

const chan1 = new Channel()
const chan2 = new Channel()

const merged = merge([chan1, chan2])

chan1.put(1)
chan2.put('one')
chan1.put(2)
chan2.put('two')

;(async () => {
  console.log(await merged.take()) // 1
  console.log(await merged.take()) // 'one'
  console.log(await merged.take()) // 2
  console.log(await merged.take()) // 'two'
})()
```

### timeout(time)

Creates an unbuffered channel that receives the string `'timeout'` after the specified delay. The channel's `onClosing` callback cancels the timer if the channel is closed before the timeout fires.

**Signature:** `timeout(time: Number | [Number, Number]) => Channel`

- If `time` is a number, the timeout fires after that many milliseconds.
- If `time` is a two-element array `[min, max]`, the timeout fires after a random duration between `min` and `max` milliseconds.

```js
import { timeout } from 'core-async'

;(async () => {
  const t = timeout(5000)
  console.log('Waiting 5 seconds...')
  await t.take()
  console.log('Done!')
})()
```

### delay(ms)

Returns a `Promise` that resolves after the specified number of milliseconds. A simple utility for introducing pauses in async code.

**Signature:** `delay(ms: Number) => Promise<void>`

```js
import { delay } from 'core-async'

;(async () => {
  console.log('Starting...')
  await delay(2000)
  console.log('2 seconds later!')
})()
```

### subscribe(channel, subscribers)

Routes values from a source channel to subscriber channels based on rules. Each subscriber is an object with a `chan` (Channel) and a `rule` (predicate function). When a value is taken from the source, it is put onto every subscriber whose `rule` returns `true` for that value.

Closing the source channel (by putting `null`) stops the subscription loop.

**Signature:** `subscribe(channel: Channel, subscribers: Object | Object[]) => void`

**Subscriber object:** `{ chan: Channel, rule: (data) => Boolean }`

```js
import { Channel, subscribe } from 'core-async'

const source = new Channel()
const numbers = new Channel()
const strings = new Channel()

subscribe(source, [
  { chan: numbers, rule: data => typeof data === 'number' },
  { chan: strings, rule: data => typeof data === 'string' }
])

;(async () => {
  while (true) {
    const n = await numbers.take()
    console.log(`Number: ${n}`)
  }
})()

;(async () => {
  while (true) {
    const s = await strings.take()
    console.log(`String: ${s}`)
  }
})()

;[1, 'one', 2, 'two', 3, 'three'].forEach(v => source.put(v))
// Output:
// Number: 1
// String: one
// Number: 2
// String: two
// Number: 3
// String: three
```

### PubSub

A topic-based publish/subscribe system built on channels. Publishers send values to named topics, and subscriber channels receive values from topics they've subscribed to.

**Constructor:** `new PubSub()`

```js
import { Channel, PubSub } from 'core-async'

const pubSub = new PubSub()
```

#### pubSub.pub(topics, value)

Publishes a value to one or more topics.

**Signature:** `pub(topics: String | String[], value: Object) => void`

```js
pubSub.pub('numbers', 42)
pubSub.pub(['numbers', 'alerts'], 99)
```

#### pubSub.sub(topics, subscriber)

Subscribes a channel to one or more topics.

**Signature:** `sub(topics: String | String[], subscriber: Channel) => void`

```js
const numberChan = new Channel()
pubSub.sub('numbers', numberChan)
pubSub.sub(['numbers', 'letters'], anotherChan)
```

#### pubSub.unsub(topics, subscriber)

Unsubscribes a channel from one or more topics.

**Signature:** `unsub(topics: String | String[], subscriber: Channel) => void`

```js
pubSub.unsub('numbers', numberChan)
pubSub.unsub(['numbers', 'letters'], anotherChan)
```

#### pubSub.close()

Closes the PubSub instance and all channels associated with its internal subscriptions. After calling `close()`, no further messages will be delivered to subscribers, and any pending operations on subscriber channels will be resolved.

**Signature:** `close() => void`

```js
const pubSub = new PubSub()

// ... set up subscriptions and publish messages ...

// Clean up when done
pubSub.close()
```

**Full PubSub example:**

```js
import { Channel, PubSub } from 'core-async'

const pubSub = new PubSub()

const numberSub = new Channel()
const letterSub = new Channel()

pubSub.sub('number', numberSub)
pubSub.sub('letter', letterSub)

;(async () => {
  while (true) {
    const data = await numberSub.take()
    console.log(`Number: ${data}`)
  }
})()

;(async () => {
  while (true) {
    const data = await letterSub.take()
    console.log(`Letter: ${data}`)
  }
})()

pubSub.pub('number', 1)
pubSub.pub('letter', 'A')
pubSub.pub('number', 2)
pubSub.pub('letter', 'B')
// Output:
// Number: 1
// Letter: A
// Number: 2
// Letter: B
```

### throttle(tasks, buffer)

Executes an array of async tasks with a concurrency limit. Returns a promise that resolves with an array of all results in order.

**Signature:** `throttle(tasks: Function[], buffer: Number) => Promise<Object[]>`

- `tasks` — Array of parameterless functions, each returning a Promise.
- `buffer` — Maximum number of concurrent tasks. Must be a number >= 1.
- If a task throws, its result is `{ error: <Error> }` instead of propagating the failure.

```js
import { throttle, delay } from 'core-async'

const tasks = Array.from({ length: 100 }, (_, i) =>
  () => delay(Math.random() * 1000).then(() => `Task ${i} done`)
)

// Execute max 10 tasks at a time
throttle(tasks, 10).then(results => {
  console.log(results) // ['Task 0 done', 'Task 1 done', ..., 'Task 99 done']
})
```
