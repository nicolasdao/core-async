import { delay } from './utils/promise.js'

const TIMEOUT = '__timeout'

const schedule = typeof setImmediate === 'function'
	? setImmediate
	: (fn) => setTimeout(fn, 0)

const put = (chan, brick, options) => {
	const { timeout:t } = options || {}
	let seq
	const p = new Promise(resolve => seq = chan.push(brick, v => schedule(() => resolve(v))))
	if (t > 0)
		return Promise.race([delay(t).then(() => TIMEOUT), p]).then(v => {
			if (v != TIMEOUT)
				return v
			chan.cancelPush(seq)
			let err = new Error(`'put' timed out after ${t} ms. No data was added to the channel.`)
			err.code = 408
			throw err
		})
	else
		return p
}

const sput = (chan, brick) => {
	if (chan.getOldestPullRequest()) {
		chan.push(brick)
		return true
	}

	return false
}

const take = (chan, options) => {
	const { timeout:t } = options || {}
	let seq
	const p = new Promise(resolve => seq = chan.pull(brick => schedule(() => resolve(brick))))
	if (t > 0)
		return Promise.race([delay(t).then(() => TIMEOUT), p]).then(v => {
			if (v != TIMEOUT)
				return v
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

export {
	put,
	take,
	sput,
	stake
}
