# Core Async JS &middot;  [![NPM](https://img.shields.io/npm/v/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async) [![Tests](https://travis-ci.org/nicolasdao/core-async.svg?branch=master)](https://travis-ci.org/nicolasdao/core-async) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to) [![npm downloads](https://img.shields.io/npm/dt/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async)
__*CoreAsyncJS*__ is a JS library that implements the core aspects of the CSP (Communicating Sequential Processes) patterns. CoreAsyncJS uses _Channels_ to synchronise concurrent processes. It is inspired from the Clojure core.async library and designed to be used with the npm package 'co' (shipped with this package). It is also exposes [composable APIs called _transducers_](#composable-transducers) to help filter, map and, more generally speaking, reduce streams of data.

```js
const { co, Channel } = require('core-async')

// Example of two processes running concurrently. 

// Channels 'inChan' and 'outChan' are used to synchronise process 1 and process 2.
const inChan = new Channel()
const outChan = new Channel()

// Concurrent process 1. This process encapsulates logic that does not care 
// when or how the message put on 'inChan' is processed. It only knows that
// after it has been processed, it is available on 'outChan'.
// 
co(function *(){
	while (true) {
		yield inChan.put(Math.random())
		const msg = outChan.stake()
		if (msg)
			console.log(msg)
	}
})

// Concurrent process 2. This process encapsulates logic that does not care 
// when or how the message was put on the 'inChan'. It only knows that when 
// it is available, it has to process it and then potentially put it back on
// the 'outChan' channel. This process also does not care of what happens to
// that processed message after it has been put on the 'outChan' channel.
co(function *(){
	while (true) {
		const val = yield inChan.take()
		if (val >= 0.250 && val <= 0.252)
			yield outChan.put(`We've found a winner: ${val}`)
	}
})

console.log('Program has started.')
```

For more advanced examples, please refer to the [Examples](#examples) sections.


# Table of Contents

> * [Install](#install) 
> * [APIs](#apis) 
>	- [Channel](#channel)
>		- [Buffered vs Unbuffered Channels](#buffered-vs-unbuffered-channels)
>		- [Dropping and Sliding Channels](#dropping-and-sliding-channels)
>		- [put - take - sput - stake](#put---take---sput---stake)
>	- [Composable transducers](#composable-transducers)
>	- [utils](#utils)
>		- [alts](#alts)
>		- [merge](#merge)
>		- [timeout](#timeout)
>		- [subscribe](#subscribe)
>		- [throttle](#throttle)
> * [Common Patterns & Idiomatic Style](#common-patterns--idiomatic-style)
>	- [Dealing With Timeout](#dealing-with-timeout)
>	- [Why you should always close your channel when you're done with it](#why-you-should-always-close-your-channel-when-youre-done-with-it)
> * [Examples](#examples)
>	- [Chat between two agents](#chat-between-two-agents)
>	- [Monitoring Stock Prices](#monitoring-stock-prices)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)


# Install
```
npm i core-async
```

# APIs
## Channel
### Buffered vs Unbuffered Channels

```js
const { co, Channel } = require('core-async')

const bufferedChan = new Channel(2)
const unbufferedChan = new Channel()

co(function *(){
	yield bufferedChan.put(1) // Executes immediately
	console.log('1 has been added on the unbuffered channel.')
	yield bufferedChan.put(2) // Executes immediately
	console.log('2 has been added on the unbuffered channel.')
	yield bufferedChan.put(3) // Blocked until bufferedChan.take() is called.
	console.log('3 has been added on the unbuffered channel.')
})

co(function *(){
	yield unbufferedChan.put(1) // Blocked until bufferedChan.take() is called.
	console.log('1 has been added on the buffered channel.')
})
```

### Dropping and Sliding Channels

```js
const { Channel } = require('core-async')

const droppingChan = new Channel(2, { mode: 'dropping' })
const slidingChan = new Channel(2, { mode: 'sliding' })

// ...
```

More detailed doc coming soon... 

### put - take - sput - stake

Example:

```js
const co = require('co')
const { Channel } = require('core-async')

