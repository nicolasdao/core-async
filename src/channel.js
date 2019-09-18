/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const co = require('co')
const { collection: { sortBy }, promise:{ delay }, error: { throwIfNotNumber, throwIfNotTruthy } } = require('./utils')

const TIMEOUT = '__timeout'
const DEFAULT_MODE = 'default'
const SLIDING_MODE = 'sliding'
const DROPPING_MODE = 'dropping'
let VALID_MODES = {}
VALID_MODES[DEFAULT_MODE] = true
VALID_MODES[SLIDING_MODE] = true
VALID_MODES[DROPPING_MODE] = true

const put = (chan,brick,options) => {
	const { timeout:t } = options || {}
	let seq 
	const p = new Promise(resolve => seq = chan.push(brick,v => setImmediate(() => resolve(v))))
	if (t > 0)
		return Promise.race([delay(t).then(() => TIMEOUT),p]).then(v => {
			if (v != TIMEOUT)
				return
			chan.cancelPush(seq)
			let err = new Error(`'put' timed out after ${t} ms. No data was added to the channel.`)
			err.code = 408
			throw err
		})
	else
		return p
}

const sput = (chan,brick) => {
	if (chan.getOldestPullRequest()) {
		chan.push(brick)
		return true 
	}

	return false
}

const take = (chan,options) => {
	const { timeout:t } = options || {}
	let seq 
	const p = new Promise(resolve => seq = chan.pull(brick => setImmediate(() => resolve(brick))))
	if (t > 0)
		return Promise.race([delay(t).then(() => TIMEOUT),p]).then(v => {
			if (v != TIMEOUT)
				return
			chan.cancelPull(seq)
			let err = new Error(`'take' timed out after ${t} ms. No data was taken off the channel.`)
			err.code = 408
			throw err
		})
	else
		return p
}

const stake = chan => {
	if (chan.getOldestPushRequest()) {
		let brick
		chan.pull(b => brick = b)
		return brick 
	}

	return false
}

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
	const out = new Channel(null, null, { onClosing:d.cancel })
	d.then(() => out.put('timeout'))
	return out
}

let _pushCounter = 0
let _pullCounter = 0
/**
 * Creates a new Channel object.
 * 
 * @param {Number} buffer  				(optional, default 0). 
 * @param {String} mode    				(optional, default 'default'). Valid values: 'default', 'sliding' and 'dropping'
 * @param {Function} options.onClosing	Functions executed when the 'close' method is called.
 */
const Channel = function(buffer,mode,options) {
	buffer = buffer || 0
	mode = (mode || DEFAULT_MODE).toLowerCase().trim()
	const { onClosing } = options || {}

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

	this.put = (brick,options) => put(_this,brick,options)
	this.sput = (brick) => sput(_this,brick)
	this.take = (options) => take(_this,options)
	this.stake = () => stake(_this)

	return this
}

module.exports = {
	Channel,
	alts,
	put,
	sput,
	take,
	stake,
	timeout
}








