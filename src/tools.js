/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { error: { throwIfNotTruthy } } = require('./utils')
const { Channel } = require('./channel')

/**
 * [description]
 * @param  {[Channel]} channels [description]
 * @return {Channel}     		[description]
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

module.exports = {
	PubSub,
	subscribe,
	merge,
	throttle
}