const chan = new Channel()

co(function *() {
	yield chan.put(1)
	console.log('PUT 1 DONE')

	const sputSucceeded = chan.sput(2)
	console.log(`SPUT 2 SUCCESSED? ${sputSucceeded}`)
})

co(function *() {
	const val = yield chan.take()
	console.log(`TAKE VALUE: ${val}`)

	const stakeSucceeded = chan.stake()
	console.log(`STAKE SUCCESSED? ${stakeSucceeded}`)
})
```

#### Channel.put(<Object> brick): <Promise<Boolean>>

Takes any object and yield a promise that returns a boolean. That boolean indicates whether or not the brick was successfully taken by another process. The most common case where this api yields false occurs when the channel uses a transducer that filtered the brick out. Example:

```js
const chan = new Channel(filter(x < 10))

co(function *(){
	const status = yield chan.put(1)
	if (!status)
		console.log('1 does not match the criteria to be added in this channel.')
	else
		console.log('1 has been taken from this channel.')
})
```

#### Channel.take(): <Promise<Object>>

Doc coming soon...

#### Channel.sput(<Object> brick): Boolean

Doc coming soon...

#### Channel.stake(): Object

Doc coming soon...

## Composable transducers

A Transducer is a fancy name for a function that can transform data. Why not call this a transformer then? Well, this is indeed a transformer, but it has an extra key property thanks to the way it is implemented: Composition. You can compose multiple transducers together to make a new one, which really helps with code reusability and better encapsulation and separation of concerns. Under the hood, this is achieved by leveraging reducers, hence the name transducer (transform, reduce, tadaaa). The following two examples should help make those concepts clearer:

_Creating a channel that only accepts numbers strictly greater than one:_

```js
const { co, Channel, transducer: { filter } } = require('./src')

// Channel that only accepts numbers strictly greater than one. 
const chan = new Channel(filter(x => x > 1))

// Process 1 - Adds three numbers on the channel.
co(function *() {
	let status = yield chan.put(1)
	if (!status) console.log('1 was not put on the channel.')
	status = yield chan.put(2)
	if (!status) console.log('2 was not put on the channel.')
	status = yield chan.put(3)
	if (!status) console.log('3 was not put on the channel.')
})

// Process 2 - Display the outputs from 'chan'
co(function *(){
	while(true) {
		const val = yield chan.take()
		console.log(`${val} was taken from the channel.`)
	}
})
```

_Creating a channel that:_
- _Only accepts numbers between this interval: [0.25000, 0.25002]_
- _Multiply the filtered numbers by 100,000._
- _Accumulate the numbers in an object._

```js
const { co, Channel, transducer: { compose, filter, map, reduce } } = require('./src')

// Composed transducer
const doSomething = compose(
	filter(x => x >= 0.25000 && x <= 0.25002), // Filter transducer
	map(x => x*100000), // Map transducer
	reduce((acc,x,idx) => ({ total:acc.total+x, idx }), { total:0 }) // Reduce transducer
)

// Channel that accepts data based on the 'doSomething' transducer. 
const chan = new Channel(doSomething)

// Process 1 - Adds random numbers (between 0 and 1) to chan. 
// If the number is rejected by the rules defined in 'doSomething',
// a message is displayed to the console: 'Attempt 28143 invalid: 0.4839460780147258'
co(function *() {
	let i = 0
	while(true) {
		const v = Math.random()
		const status = yield chan.put(v)
		if (status)
			i = 0
		else {
			i++
			process.stdout.clearLine()
			process.stdout.cursorTo(0)
			process.stdout.write(`Attempt ${i} invalid: ${v}`)
		}
	}
})

