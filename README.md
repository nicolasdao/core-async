# Core Async JS &middot;  [![NPM](https://img.shields.io/npm/v/core-async.svg?style=flat)](https://www.npmjs.com/package/core-async) [![Tests](https://travis-ci.org/nicolasdao/core-async.svg?branch=master)](https://travis-ci.org/nicolasdao/core-async) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
__*Core Async JS*__ is a JS implementation of the Clojure core.async library. It is designed to be used with the npm package 'co'.

# Table of Contents

> * [Install](#install) 
> * [How To Use It](#how-to-use-it) 
>   - [Basic](#basic)
>   - [Config](#config)
> * [FAQ](#faq)
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



# FAQ
Blablabla

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
