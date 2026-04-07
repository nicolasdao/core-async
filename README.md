# Core Async JS

[![NPM](https://img.shields.io/npm/v/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

A standalone, zero-dependency CSP (Communicating Sequential Processes) library for JavaScript. Coordinate concurrent async workflows through **channels** instead of tangled callbacks, event emitters, or complex promise chains. Works with native `async/await`. Ships as both **ESM** and **CommonJS**.

## Table of Contents

- [Why CSP?](#why-csp)
  - [What Is CSP?](#what-is-csp)
  - [When to Use It](#when-to-use-it)
  - [When Not to Use It](#when-not-to-use-it)
- [Before and After](#before-and-after)
  - [Concurrency Limiting](#concurrency-limiting)
  - [Producer-Consumer Pipeline](#producer-consumer-pipeline)
  - [Racing Multiple Sources With a Deadline](#racing-multiple-sources-with-a-deadline)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [ESM (Recommended)](#esm-recommended)
  - [CommonJS](#commonjs)
  - [TypeScript](#typescript)
- [Core Concepts](#core-concepts)
  - [Channels](#channels)
  - [Buffered Channels](#buffered-channels)
  - [Transducers](#transducers)
- [Real-World Patterns](#real-world-patterns)
  - [Time-Bounded Operations](#time-bounded-operations)
  - [Fan-In From Multiple Sources](#fan-in-from-multiple-sources)
  - [Topic-Based Pub/Sub](#topic-based-pubsub)
  - [Concurrent Task Throttling](#concurrent-task-throttling)
- [Documentation](#documentation)
- [Migrating from v2 to v3](#migrating-from-v2-to-v3)
- [Testing](#testing)
- [Releasing](#releasing)
- [License](#license)

## Why CSP?

### What Is CSP?

CSP is a concurrency model where independent processes communicate by passing messages through **channels** — typed pipes with blocking semantics. Instead of sharing mutable state or orchestrating callbacks, each process simply puts data on a channel and takes data off it. When no counterpart is ready, the operation waits.

This gives you:

- **Sequential-looking code** for concurrent workflows — no callback pyramids, no `.then()` chains
- **Backpressure for free** — a fast producer automatically slows down when the consumer can't keep up
- **Decoupled components** — producers and consumers know nothing about each other, only the channel between them
- **Deterministic coordination** — unlike event emitters, channels guarantee delivery order and provide clear shutdown semantics

### When to Use It

- **Producer/consumer pipelines** — one part of your system generates data, another processes it, at different speeds
- **Coordinating concurrent workflows** — multiple async operations that need to synchronize (e.g., a worker pool, rate-limited API calls)
- **Multiplexing** — racing multiple data sources and reacting to whichever responds first (e.g., data + timeout)
- **Streaming transformations** — applying filter/map/reduce to an ongoing data flow, not just a static array
- **Decoupled communication** — when you want pub/sub or routing without coupling components to each other

### When Not to Use It

- **Simple one-shot async** — if `await fetch(url)` does the job, you don't need a channel
- **Static data transformations** — if you're mapping an in-memory array, use `Array.map()`, not a channel
- **Event-driven UI** — DOM events with `addEventListener` are fine; channels add overhead without clear benefit
- **Single request/response** — a straightforward API call doesn't need CSP coordination

## Before and After

### Concurrency Limiting

Run 100 API calls, max 5 at a time.

**Without core-async** (manual tracking):

```js
async function throttle(tasks, limit) {
  const results = []
  const executing = new Set()
  for (const [i, task] of tasks.entries()) {
    const p = task().then(r => { executing.delete(p); return r })
    executing.add(p)
    results[i] = p
    if (executing.size >= limit) await Promise.race(executing)
  }
  return Promise.all(results)
}
```

**With core-async** (one line):

```js
import { throttle } from 'core-async'

const results = await throttle(tasks, 5)
```

### Producer-Consumer Pipeline

A producer generates data; a consumer processes it. The producer must wait when the consumer falls behind.

**Without core-async** (manual backpressure):

```js
let resolve
let promise = new Promise(r => resolve = r)

async function produce() {
  for (const item of items) {
    // Block until consumer signals readiness
    await promise
    currentItem = item
    promise = new Promise(r => resolve = r)
  }
}

async function consume() {
  while (true) {
    resolve() // Signal readiness
    await new Promise(r => setTimeout(r, 0))
    process(currentItem)
  }
}
```

**With core-async** (clear intent):

```js
import { Channel } from 'core-async'

const chan = new Channel()

// Producer — blocks automatically when consumer isn't ready
async function produce() {
  for (const item of items) {
    await chan.put(item)
  }
  await chan.put(null) // Signal done
}

// Consumer — blocks automatically when no data available
async function consume() {
  let item = await chan.take()
  while (item !== null) {
    process(item)
    item = await chan.take()
  }
}
```

### Racing Multiple Sources With a Deadline

Wait for data from multiple sources, but give up after 3 seconds.

**Without core-async** (fragile state management):

```js
let done = false
const timer = setTimeout(() => { done = true; console.log('Timed out') }, 3000)

source1.on('data', d => { if (!done) { done = true; clearTimeout(timer); handle(d) } })
source2.on('data', d => { if (!done) { done = true; clearTimeout(timer); handle(d) } })
```

**With core-async** (declarative):

```js
import { Channel, alts, timeout } from 'core-async'

const [value, winner] = await alts([source1Chan, source2Chan, timeout(3000)])

if (winner === timeout) console.log('Timed out')
else handle(value)
```

## Getting Started

### Installation

```
npm i core-async
```

### ESM (Recommended)

```js
import { Channel, alts, timeout, filter, map, PubSub, throttle } from 'core-async'
```

All APIs are available as direct named exports. No nested namespaces needed.

### CommonJS

```js
const { Channel, utils: { alts, timeout }, transducer: { filter, map } } = require('core-async')
```

Both the flat named exports and the legacy nested namespaces (`utils`, `transducer`) work in CommonJS.

### TypeScript

Type definitions are included. No `@types` package needed.

```ts
import { Channel, alts, type PutOptions, type TakeOptions } from 'core-async'

const chan = new Channel<string>()
```

## Core Concepts

### Channels

A channel is a communication pipe between two async processes. `put` sends a value; `take` receives it. Both block until a counterpart is ready.

```js
import { Channel } from 'core-async'

const chan = new Channel()

// Process A
;(async () => {
  await chan.put('hello')   // Blocks until Process B takes
  await chan.put('world')
  await chan.put(null)      // Close the channel
})()

// Process B
;(async () => {
  console.log(await chan.take()) // 'hello'
  console.log(await chan.take()) // 'world'
  console.log(await chan.take()) // null — channel closed
})()
```

For non-blocking operations, use `sput` (synchronous put) and `stake` (synchronous take) — they return immediately without waiting.

### Buffered Channels

By default, channels are unbuffered — every `put` blocks until a `take` is ready. A buffered channel allows N puts to complete without a waiting taker.

```js
const chan = new Channel(3) // Buffer size 3

await chan.put(1) // Completes immediately (buffered)
await chan.put(2) // Completes immediately (buffered)
await chan.put(3) // Completes immediately (buffered)
await chan.put(4) // Blocks — buffer is full, waits for a take
```

Special modes for when the buffer is full:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `'default'` | `put` blocks until space opens | Backpressure |
| `'dropping'` | New values silently dropped | Rate limiting — keep oldest |
| `'sliding'` | Oldest value evicted | Real-time — keep latest |

```js
const latest = new Channel(1, { mode: 'sliding' })  // Always holds the most recent value
const capped = new Channel(100, { mode: 'dropping' }) // Accept up to 100, drop overflow
```

### Transducers

Attach composable transformations directly to a channel. Values pass through the transducer pipeline before reaching the consumer.

```js
import { Channel, compose, filter, map } from 'core-async'

const chan = new Channel(compose(
  filter(x => x > 0),        // Only positive numbers
  map(x => x * 100)          // Scale up
))

await chan.put(-5)  // Rejected by filter → returns false
await chan.put(3)   // Passes → consumer receives 300
```

## Real-World Patterns

### Time-Bounded Operations

Race a data channel against a deadline:

```js
import { Channel, alts, timeout } from 'core-async'

const dataChan = new Channel()

;(async () => {
  const deadline = timeout(3000)
  let active = true

  while (active) {
    const [value, chan] = await alts([dataChan, deadline])
    if (chan === deadline) {
      console.log('Deadline reached')
      active = false
    } else {
      console.log(`Received: ${value}`)
    }
  }
})()
```

### Fan-In From Multiple Sources

Merge multiple channels into one stream:

```js
import { Channel, merge } from 'core-async'

const sensorA = new Channel()
const sensorB = new Channel()

const allReadings = merge([sensorA, sensorB])

;(async () => {
  while (true) {
    const reading = await allReadings.take()
    console.log('Reading:', reading)
  }
})()
```

### Topic-Based Pub/Sub

Decouple publishers and subscribers with named topics:

```js
import { Channel, PubSub } from 'core-async'

const bus = new PubSub()

const errors = new Channel()
const metrics = new Channel()

bus.sub('error', errors)
bus.sub('metric', metrics)

// Anywhere in your app
bus.pub('error', { code: 500, msg: 'Internal error' })
bus.pub('metric', { latency: 42 })

// Clean up when done
bus.close()
```

### Concurrent Task Throttling

Execute async tasks with a concurrency limit, collecting all results:

```js
import { throttle } from 'core-async'

const urls = ['https://api.example.com/1', /* ... 100 more ... */]
const tasks = urls.map(url => () => fetch(url).then(r => r.json()))

// Max 10 concurrent requests. Failed tasks return { error } instead of crashing.
const results = await throttle(tasks, 10)
```

## Documentation

- **[API Reference](./docs/api.md)** — Complete reference for all exported functions: Channel (constructor, put, take, sput, stake, close), transducers (filter, map, reduce, compose), and utilities (alts, merge, timeout, delay, subscribe, PubSub, throttle). Includes all constructor overloads, return values, options, and code examples.
- **[Gotchas](./docs/gotchas.md)** — Non-obvious behavior and pitfalls: putting null closes the channel, sput/stake semantics, sliding vs dropping modes, event loop implications, timeout patterns, and more.

## Migrating from v2 to v3

### Breaking Changes

1. **`co` is no longer bundled.** Use native `async/await` instead. If you need `co`, install it separately.
2. **ESM is the primary format.** CommonJS still works via `require('core-async')`.
3. **`PubSub` now has a `close()` method.** Call it to prevent memory leaks.
4. **Node.js >= 16 required.**

### Migration Example

**v2:**
```js
const { co, Channel } = require('core-async')

co(function *() {
  yield chan.put('hello')
  const val = yield chan.take()
})
```

**v3:**
```js
import { Channel } from 'core-async'

;(async () => {
  await chan.put('hello')
  const val = await chan.take()
})()
```

The nested namespace destructuring from v2 still works in CJS:

```js
const { Channel, utils: { alts, timeout }, transducer: { map } } = require('core-async')
```

## Testing

```
npm test
```

Builds ESM + CJS outputs, then runs 85 tests covering channels, transducers, utilities, bug fix regressions, edge cases, and ESM imports.

## Releasing

This project includes a `/release` skill for [Claude Code](https://claude.ai/claude-code) that automates the entire release workflow:

```
/release
```

When invoked, the skill:

1. Reviews all changes since the last release
2. Classifies them (breaking, feature, fix, perf) and determines the correct [semver](https://semver.org/) bump
3. Updates `CHANGELOG.md` with a structured entry
4. Bumps the version in `package.json`
5. Creates a release commit and git tag

After the skill completes, publish with:

```
git push --follow-tags origin master && npm publish
```

For a manual release without Claude Code, use [standard-version](https://github.com/conventional-changelog/standard-version):

```
npx standard-version --release-as <major|minor|patch>
```

## License

BSD-3-Clause. Copyright (c) 2017-2019, Neap Pty Ltd.
