# API Reference

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
  - [subscribe(channel, subscribers)](#subscribechannel-subscribers)
  - [PubSub](#pubsub)
    - [pubSub.pub(topics, value)](#pubsubpubtopics-value)
    - [pubSub.sub(topics, subscriber)](#pubsubsubtopics-subscriber)
    - [pubSub.unsub(topics, subscriber)](#pubsubunsubtopics-subscriber)
  - [throttle(tasks, buffer)](#throttletasks-buffer)
- [co](#co)

## Channel

The `Channel` is the core primitive in core-async. It provides a communication mechanism between concurrent processes (generator functions running inside `co`). A process can **put** data onto a channel and another process can **take** data off it. When no matching counterpart is ready, the operation blocks (yields) until one becomes available.

### Constructor Signatures

```js
const { Channel } = require('core-async')

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
const { co, Channel } = require('core-async')

const bufferedChan = new Channel(2)
const unbufferedChan = new Channel()

co(function *() {
  yield bufferedChan.put(1) // Completes immediately (buffer slot 1)
  yield bufferedChan.put(2) // Completes immediately (buffer slot 2)
  yield bufferedChan.put(3) // Blocks until a take frees a slot
})

co(function *() {
  yield unbufferedChan.put(1) // Blocks until a taker is ready
})
```

### Dropping and Sliding Modes

Both modes require a buffer size >= 1.

**Dropping mode** (`mode: 'dropping'`): When the buffer is full, new puts are silently dropped. The `put` resolves immediately with `null` instead of blocking.

**Sliding mode** (`mode: 'sliding'`): When the buffer is full, the **oldest** buffered value is discarded to make room for the new one. The `put` resolves immediately with `true`.

```js
const { co, Channel } = require('core-async')

const droppingChan = new Channel(1, { mode: 'dropping' })
const slidingChan = new Channel(1, { mode: 'sliding' })

// Dropping: 'baby' and 'world!' are dropped because the buffer is full
co(function *() {
  const p1 = yield droppingChan.put('hello')  // true  (fills buffer)
  const p2 = yield droppingChan.put('baby')   // null  (dropped)
  const p3 = yield droppingChan.put('world!') // null  (dropped)
})

// Only 'hello' can be taken
co(function *() {
  const val = yield droppingChan.take() // 'hello'
})

// Sliding: each new put evicts the oldest
co(function *() {
  const p1 = yield slidingChan.put('hello')  // true (fills buffer)
  const p2 = yield slidingChan.put('baby')   // true (evicts 'hello')
  const p3 = yield slidingChan.put('world!') // true (evicts 'baby')
})

// Only 'world!' (the most recent) can be taken
co(function *() {
  const val = yield slidingChan.take() // 'world!'
})
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
co(function *() {
  const status = yield chan.put('hello')

  // With timeout — throws if not consumed within 5000ms
  try {
    yield chan.put('hello', { timeout: 5000 })
  } catch (err) {
    console.log(err.message) // "'put' timed out after 5000 ms. No data was added to the channel."
    console.log(err.code)    // 408
  }
})
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
co(function *() {
  const value = yield chan.take()

  // With timeout — throws if nothing available within 3000ms
  try {
    const value = yield chan.take({ timeout: 3000 })
  } catch (err) {
    console.log(err.message) // "'take' timed out after 3000 ms. No data was taken off the channel."
    console.log(err.code)    // 408
  }
})
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

You can also close a channel by putting `null`: `yield chan.put(null)`.

```js
const chan = new Channel()

chan.close()

co(function *() {
  const putResult = yield chan.put('hello') // null (channel closed)
  const takeResult = yield chan.take()      // null (channel closed)
})
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
const { transducer: { filter, map, reduce, compose } } = require('core-async')
```

### filter(predicate)

Creates a transducer that only allows values matching the predicate through the channel.

**Signature:** `filter(predicate: (value, index) => Boolean) => Transducer`

- When the predicate returns `true`, the value passes through.
- When the predicate returns `false`, the value is rejected and `put` resolves with `false`.
- The predicate can return a `Promise<Boolean>`.

```js
const { co, Channel, transducer: { filter } } = require('core-async')

const chan = new Channel(filter(x => x > 1))

co(function *() {
  const s1 = yield chan.put(1) // false (filtered out)
  const s2 = yield chan.put(2) // true  (accepted)
  const s3 = yield chan.put(3) // true  (accepted)
})

co(function *() {
  const a = yield chan.take() // 2
  const b = yield chan.take() // 3
})
```

### map(transform)

Creates a transducer that transforms each value before it enters the channel.

**Signature:** `map(transform: (value, index) => Object) => Transducer`

- The transform function can return a `Promise`.

```js
const { co, Channel, transducer: { map } } = require('core-async')

const chan = new Channel(map(x => x * 10))

co(function *() {
  yield chan.put(1)
  yield chan.put(2)
})

co(function *() {
  const a = yield chan.take() // 10
  const b = yield chan.take() // 20
})
```

### reduce(reduceFn, accumulator)

Creates a transducer that accumulates values using a reducer function. Each put receives the accumulated result rather than the raw input.

**Signature:** `reduce(reduceFn: (accumulator, value, index) => Object, initialAccumulator) => Transducer`

- The reduce function can return a `Promise`.

```js
const { co, Channel, transducer: { reduce } } = require('core-async')

const chan = new Channel(reduce((acc, x, idx) => ({ total: acc.total + x, idx }), { total: 0 }))

co(function *() {
  yield chan.put(1)
  yield chan.put(2)
  yield chan.put(3)
})

co(function *() {
  const a = yield chan.take() // { total: 1, idx: 0 }
  const b = yield chan.take() // { total: 3, idx: 1 }
  const c = yield chan.take() // { total: 6, idx: 2 }
})
```

### compose(...transducers)

Composes multiple transducers into a single transducer. Transducers execute left-to-right. If any transducer in the chain rejects a value (e.g., a `filter`), the remaining transducers are skipped and `put` resolves with `false`.

**Signature:** `compose(...transducers: Transducer[]) => Transducer`

```js
const { co, Channel, transducer: { compose, filter, map } } = require('core-async')

const chan = new Channel(compose(
  filter(x => x > 1),   // Only values > 1
  map(x => x + 10),     // Add 10
  filter(x => x < 13)   // Only values < 13
))

co(function *() {
  yield chan.put(1) // Rejected by first filter
  yield chan.put(2) // Passes: 2 -> 12 -> accepted (12 < 13)
  yield chan.put(3) // Rejected by last filter: 3 -> 13 -> rejected (13 not < 13)
})

co(function *() {
  const a = yield chan.take() // 12
})
```

## Utilities

Utilities are accessed via `require('core-async').utils`:

```js
const { utils: { PubSub, subscribe, merge, throttle, timeout, alts } } = require('core-async')
```

### alts(channels)

Waits for the first value to become available on any of the given channels, then takes it. Returns a two-element array `[value, channel]` identifying which channel produced the value.

**Signature:** `alts(channels: Channel[]) => Promise<[Object, Channel]>`

When multiple channels have values ready simultaneously, `alts` takes from the one whose value was put first (by sequence number).

```js
const { co, Channel, utils: { alts } } = require('core-async')

const chan1 = new Channel()
const chan2 = new Channel()

co(function *() {
  const [value, winnerChan] = yield alts([chan1, chan2])

  if (winnerChan === chan1)
    console.log(`chan1 won with: ${value}`)
  else
    console.log(`chan2 won with: ${value}`)
})

chan1.put('hello')
chan2.put('world')
// Output: "chan1 won with: hello" (chan1's put was first)
```

A common pattern is combining `alts` with [`timeout`](#timeouttime) to implement time-bounded operations. See [gotchas — Timeout and alts pattern](./gotchas.md#timeout-and-alts-pattern).

### merge(channels)

Merges multiple channels into a single output channel. Values from all input channels are forwarded to the output channel as they arrive. When an input channel is closed, it stops contributing but the output channel remains open.

**Signature:** `merge(channels: Channel[]) => Channel`

```js
const { co, Channel, utils: { merge } } = require('core-async')

const chan1 = new Channel()
const chan2 = new Channel()

const merged = merge([chan1, chan2])

chan1.put(1)
chan2.put('one')
chan1.put(2)
chan2.put('two')

co(function *() {
  console.log(yield merged.take()) // 1
  console.log(yield merged.take()) // 'one'
  console.log(yield merged.take()) // 2
  console.log(yield merged.take()) // 'two'
})
```

### timeout(time)

Creates an unbuffered channel that receives the string `'timeout'` after the specified delay. The channel's `onClosing` callback cancels the timer if the channel is closed before the timeout fires.

**Signature:** `timeout(time: Number | [Number, Number]) => Channel`

- If `time` is a number, the timeout fires after that many milliseconds.
- If `time` is a two-element array `[min, max]`, the timeout fires after a random duration between `min` and `max` milliseconds.

```js
const { co, utils: { timeout } } = require('core-async')

co(function *() {
  const t = timeout(5000)
  console.log('Waiting 5 seconds...')
  yield t.take()
  console.log('Done!')
})
```

### subscribe(channel, subscribers)

Routes values from a source channel to subscriber channels based on rules. Each subscriber is an object with a `chan` (Channel) and a `rule` (predicate function). When a value is taken from the source, it is put onto every subscriber whose `rule` returns `true` for that value.

Closing the source channel (by putting `null`) stops the subscription loop.

**Signature:** `subscribe(channel: Channel, subscribers: Object | Object[]) => void`

**Subscriber object:** `{ chan: Channel, rule: (data) => Boolean }`

```js
const { co, Channel, utils: { subscribe } } = require('core-async')

const source = new Channel()
const numbers = new Channel()
const strings = new Channel()

subscribe(source, [
  { chan: numbers, rule: data => typeof data === 'number' },
  { chan: strings, rule: data => typeof data === 'string' }
])

co(function *() {
  while (true) {
    const n = yield numbers.take()
    console.log(`Number: ${n}`)
  }
})

co(function *() {
  while (true) {
    const s = yield strings.take()
    console.log(`String: ${s}`)
  }
})

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
const { Channel, utils: { PubSub } } = require('core-async')

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

**Full PubSub example:**

```js
const { co, Channel, utils: { PubSub } } = require('core-async')

const pubSub = new PubSub()

const numberSub = new Channel()
const letterSub = new Channel()

pubSub.sub('number', numberSub)
pubSub.sub('letter', letterSub)

co(function *() {
  while (true) {
    const data = yield numberSub.take()
    console.log(`Number: ${data}`)
  }
})

co(function *() {
  while (true) {
    const data = yield letterSub.take()
    console.log(`Letter: ${data}`)
  }
})

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
const { utils: { throttle } } = require('core-async')

const delay = t => new Promise(resolve => setTimeout(resolve, t))

const tasks = Array.from({ length: 100 }, (_, i) =>
  () => delay(Math.random() * 1000).then(() => `Task ${i} done`)
)

// Execute max 10 tasks at a time
throttle(tasks, 10).then(results => {
  console.log(results) // ['Task 0 done', 'Task 1 done', ..., 'Task 99 done']
})
```

## co

The `co` library is re-exported from core-async for convenience. It turns generator functions into asynchronous routines, where `yield` pauses execution until the yielded promise resolves.

```js
const { co } = require('core-async')

co(function *() {
  const result = yield somePromise()
  console.log(result)
})
```

`co` is essential for using `put` and `take` in a blocking style. Without `co`, you must use the promise-based API directly.

See the [co npm package](https://www.npmjs.com/package/co) for full documentation.
