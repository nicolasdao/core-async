/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * Copyright (c) 2019-2026, Cloudless Consulting Pty Ltd (https://cloudlesslabs.com).
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { collection, error, promise } from './utils/index.js'
import { Channel } from './channel.js'
import { stake } from './fn.js'

const { sortBy } = collection
const { delay } = promise
const { throwIfNotTruthy, throwIfNotNumber } = error

/**
 * Returns an unbuffered Channel that will receive a 'timeout' message after a
 * period of time determined by 'time'
 *
 * @param  {Number|[Number]} time
 * @return {Channel}
 */
const timeout = time => {
	throwIfNotTruthy(time, 'time')
	const isArray = Array.isArray(time)
	if (typeof(time) != 'number' && !isArray)
		throw new Error('Wrong argument exception. \'time\' must either be a number or an 2D array of numbers')

	let t = time
	if (isArray) {
		const t0 = time[0] < 0 ? 0 : time[0]
		const t1 = time[1] < 0 ? 0 : time[1]
		throwIfNotNumber(t0, 'time[0]')
		throwIfNotNumber(t1, 'time[1]')

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
 * @param  {[Channel]}  channels Array of channels whose output is ingested by 'outputChan'.
 * @return {Channel}    outputChan
 */
const merge = channels => {
	throwIfNotTruthy(channels, 'channels')
	if (!Array.isArray(channels))
		throw new Error('Wrong argument exception. \'channels\' must be an array of Channel types.')
	channels.forEach((chan, idx) => {
		if (!(chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'channels[${idx}]' must be a Channel type.`)
	})

	const out = new Channel()

	channels.forEach(chan => {
		;(async () => {
			let channelNotClosed = true
			while (channelNotClosed) {
				const data = await chan.take()
				if (data === null)
					channelNotClosed = false
				else
					out.put(data)
			}
		})()
	})

	return out
}

/**
 * PubSub object
 *
 * @return {Function} pubSub.pub  (topics,value) => [Void]
 * @return {Function} pubSub.sub  (topics,subscriber) => [Void]
 * @return {Function} pubSub.unsub (topics,subscriber) => [Void]
 * @return {Function} pubSub.close () => [Void]
 */
class PubSub {
	#subscribers
	#publisher

	constructor() {
		this.#subscribers = {}
		this.#publisher = new Channel()
		this.#startLoop()
	}

	async #startLoop() {
		while (true) {
			const data = await this.#publisher.take()
			if (data === null) break
			if (data && data.topic && this.#subscribers[data.topic])
				this.#subscribers[data.topic].forEach(subscriber => subscriber.put(data.value))
		}
	}

	close() {
		this.#publisher.close()
	}

	pub(topics, value) {
		throwIfNotTruthy(topics, 'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')

		_topics.filter(x => x).forEach(topic => this.#publisher.put({ topic, value }))
	}

	sub(topics, subscriber) {
		throwIfNotTruthy(topics, 'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')

		throwIfNotTruthy(subscriber, 'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!this.#subscribers[topic])
				this.#subscribers[topic] = []
			this.#subscribers[topic].push(subscriber)
		})
	}

	unsub(topics, subscriber) {
		throwIfNotTruthy(topics, 'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')

		throwIfNotTruthy(subscriber, 'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!this.#subscribers[topic])
				this.#subscribers[topic] = []
			this.#subscribers[topic] = this.#subscribers[topic].filter(s => s != subscriber)
		})
	}
}

/**
 * @param  {Channel}  chan
 * @param  {Channel}  subscribers[].chan
 * @param  {Function} subscribers[].rule  (data) => [Boolean]
 * @result {Void}
 */
const subscribe = (chan, subscribers) => {
	throwIfNotTruthy(chan, 'chan')
	if (!(chan instanceof Channel))
		throw new Error('Wrong argument exception. \'chan\' must be a Channel type.')

	throwIfNotTruthy(subscribers, 'subscribers')
	const _subscribers = Array.isArray(subscribers) ? subscribers : [subscribers]
	_subscribers.forEach((subscriber, idx) => {
		throwIfNotTruthy(subscriber, 'subscriber')
		throwIfNotTruthy(subscriber.rule, 'subscriber.rule')
		throwIfNotTruthy(subscriber.chan, 'subscriber.chan')
		if (!(subscriber.chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].chan' must be a Channel type.`)
		if (typeof(subscriber.rule) != 'function')
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].rule' must be a function.`)
	})

	;(async () => {
		let channelNotClosed = true
		while (channelNotClosed) {
			const data = await chan.take()
			if (data === null)
				channelNotClosed = false
			else
				_subscribers.filter(({ rule }) => rule(data)).forEach(({ chan:c }) => c.put(data))
		}
	})()
}

/**
 * Throttles a series on tasks
 *
 * @param {[Function]} tasks   Array of functions representing a tasks
 * @param {Number}     buffer  Buffer size, i.e., the maximum number of concurrent tasks
 * @return {Promise<[Object]>} output The results of each tasks.
 */
const throttle = async (tasks, buffer) => {
	if (!buffer)
		throw new Error('Missing required argument \'buffer\'')
	if (typeof(buffer) != 'number')
		throw new Error(`Wrong argument exception 'buffer'. 'buffer' must be a number (current: ${typeof(buffer)})`)

	buffer = buffer > 0 ? buffer : 1

	tasks = tasks || []
	const chan = new Channel(buffer)
	const l = tasks.length

	const results = []
	for (let i = 0; i < l; i++) {
		await chan.put(i)
		results.push(Promise.resolve(null)
			.then(tasks[i])
			.catch(error => ({ error }))
			.then(result => {
				chan.take()
				return result
			}))
	}
	return Promise.all(results)
}

const alts = async (channels) => {
	await Promise.race(channels.map(chan => new Promise(resolve => {
		const putRequest = chan.getOldestPushRequest()
		if (putRequest)
			resolve({ chan, seq:putRequest.seq })
		else
			chan.listenToUnresolvedPushRequest(resolve)
	})))

	// Stop all listeners
	channels.forEach(chan => chan.stopListeningToUnresolvedPushRequest())

	// Find the channel with the oldest push request (lowest seq)
	const candidates = channels
		.map(chan => {
			const putRequest = chan.getOldestPushRequest()
			if (putRequest)
				return { chan, seq:putRequest.seq }
			else
				return null
		})
		.filter(x => x)

	if (candidates.length === 0)
		return alts(channels)

	const { chan:realWinner } = sortBy(candidates, ({ seq }) => seq)[0]

	const brick = stake(realWinner)
	if (brick === false && candidates.length > 1) {
		// Winner was consumed; try next candidates
		const sorted = sortBy(candidates, ({ seq }) => seq)
		for (let i = 1; i < sorted.length; i++) {
			const b = stake(sorted[i].chan)
			if (b !== false)
				return [b, sorted[i].chan]
		}
		// All consumed; retry
		return alts(channels)
	}

	return [brick, realWinner]
}

export {
	PubSub,
	subscribe,
	merge,
	throttle,
	timeout,
	alts
}
