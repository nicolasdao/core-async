/**
 * ESM smoke test — verifies that the ESM build works with native import syntax.
 */

import { Channel, timeout, alts, delay, PubSub, merge, subscribe, throttle, map, filter, reduce, compose, transducer, utils, NOMATCHKEY } from '../dist/index.js'

describe('ESM Smoke Test', () => {
	it('01 - Should import all exports correctly', () => {
		const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

		// Core
		assert(typeof Channel === 'function', 'Channel should be a function')
		assert(typeof NOMATCHKEY === 'string', 'NOMATCHKEY should be a string')

		// Transducers (flat)
		assert(typeof map === 'function', 'map should be a function')
		assert(typeof filter === 'function', 'filter should be a function')
		assert(typeof reduce === 'function', 'reduce should be a function')
		assert(typeof compose === 'function', 'compose should be a function')

		// Utilities (flat)
		assert(typeof PubSub === 'function', 'PubSub should be a function')
		assert(typeof subscribe === 'function', 'subscribe should be a function')
		assert(typeof merge === 'function', 'merge should be a function')
		assert(typeof throttle === 'function', 'throttle should be a function')
		assert(typeof timeout === 'function', 'timeout should be a function')
		assert(typeof alts === 'function', 'alts should be a function')
		assert(typeof delay === 'function', 'delay should be a function')

		// Backward-compat namespaces
		assert(typeof transducer === 'object', 'transducer namespace should exist')
		assert(typeof transducer.map === 'function', 'transducer.map should be a function')
		assert(typeof utils === 'object', 'utils namespace should exist')
		assert(typeof utils.PubSub === 'function', 'utils.PubSub should be a function')
	})

	it('02 - Should support async/await channel operations', async () => {
		const chan = new Channel()

		// Producer
		const producer = (async () => {
			await chan.put('hello')
			await chan.put('world')
			await chan.put(null) // close
		})()

		// Consumer
		const values = []
		let val = await chan.take()
		while (val !== null) {
			values.push(val)
			val = await chan.take()
		}

		await producer

		const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
		assert(values.length === 2, `Expected 2 values, got ${values.length}`)
		assert(values[0] === 'hello', `Expected 'hello', got '${values[0]}'`)
		assert(values[1] === 'world', `Expected 'world', got '${values[1]}'`)
	})

	it('03 - Should support transducers with async/await', async () => {
		const chan = new Channel(filter(x => x > 1))

		const producer = (async () => {
			const s1 = await chan.put(1) // filtered out
			const s2 = await chan.put(2) // passes
			const s3 = await chan.put(3) // passes
			return { s1, s2, s3 }
		})()

		const a = await chan.take()
		const b = await chan.take()
		const { s1, s2, s3 } = await producer

		const assert = (cond, msg) => { if (!cond) throw new Error(msg) }
		assert(s1 === false, `Expected put(1) to return false, got ${s1}`)
		assert(s2 === true, `Expected put(2) to return true, got ${s2}`)
		assert(s3 === true, `Expected put(3) to return true, got ${s3}`)
		assert(a === 2, `Expected take() to return 2, got ${a}`)
		assert(b === 3, `Expected take() to return 3, got ${b}`)
	})
})
