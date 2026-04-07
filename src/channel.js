/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * Copyright (c) 2019-2026, Cloudless Consulting Pty Ltd (https://cloudlesslabs.com).
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { put, take, sput, stake } from './fn.js'
import { RingBuffer } from './ring-buffer.js'

const DEFAULT_MODE = 'default'
const SLIDING_MODE = 'sliding'
const DROPPING_MODE = 'dropping'
const NOMATCHKEY = 'no_match_7WmYhpJF33VG3X2dEqCQSwauKRb4zrPIRCh19zDF'
const VALID_MODES = { [DEFAULT_MODE]: true, [SLIDING_MODE]: true, [DROPPING_MODE]: true }

/**
 * Creates a new Channel object.
 *
 * @param {Number}    buffer              (optional, default 0).
 * @param {Function}  transform
 * @param {String}    options.mode        (optional, default 'default'). Valid values: 'default', 'sliding' and 'dropping'
 * @param {Function}  options.onClosing   Functions executed when the 'close' method is called.
 */
class Channel {
	#buffer
	#bufferConsumed
	#mode
	#transform
	#onClosing
	#pushRequests
	#pullRequests
	#unresolvedPushListeners
	#pushCounter
	#pullCounter

	constructor(...args) {
		let [a1, a2, a3] = args
		let transform, buffer, options
		if (typeof(a1) == 'function') {
			transform = a1
			options = a2
		} else if (typeof(a2) == 'function') {
			buffer = a1
			transform = a2
			options = a3
		} else {
			buffer = a1
			options = a2
		}

		options = options || {}
		buffer = buffer || 0
		let { onClosing, mode } = options || {}
		mode = (mode || DEFAULT_MODE).toLowerCase().trim()

		if (typeof(buffer) != 'number')
			throw new Error(`Wrong argument exception. 'buffer' must be a number (current type: '${typeof(buffer)}').`)

		if (!VALID_MODES[mode])
			throw new Error(`Wrong argument exception. 'mode' can only equal to 'default', 'dropping' or 'sliding' (current: '${mode}').`)
		if ((mode == DROPPING_MODE || mode == SLIDING_MODE) && buffer < 1)
			throw new Error('Wrong argument exception. When the Channel\'s mode is \'dropping\' or \'sliding\', the buffer must be greater than 0.')
		if (onClosing && typeof(onClosing) != 'function')
			throw new Error(`Wrong argument exception. 'options.onClosing' must be a function (current type: ${typeof(onClosing)}).`)

		this.#buffer = buffer
		this.#bufferConsumed = 0
		this.#mode = mode
		this.#transform = transform
		this.#onClosing = onClosing
		this.#pushRequests = new RingBuffer()
		this.#pullRequests = new RingBuffer()
		this.#unresolvedPushListeners = []
		this.#pushCounter = 0
		this.#pullCounter = 0

		this.opened = true
		this.closed = false
		this.closing = false
	}

	#isBufferFree() {
		return this.#buffer > 0 && this.#bufferConsumed < this.#buffer
	}

	#incrementBuffer() {
		if (this.#buffer > 0 && this.#bufferConsumed < this.#buffer)
			++this.#bufferConsumed
		return this.#bufferConsumed
	}

	#decrementBuffer() {
		if (this.#buffer > 0 && this.#bufferConsumed > 0)
			--this.#bufferConsumed
		if (this.#isBufferFree()) {
			const oldestNonProcessedPushRequest = this.#pushRequests.peekValid(
				r => !r.processed && !r.cancelled
			)
			if (oldestNonProcessedPushRequest) {
				this.#incrementBuffer()
				oldestNonProcessedPushRequest.next(true)
				oldestNonProcessedPushRequest.processed = true
			}
		}
	}

	#getOldestPushRequest() {
		return this.#pushRequests.peekValid(r => !r.cancelled)
	}

	#getOldestPullRequest() {
		return this.#pullRequests.peekValid(r => !r.cancelled)
	}

	#popOldestPushRequest() {
		return this.#pushRequests.dequeueValid(r => !r.cancelled) || null
	}

	#popOldestPullRequest() {
		return this.#pullRequests.dequeueValid(r => !r.cancelled) || null
	}

	close() {
		this.opened = false
		this.closing = true
		if (this.#onClosing)
			this.#onClosing()

		while (this.#getOldestPullRequest()) {
			const pullRequest = this.#popOldestPullRequest()
			const brick = this.#getOldestPushRequest()
				? ((this.#popOldestPushRequest() || {}).brick || null)
				: null
			pullRequest.next(brick)
		}
		while (this.#getOldestPushRequest()) {
			const pushRequest = this.#popOldestPushRequest()
			pushRequest.next(false)
		}

		this.closed = true
	}

	getOldestPushRequest() {
		return this.#getOldestPushRequest()
	}

	getOldestPullRequest() {
		return this.#getOldestPullRequest()
	}

	push(brick, next) {
		if (brick === null)
			this.close()
		if (!this.opened)
			return next ? next(null) : null

		next = next || (() => true)
		const seq = ++this.#pushCounter
		if (this.#getOldestPullRequest()) {
			const pullRequest = this.#popOldestPullRequest()
			pullRequest.next(brick)
			next(true)
		} else {
			const isBufferFree = this.#isBufferFree()
			const _next = isBufferFree ? (() => null) : next
			this.#pushRequests.enqueue({ seq, brick, next:_next, processed:isBufferFree })
			if (isBufferFree) {
				this.#incrementBuffer()
				next(true)
			} else if (this.#mode == DROPPING_MODE) {
				this.#pushRequests.removeLast()
				next(null)
			} else if (this.#mode == SLIDING_MODE) {
				this.#pushRequests.dequeueValid(() => true)
				next(true)
			}

			if (this.#unresolvedPushListeners.length) {
				this.#unresolvedPushListeners.forEach(n => n({ chan:this, seq }))
				this.#unresolvedPushListeners.length = 0
			}
		}
		return seq
	}

	pull(next) {
		const seq = ++this.#pullCounter
		if (this.#getOldestPushRequest()) {
			const pushRequest = this.#popOldestPushRequest()
			pushRequest.next(true)
			next(pushRequest.brick)
			this.#decrementBuffer()
		} else if (!this.opened)
			next(null)
		else
			this.#pullRequests.enqueue({ seq, next })

		return seq
	}

	listenToUnresolvedPushRequest(next) {
		this.#unresolvedPushListeners.push(next)
	}

	stopListeningToUnresolvedPushRequest() {
		this.#unresolvedPushListeners.length = 0
	}

	cancelPush(seq) {
		const pushRequest = this.#pushRequests.find(r => r.seq == seq)
		if (pushRequest) {
			pushRequest.cancelled = true
			pushRequest.next(false)
			pushRequest.processed = true
		}
	}

	cancelPull(seq) {
		const pullRequest = this.#pullRequests.find(r => r.seq == seq)
		if (pullRequest) {
			pullRequest.cancelled = true
			pullRequest.next()
		}
	}

	async put(brick, options) {
		if (this.#transform) {
			const b = await this.#transform(brick)
			if (b === NOMATCHKEY)
				return false
			return put(this, b, options)
		} else
			return put(this, brick, options)
	}

	sput(brick) {
		if (this.#transform)
			return this.#transform(brick).then(b => {
				if (b === NOMATCHKEY)
					return false
				return sput(this, b)
			})
		else
			return sput(this, brick)
	}

	take(options) {
		return take(this, options)
	}

	stake() {
		return stake(this)
	}
}

export {
	Channel,
	NOMATCHKEY
}