// Process 2 - Display the outputs from 'chan'
co(function *(){
	while(true) {
		const { total, idx } = yield chan.take()
		console.log(`\n${idx}: ${total}`)
	}
})
```

### filter(<Func<Object,Int,Boolean>> predicate): <Func<Object,Object>> output

`predicate` is a high-order binary operators function that returns a boolean. The first operator is the input object. The second operator is the object index in the stream. This `output` function returns one the following:
- If the _predicate_ returns true, the `output` function returns the original input object.
- If the _predicate_ returns false, the `output` function returns a specific NOMATCHKEY string(1) signaling that the input should not be added to the channel. 

> (1) NOMATCHKEY: `no_match_7WmYhpJF33VG3X2dEqCQSwauKRb4zrPIRCh19zDF`

### map(<Func<Object,Int,Object>> transform): <Func<Object,Object>>

Doc coming soon...

### reduce(<Func<Object,Object,Int,Object>> reduceFn): <Func<Object,Object>>

Doc coming soon...

### compose(<Func<Object,Object>> transducer1 [,<Func<Object,Object>> transducer2, ...]): <Func<Object,Object>>

Doc coming soon...

## Utils
### alts


```js
const co = require('co')
const { Channel, fn: { alts } } = require('core-async')

const chan1 = new Channel()
const chan2 = new Channel()

co(function *() {
	const [v,chan] = yield alts([chan1, chan2])

	if (chan == chan1)
		console.log(`CHAN 1 WON WITH VALUE: ${v}`)
	else
		console.log(`CHAN 2 WON WITH VALUE: ${v}`)
})

chan1.put('hello')
chan2.put('world')
```

More detailed doc coming soon...

## merge

```js
const co = require('co')
const { Channel, fn: { merge } } = require('core-async')

const chan1 = new Channel()
const chan2 = new Channel()

co(function *() {
	const mergedChan = yield merge([chan1, chan2])

	while(true) {
		const v = yield mergedChan.take()
		console.log(v)
	}
})

chan1.put(1)
chan1.put(2)
chan1.put(3)
chan2.put('Hello')
chan2.put('world!')
chan2.put('This rocks!')
```

More detailed doc coming soon...

### timeout

`timeout` returns an empty buffer channel that puts a brick onto it after a predetermined amount of milliseconds. This designs to deal with timeouts in a very idiomatic way as demontrated in the [Dealing With Timeout](#dealing-with-timeout) section.

```js
const co = require('co')
const { utils: { timeout } } = require('core-async')

co(function *() {
	const t = timeout(5000)
	console.log('Start waiting for 5 seconds...')

	yield t.take()

	console.log('Done waiting!')
})
```

## subscribe

```js
const co = require('co')
const { Channel, utils: { subscribe } } = require('core-async')

const source = new Channel()

const numberSusbcriber = new Channel()
const wordSusbcriber = new Channel()

subscribe(source,[{
	chan: numberSusbcriber,
	rule: data => typeof(data) == 'number'
}, {
	chan: wordSusbcriber,
	rule: data => typeof(data) == 'string'
}])

co(function *(){
	while(true) {
		const data = yield numberSusbcriber.take()
		console.log(`NUMBER RECEIVED: ${data}`)
	}
})

co(function *(){
	while(true) {
		const data = yield wordSusbcriber.take()
		console.log(`WORD RECEIVED: ${data}`)
	}
})

const a = [1,'one',2,'two',3,'three']
a.map(data => source.put(data))
```

More detailed doc coming soon...

## throttle


```js
const co = require('co')
const { utils: { throttle } } = require('core-async')

const delay = t => new Promise(resolve => setTimeout(resolve, t))
const seed = (size=0) => Array.apply(null, Array(size))

// Array of parameterless functions
const lotsOfConcurrentTasks = seed(1000).map((_,i) => (() => delay(Math.round(Math.random()*10000)).then(() => `TASK ${i} DONE`)))

co(function *(){
	// This executes maximum 20 tasks at a time
	const results = yield throttle(lotsOfConcurrentTasks, 20)
	console.log(results)
	// => ['TASK 0 DONE', 'TASK 1 DONE', 'TASK 2 DONE', ..., 'TASK 999 DONE']
})
```

More detailed doc coming soon...


# Common Patterns & Idiomatic Style
## Dealing With Timeout

With channels, the combination of the `alts` and `timeout` functions makes dealing with timeouts straightforward:

```js
const co = require('co')
const { Channel, alts, timeout } = require('core-async')

