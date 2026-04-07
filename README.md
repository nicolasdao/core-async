# Core Async JS

[![NPM](https://img.shields.io/npm/v/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

A JavaScript implementation of CSP (Communicating Sequential Processes) inspired by Clojure's core.async. Uses Channels to synchronize concurrent processes, with composable transducers for stream data transformation. Designed to be used with the `co` generator library (shipped with this package).

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Basic Usage](#basic-usage)
- [Quick Example](#quick-example)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Common Patterns](#common-patterns)
  - [Dealing With Timeout](#dealing-with-timeout)
  - [Chat Between Two Agents](#chat-between-two-agents)
  - [Monitoring Stock Prices](#monitoring-stock-prices)
- [Testing](#testing)
- [License](#license)

## Overview

Core Async JS brings CSP concurrency patterns to JavaScript. Instead of callback hell or deeply nested promise chains, you write sequential-looking code using generator functions and channels:

- **Channels** are the communication primitive. One process puts data onto a channel, another takes data off it. When no counterpart is ready, the operation blocks.
- **Transducers** let you attach composable data transformations (filter, map, reduce) directly to channels.
- **Utilities** provide higher-level patterns: pub/sub, channel merging, throttling, timeouts, and racing (`alts`).

The library is lightweight (single dependency on `co`) and works in Node.js.

## Getting Started

### Prerequisites

- Node.js

### Installation

```
npm i core-async
```

### Basic Usage

```js
const { co, Channel } = require('core-async')

const chan = new Channel()

// Producer: puts values onto the channel
co(function *() {
  yield chan.put('hello')
  yield chan.put('world')
  yield chan.put(null) // closes the channel
})

// Consumer: takes values from the channel
co(function *() {
  let value = yield chan.take()
  while (value !== null) {
    console.log(value)
    value = yield chan.take()
  }
  console.log('Channel closed')
})
// Output:
// hello
// world
// Channel closed
```

## Quick Example

Two concurrent processes communicating through channels. Process 1 generates random numbers and Process 2 filters for matches:

```js
const { co, Channel } = require('core-async')

const inChan = new Channel()
const outChan = new Channel()

// Process 1: generates random numbers, checks for results
co(function *() {
  while (true) {
    yield inChan.put(Math.random())
    const msg = outChan.stake()
    if (msg)
      console.log(msg)
  }
})

// Process 2: filters for values in a narrow range
co(function *() {
  while (true) {
    const val = yield inChan.take()
    if (val >= 0.250 && val <= 0.252)
      yield outChan.put(`Winner: ${val}`)
  }
})

console.log('Program has started.')
```

## Project Structure

```
core-async/
  src/
    index.js          # Main entry point — re-exports all modules
    channel.js        # Channel constructor (buffered, unbuffered, sliding, dropping)
    fn.js             # Core put/take/sput/stake functions
    transducer.js     # Composable transducers (compose, map, filter, reduce)
    tools.js          # Utilities (PubSub, subscribe, merge, throttle, timeout, alts)
    utils/
      index.js        # Internal helpers (sortBy)
      promise.js      # delay utility
      error.js        # Argument validation helpers
  test/
    channel.js        # Channel tests
    tools.js          # Utility tests (PubSub, subscribe, throttle, alts, merge, timeout)
    transducer.js     # Transducer tests (map, filter, reduce, compose)
```

## Documentation

- **[API Reference](./docs/api.md)** — Complete reference for all exported functions: Channel (constructor, put, take, sput, stake, close), transducers (filter, map, reduce, compose), and utilities (alts, merge, timeout, subscribe, PubSub, throttle, co).
- **[Gotchas](./docs/gotchas.md)** — Non-obvious behavior and pitfalls: putting null closes the channel, sput/stake semantics, sliding vs dropping modes, event loop implications, timeout patterns, and more.

## Common Patterns

### Dealing With Timeout

Combine `alts` with `timeout` to create time-bounded operations:

```js
const { co, Channel, utils: { alts, timeout } } = require('core-async')

const numberChan = new Channel()

// Producer: keeps adding numbers forever
co(function *() {
  let counter = 0
  while (true)
    yield numberChan.put(++counter)
})

// Consumer: stops after 3 seconds
co(function *() {
  const t = timeout(3000)
  let carryOn = true
  while (carryOn) {
    const [v, chan] = yield alts([numberChan, t])
    carryOn = chan !== t
    if (carryOn) console.log(`Number: ${v}`)
  }
  console.log('Done.')
})
```

### Chat Between Two Agents

Two lightweight threads communicating through a shared channel:

```js
const { co, Channel } = require('core-async')

const chat = new Channel()

// Thread 1
co(function *() {
  yield chat.put('Hello')
  const reply1 = yield chat.take()
  console.log(`T2 says: ${reply1}`)
  yield chat.put('Going to the beach. Want to come?')
  const reply2 = yield chat.take()
  console.log(`T2 says: ${reply2}`)
  yield chat.put('See you there!')
})

// Thread 2
co(function *() {
  const msg1 = yield chat.take()
  console.log(`T1 says: ${msg1}`)
  yield chat.put("Hi! What's up?")
  const msg2 = yield chat.take()
  console.log(`T1 says: ${msg2}`)
  yield chat.put("Sounds great. I'll be there.")
  const msg3 = yield chat.take()
  console.log(`T1 says: ${msg3}`)
  chat.close()
})
```

### Monitoring Stock Prices

Use channels to separate price-checking from alert logic:

```js
const { co, Channel } = require('core-async')

const delay = t => new Promise(resolve => setTimeout(resolve, t))
const getStockPrice = ticker => Promise.resolve({ ticker, price: 100 + Math.random() * 10 })

const STOCKS = ['FB', 'AAPL', 'AMZN', 'NFLX', 'GOOGL']

STOCKS.forEach(ticker => {
  const chan = new Channel()

  // Price checker
  co(function *() {
    while (true) {
      const { price } = yield getStockPrice(ticker)
      chan.put({ price, date: Date.now() })
      yield delay(60000) // Check every minute
    }
  })

  // Alert logic
  co(function *() {
    let history = []
    while (true) {
      const snapshot = yield chan.take()
      history.push(snapshot)
      if (history.length === 60) {
        const change = (history[59].price - history[0].price) / history[0].price
        if (Math.abs(change) >= 0.05)
          console.log(`${ticker} moved ${(change * 100).toFixed(1)}% in the last hour`)
        history.splice(0, 1)
      }
    }
  })
})
```

## Testing

```
npm test
```

Runs the Mocha test suite covering channels, transducers, and utility functions.

## License

BSD-3-Clause. Copyright (c) 2017-2019, Neap Pty Ltd.
