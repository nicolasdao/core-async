/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { collection: { sortBy }, promise:{ delay }, error: { throwIfNotTruthy, throwIfNotNumber } } = require('./utils')
const { Channel } = require('./channel')
const { stake } = require('./fn')

/**
 * Returns an unbuffered Channel that will receive a 'timeout' message after a 
 * period of time determined by 'time'
 * 
 * @param  {Number|[Number]} time 	The numbers are in milliseconds. If it is an array, it must contain 2 numbers representing 
 *                                 	an interval used to select a random number
 * @return {Channel}      			[description]
 */
const timeout = time => {
	throwIfNotTruthy(time,'time')
	const isArray = Array.isArray(time)
	if (typeof(time) != 'number' && !isArray)
		throw new Error('Wrong argument exception. \'time\' must either be a number or an 2D array of numbers')

	let t = time
	if (isArray) {
		const t0 = time[0] < 0 ? 0 : time[0]
		const t1 = time[1] < 0 ? 0 : time[1]
		throwIfNotNumber(t0,'time[0]')
		throwIfNotNumber(t1,'time[1]')

		if (t0 > t1)
			throw new Error('Wrong argument exception. \'time[0]\' must be strictly smaller or equal to \'time[1]\'')

		if (t0 == t1)
			t = t0
	} 

	const d = delay(t)
	const out = new Channel(null, { onClosing:d.cancel })
	d.then(() => out.put('timeout'))
	return out
}

/**
 * Returns a channel which inputs are the taken bricks of all the channels.
 * 
 * @param  {[Channel]}	channels Array of channels whose output is ingested by 'outputChan'.
 * @return {Channel}	outputChan
 */
const merge = channels => {
	throwIfNotTruthy(channels, 'channels')
	if (!Array.isArray(channels))
		throw new Error('Wrong argument exception. \'channels\' must be an array of Channel types.')
	channels.forEach((chan,idx) => {
		if (!(chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'channels[${idx}]' must be a Channel type.`)
	})

	const out = new Channel()

	channels.forEach(chan => {
		co(function *() {
			let channelNotClosed = true
			while(channelNotClosed) {
				const data = yield chan.take()
				if (data === null)
					channelNotClosed = false 
				else
					out.put(data)
			}
		})
	})

	return out
}

/**
 * PubSub object
 * 
 * @return {Function} pubSub.pub 	(topics,value) => [Void] where 'topics' is an array of strings and 'value' is any object that
 *                                	needs to be published on those specific 'topics'.
 * @return {Function} pubSub.sub 	(topics,subscriber) => [Void] where 'topics' is an array of strings and 'subscriber' is a Channel 
 *                                	that listen to published object on those 'topics'.
 */
const PubSub = function() {
	let subscribers = {}
	const publisher = new Channel()

	this.pub = (topics, value) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')

		_topics.filter(x => x).forEach(topic => publisher.put({ topic, value }))
	}
	
	this.sub = (topics, subscriber) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')
		
		throwIfNotTruthy(subscriber,'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!subscribers[topic])
				subscribers[topic] = []
			subscribers[topic].push(subscriber)
		})
	}

	this.unsub = (topics, subscriber) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')
		
		throwIfNotTruthy(subscriber,'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!subscribers[topic])
				subscribers[topic] = []
			subscribers[topic] = subscribers[topic].filter(s => s != subscriber)
		})
	}

	co(function *(){
		while(true) {
			const data = yield publisher.take()

			if (data && data.topic && subscribers[data.topic])
				subscribers[data.topic].forEach(subscriber => subscriber.put(data.value))
		}
	})

	return this
}

/**
 * [description]
 * @param  {Channel}  chan        			[description]
 * @param  {Channel}  subscribers[].chan 	[description]
 * @param  {Function} subscribers[].rule 	(data) => [Boolean] where data is a chan's brick
 * @result {Void}
 */
const subscribe = (chan,subscribers) => {
	throwIfNotTruthy(chan,'chan')
	if (!(chan instanceof Channel))
		throw new Error('Wrong argument exception. \'chan\' must be a Channel type.')

	throwIfNotTruthy(subscribers,'subscribers')
	const _subscribers = Array.isArray(subscribers) ? subscribers : [subscribers]
	_subscribers.forEach((subscriber,idx) => {
		throwIfNotTruthy(subscriber,'subscriber')
		throwIfNotTruthy(subscriber.rule,'subscriber.rule')
		throwIfNotTruthy(subscriber.chan,'subscriber.chan')
		if (!(subscriber.chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].chan' must be a Channel type.`)
		if (typeof(subscriber.rule) != 'function')
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].rule' must be a function.`)
	})

	co(function *(){
		let channelNotClosed = true
		while(channelNotClosed) {
			const data = yield chan.take()
			if (data === null)
				channelNotClosed = false 
			else
				_subscribers.filter(({ rule }) => rule(data)).forEach(({ chan:c }) => c.put(data))
		}
	})
}

/**
 * Throttles a series on tasks
 * 
 * @param {[Function]} tasks 	Array of functions representing a tasks
 * @param {Number} 	   buffer 	Buffer size, i.e., the maximum number of concurrent tasks
 * @yield {[Object]}   output 	The results of each tasks.
 */
const throttle = (tasks, buffer) => co(function *(){
	if (!buffer)
		throw new Error('Missing required argument \'buffer\'')
	if (typeof(buffer) != 'number')
		throw new Error(`Wrong argument exception 'buffer'. 'buffer' must be a number (current: ${typeof(buffer)})`)

	buffer = buffer > 0 ? buffer : 1

	tasks = tasks || []
	const chan = new Channel(buffer)
	const l = tasks.length

	const results = []
	for(let i=0;i<l;i++) {
		yield chan.put(i)
		results.push(Promise.resolve(null)
			.then(tasks[i])
			.catch(error => ({ error }))
			.then(result => {
				chan.take()
				return result
			}))
	}
	return yield results
})

const alts = (channels) => co(function *(){
	yield Promise.race(channels.map(chan => new Promise(resolve => {
		const putRequest = chan.getOldestPushRequest()
		if (putRequest)
			resolve({ chan, seq:putRequest.seq })
		else
			chan.listenToUnresolvedPushRequest(resolve)
	})))

	const { chan:realWinner } = sortBy(channels
		.map(chan => {
			chan.stopListeningToUnresolvedPushRequest()
			const putRequest = chan.getOldestPushRequest()
			if (putRequest)
				return { chan, seq:putRequest.seq }
			else
				return false
		})
		.filter(x => x),
	({ seq }) => seq)[0]

	const brick = stake(realWinner)
	return [brick,realWinner]
})

module.exports = {
	PubSub,
	subscribe,
	merge,
	throttle,
	timeout,
	alts
}