const numberChan = new Channel()

// 1. Keeps adding number forever
co(function *(){
	let counter = 0
	while(true)
		yield numberChan.put(++counter)
})

// 2. Exit the process after 3 seconds.
co(function *() {
	const t = timeout(3000)
	let carryOn = true
	while(carryOn) {
		const [v,chan] = yield alts([numberChan,t])
		// Checks which channel has returned. If this is the 'timeout' channel, then stop.
		carryOn = chan != t
		if (carryOn) console.log(`Number: ${v}`) 
	}
	console.log(`We're done here.`)
})
```

## Why you should always close your channel when you're done with it

In NodeJS, channels are just a nice pattern to syncronize the event loop so you can write code that leverages complex concurency models. When a channel is created, streaming bricks to it or requesting bricks from it result in adding new tasks on the event loop. There are scenarios where it is desirable that the event loop flushes those tasks, and that's why the `close()` api exists. One such example is properly ending the execution of an AWS Lambda. In theory, an AWS Lambda stops its execution when its callback function is called. However, that's not exactly true. If there are still pending tasks in its event loop, the AWS Lambda will stay idle, potentially consuming bilaable resources for doing nothing. 

# Examples
## Chat between two agents

The following demoes 2 lightweight threads thanks to the __*co*__ library. The communication between those 2 threads is managed by the __*core-async*__ Channel called `chatBetween_t1_t2`. The 2 lightweight threads can be seen as 2 users chatting with each other.

```js
const co = require('co')
const { Channel } = require('core-async')

const chatBetween_t1_t2 = new Channel()

co(function *() {
	console.log('STARING LIGHTWEIGHT THREAD T1')
	// Say 'hello' to thread 2 and waiting for answer
	yield chatBetween_t1_t2.put('Hello')
	
	// Waiting for answer from thread 2
	const msg1 = yield chatBetween_t1_t2.take()
	console.log(`				   T2 says: ${msg1}`)
	
	// Responding to thread 2
	yield chatBetween_t1_t2.put(`Going to the beach in 
	 an hour. Want to come?`)
	
	// Waiting for answer from thread 2
	const msg2 = yield chatBetween_t1_t2.take()
	console.log(`				   T2 says: ${msg2}`)
	
	// Responding to thread 2 
	yield chatBetween_t1_t2.put(`No worries mate! Bring 
	 some frothies. See you 
	 there!`)
})

co(function *() {
	console.log('STARING LIGHTWEIGHT THREAD T2')
	
	// Waiting for the first message from T1
	const msg1 = yield chatBetween_t1_t2.take()
	console.log(`T1 says: ${msg1}`)
	
	// Replying to T1 
	yield chatBetween_t1_t2.put(`Hi T1. What's up?`)
	
	// Waiting for answer from thread 1
	const msg2 = yield chatBetween_t1_t2.take()
	console.log(`T1 says: ${msg2}`)
	
	// Replying to T1 
	yield chatBetween_t1_t2.put(`Sounds great. I'll meet 
					    you there. Thanks for the invite.`)
	
	// Waiting for answer from thread 1
	const msg3 = yield chatBetween_t1_t2.take()
	console.log(`T1 says: ${msg3}`)

	// Closing channel. Though this is not necessary in this case, it is still a best practice 
	// (more about why it is important to close your channel in the section
	// 'Why you should always close your channel when you're done with it').
	chatBetween_t1_t2.close()
})

// OUTPUT:
// =======
// STARING LIGHTWEIGHT THREAD T1
// STARING LIGHTWEIGHT THREAD T2
// T1 says: Hello
// 					T2 says: Hi T1. What's up?
// T1 says: Going to the beach in
// 	    an hour. Want to come?
// 			   		T2 says: Sounds great. I'll meet
// 						 you there. Thanks for the invite.
// T1 says: No worries mate! Bring
// 	    some frothies. See you
// 	    there!
```

## Monitoring Stock Prices

The following snippet monitors the FAANG and check which one moves by more than 5% (up or down) over a certain period of time. If it does,
an alert is sent.

```js
const co = require('co')
const { Channel } = require('core-async')

