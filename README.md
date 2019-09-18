# Core Async JS &middot;  [![NPM](https://img.shields.io/npm/v/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async) [![Tests](https://travis-ci.org/nicolasdao/core-async.svg?branch=master)](https://travis-ci.org/nicolasdao/core-async) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to) [![npm downloads](https://img.shields.io/npm/dt/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async)
__*Core Async JS*__ is a JS implementation of the Clojure core.async library. It is designed to be used with the npm package 'co'.

# Table of Contents

> * [Install](#install) 
> * [How To Use It](#how-to-use-it) 
>	- [Basic](#basic)
>	- [Buffered vs Unbuffered Channels](#buffered-vs-unbuffered-channels)
>	- [Dropping and Sliding Channels](#dropping-and-sliding-channels)
>	- [API](#api)
>		- [put - take - sput - stake](#put---take---sput---stake)
>		- [alts](#alts)
>		- [timeout](#timeout)
>		- [merge](#merge)
>		- [subscribe](#subscribe)
>		- [throttle](#throttle)
> * [Common Patterns & Idiomatic Style](#common-patterns--idiomatic-style)
>	- [Dealing With Timeout](#dealing-with-timeout)
> * [Examples](#examples)
>		- [Monitoring Stock Prices](#monitoring-stock-prices)
> * [About Neap](#this-is-what-we-re-up-to)
> * [License](#license)


# Install
```
npm i core-async
```

# How To Use It
## Basic

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

## Buffered vs Unbuffered Channels

```js
const { Channel } = require('core-async')

const chan = new Channel(2)

...
```

More detailed doc coming soon...

## Dropping and Sliding Channels

```js
const { Channel } = require('core-async')

const droppingChan = new Channel(2, 'dropping')
const slidingChan = new Channel(2, 'sliding')

...
```

More detailed doc coming soon... 

# API
## put - take - sput - stake

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

More detailed doc coming soon...

## alts


```js
const co = require('co')
const { Channel, alts } = require('core-async')

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

## timeout

`timeout` returns an empty buffer channel that puts a brick onto it after a predetermined amount of milliseconds. This designs to deal with timeouts in a very idiomatic way as demontrated in the [Dealing With Timeout](#dealing-with-timeout) section.

```js
const co = require('co')
const { timeout } = require('core-async')

co(function *() {
	const t = timeout(5000)
	console.log('Start waiting for 5 seconds...')

	yield t.take()

	console.log('Done waiting!')
})
```

## merge

> WARNING: This API is not part of the original Clojure core.async library. It was added because of its frequent usage and many common scenarios.

```js
const co = require('co')
const { Channel, tools: { merge } } = require('core-async')

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

## subscribe

> WARNING: This API is not part of the original Clojure core.async library. It was added because of its frequent usage and many common scenarios.

```js
const co = require('co')
const { Channel, tools: { subscribe } } = require('core-async')

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

> WARNING: This API is not part of the original Clojure core.async library. It was added because of its frequent usage and many common scenarios.

```js
const co = require('co')
const { tools: { throttle } } = require('core-async')

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


# Examples
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
