/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { put, take, sput, stake } = require('./fn')

const DEFAULT_MODE = 'default'
const SLIDING_MODE = 'sliding'
const DROPPING_MODE = 'dropping'
const NOMATCHKEY = 'no_match_7WmYhpJF33VG3X2dEqCQSwauKRb4zrPIRCh19zDF'
let VALID_MODES = {}
VALID_MODES[DEFAULT_MODE] = true
VALID_MODES[SLIDING_MODE] = true
VALID_MODES[DROPPING_MODE] = true

let _pushCounter = 0
let _pullCounter = 0
/**
 * Creates a new Channel object.
 * 
 * @param {Number}		buffer  			(optional, default 0). 
 * @param {Function}	transform  			
 * @param {String}		options.mode		(optional, default 'default'). Valid values: 'default', 'sliding' and 'dropping'
 * @param {Function}	options.onClosing	Functions executed when the 'close' method is called.
 */
const Channel = function(...args) {
	let [a1, a2, a3] = args
	let transform, buffer, options
	if (typeof(a1) == 'function') {
		transform = a1
		options = a2
	} else if (typeof(a2) == 'function')  {
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
		throw new Error(`Wrong argument exception. 'buffer' must be a number (current type: '${typeof(number)}').`)

	if (!VALID_MODES[mode])
		throw new Error(`Wrong argument exception. 'mode' can only equal to 'default', 'dropping' or 'sliding' (current: '${mode}').`)
	if ((mode == DROPPING_MODE || mode == SLIDING_MODE) && buffer < 1)
		throw new Error('Wrong argument exception. When the Channel\'s mode is \'dropping\' or \'sliding\', the buffer must be greater than 0.')
	if (onClosing && typeof(onClosing) != 'function')
		throw new Error(`Wrong argument exception. 'options.onClosing' must be a function (current type: ${typeof(onClosing)}).`)

	const _this = this

	let _bufferConsumed = 0
	const _isBufferFree = () => buffer > 0 && _bufferConsumed < buffer
	const _incrementBuffer = () => buffer > 0 && _bufferConsumed < buffer ? ++_bufferConsumed : _bufferConsumed
	const _decrementBuffer = () => {
		buffer > 0 && _bufferConsumed > 0 ? --_bufferConsumed : _bufferConsumed
		if (_isBufferFree()) {
			const oldestNonProcessedPushRequest = _pushRequests.find(({ processed, cancelled }) => !processed && !cancelled)
			if (oldestNonProcessedPushRequest) {
				_incrementBuffer()
				oldestNonProcessedPushRequest.next(true)
				oldestNonProcessedPushRequest.processed = true
			}
		}
	}

	const _pushRequests = []
	const _pullRequests = []

	let _unresolvedPushListeners = []
	const _clearUnresolvedPushListeners = () => {
		_unresolvedPushListeners = null
		_unresolvedPushListeners = []
	}

	const _getOldestPushRequest = () => _pushRequests.find(({ cancelled }) => !cancelled)
	const _getOldestPullRequest = () => _pullRequests.find(({ cancelled }) => !cancelled)
	const _popOldestPushRequest = () => {
		const pushRequest = _pushRequests.splice(0,1)[0]
		if (!pushRequest)
			return null
		if (pushRequest.cancelled)
			return _popOldestPushRequest()
		return pushRequest
	}
	const _popOldestPullRequest = () => {
		const pullRequest = _pullRequests.splice(0,1)[0]
		if (!pullRequest)
			return null
		if (pullRequest.cancelled)
			return _popOldestPullRequest()
		return pullRequest
	}

	this.opened = true
	this.closed = false
	this.closing = false
	this.close = () => {
		_this.opened = false
		_this.closing = true
		if (onClosing)
			onClosing()

		while (_getOldestPullRequest()) {
			const pullRequest = _popOldestPullRequest()
			const brick = _getOldestPushRequest() ? ((_popOldestPushRequest() || {}).brick || null) : null
			pullRequest.next(brick)
		}
		while (_getOldestPushRequest()) {
			const pushRequest = _popOldestPushRequest()
			pushRequest.next(false)
		}

		_this.closed = true
	}

	this.getOldestPushRequest = _getOldestPushRequest
	this.getOldestPullRequest = _getOldestPullRequest

	this.push = (brick,next) => {
		if (brick === null)
			_this.close()
		if (!_this.opened)
			return next(null)

		next = next || (() => true)
		const seq = ++_pushCounter
		if (_getOldestPullRequest()) {
			const pullRequest = _popOldestPullRequest()
			pullRequest.next(brick)
			next(true)
		} else {
			const isBufferFree = _isBufferFree()
			const _next = isBufferFree ? (() => null) : next
			_pushRequests.push({ seq, brick, next:_next, processed:isBufferFree })
			if (isBufferFree) {
				_incrementBuffer()
				next(true)
			} else if (mode == DROPPING_MODE) {
				/* eslint-disable */
				let p = _pushRequests.pop()
				p = null
				/* eslint-enable */
				next(null)
			} else if (mode == SLIDING_MODE) {
				/* eslint-disable */
				let p = _pushRequests.splice(0,1)
				p = null
				/* eslint-enable */
				next(true)
			}

			if (_unresolvedPushListeners.length) {
				_unresolvedPushListeners.map(n => n({ chan:_this, seq }))
				_clearUnresolvedPushListeners()
			}
		}
		return seq
	}

	this.pull = (next) => {
		const seq = ++_pullCounter
		if (_getOldestPushRequest()) {
			const pushRequest = _popOldestPushRequest()
			pushRequest.next(true)
			next(pushRequest.brick)
			_decrementBuffer()
		} else if (!_this.opened)
			next(null)
		else
			_pullRequests.push({ seq, next })

		return seq
	}

	this.listenToUnresolvedPushRequest = (next) => _unresolvedPushListeners.push(next)
	this.stopListeningToUnresolvedPushRequest = _clearUnresolvedPushListeners

	this.cancelPush = seq => {
		let pushRequest = _pushRequests.find(({ seq:s }) => s == seq)
		if (pushRequest) {
			pushRequest.cancelled = true
			pushRequest.next(false)
			pushRequest.processed = true
		}
	}
	this.cancelPull = seq => {
		let pullRequest = _pullRequests.find(({ seq:s }) => s == seq)
		if (pullRequest) {
			pullRequest.cancelled = true
			pullRequest.next()
		}
	}

	this.put = (brick,options) => co(function *() {
		if (transform) {
			const b = yield transform(brick)
			if (b === NOMATCHKEY)
				return false
			return yield put(_this,b,options)
		} else 
			return yield put(_this,brick,options)
	})
	this.sput = (brick) => {
		if (transform) 
			return transform(brick).then(b => {
				if (b === NOMATCHKEY)
					return false
				return sput(_this,b)
			})
		else
			return sput(_this,brick)
	}
	this.take = (options) => take(_this,options)
	this.stake = () => stake(_this)

	return this
}

module.exports = {
	Channel,
	NOMATCHKEY
}