const STOCKS = ['FB','AAPL', 'AMZN', 'NFLX', 'GOOGL'] // FAANG tickers
const CHECK_INTERVAL = 100 // Check every 100ms. In reality you'd change that to 1 minute.
const SLIDING_WINDOW = 60  // 60 minutes
const PRICE_CHANGE_THRESHOLD = 0.05 // 1 percent

// GENERIC FUNCTIONS NEEDED FOR THIS DEMO. 
const delay = t => new Promise(resolve => setTimeout(resolve, t))
const getRandomNumber = ({ start, end }) => {
	const endDoesNotExist = end === undefined
	if (start == undefined && endDoesNotExist)
		return Math.random()
	
	const _start = start >= 0 ? Math.round(start) : 0
	const _end = end >= 0 ? Math.round(end) : 0
	const size = endDoesNotExist ? _start : (_end - _start)
	const offset = endDoesNotExist ? 0 : _start
	return offset + Math.floor(Math.random() * size)
}

const getStockPrice = ticker => Promise.resolve({ ticker, price:getRandomNumber({ start:100, end: 110 }) })

const getSignificantPriceChange = (priceHistory, percThreshold) => {
	const snapshotT0 = priceHistory[0]
	const snapshotT1 = priceHistory.slice(-1)[0]
	const percChange = (snapshotT1.price-snapshotT0.price)/snapshotT0.price
	if (Math.abs(percChange) >= percThreshold) 
		return { percChange: (percChange*100).toFixed(1), t0: snapshotT0, t1: snapshotT1 }
	else
		return null
}

const sendPriceAlert = ({ ticker, priceChange }) => Promise.resolve({ ticker, priceChange }).then(() => { 
	console.log(`Price of ${ticker} ${priceChange.percChange < 0 ? 'dropped' : 'increased' } by ${priceChange.percChange}% in the last hour.`) 
})


// THE INTERESTING PIECE OF CODE THAT USES CORE-ASYNC
const STOCK_DATA = STOCKS.map(ticker => ({ ticker, chan: new Channel() }))

const main = () => 
	STOCK_DATA.forEach(({ ticker, chan }) => 
		// 1. Create a lightweight thread for each stock which continuously check prices.
		co(function *() {
			while (true) {
				const { price } = yield getStockPrice(ticker)
				chan.put({ price, date: Date.now() })
				yield delay(CHECK_INTERVAL)
			}
		})

		// 2. Create a lightweight thread for each stock that decide if an alert must be sent each time a new price is received.
		co(function *() {
			let priceHist = []
			while (true) {
				const priceSnapshot = yield chan.take()
				priceHist.push(priceSnapshot)
				if (priceHist.length == SLIDING_WINDOW) {
					const priceChange = getSignificantPriceChange(priceHist, PRICE_CHANGE_THRESHOLD)
					if (priceChange) {
						priceHist = []
						sendPriceAlert({ ticker, priceChange })
					} else
						priceHist.splice(0,1)
				}
				yield delay(CHECK_INTERVAL)
			}
		})
	)

main()

```

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:

#### GraphQL
* [__*graphql-serverless*__](https://github.com/nicolasdao/graphql-serverless): GraphQL (incl. a GraphiQL interface) middleware for [webfunc](https://github.com/nicolasdao/webfunc).
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.
* [__*graphql-authorize*__](https://github.com/nicolasdao/graphql-authorize.git): Authorization middleware for [graphql-serverless](https://github.com/nicolasdao/graphql-serverless). Add inline authorization straight into your GraphQl schema to restrict access to certain fields based on your user's rights.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Tools
* [__*aws-cloudwatch-logger*__](https://github.com/nicolasdao/aws-cloudwatch-logger): Promise based logger for AWS CloudWatch LogStream.

# License
Copyright (c) 2017-2019, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>
