/**
 * Edge case tests and async/await pattern tests for v3.0.0
 */

const { assert } = require('chai')
const co = require('co')
const { Channel, utils: { throttle, alts, timeout, merge, subscribe, PubSub }, transducer: { filter, map, compose }, delay } = require('../dist/index.cjs')

describe('Edge Cases', () => {

	describe('Channel state transitions', () => {
		it('01 - Calling close() multiple times should not throw', () => {
			const chan = new Channel()
			chan.close()
			chan.close()
			chan.close()
			assert.isOk(chan.closed, 'Should remain closed')
		})

		it('02 - stake() on empty channel should return false', () => {
			const chan = new Channel()
			assert.strictEqual(chan.stake(), false, '01')
		})

		it('03 - stake() on closed channel should return false', () => {
			const chan = new Channel()
			chan.close()
			assert.strictEqual(chan.stake(), false, '01')
		})

		it('04 - sput() on channel with no taker should return false', () => {
			const chan = new Channel()
			assert.strictEqual(chan.sput('hello'), false, '01')
		})

		it('05 - Channel state properties should transition correctly', done => {
			const chan = new Channel()

			assert.isOk(chan.opened, '01')
			assert.isNotOk(chan.closing, '02')
			assert.isNotOk(chan.closed, '03')

			chan.close()

			assert.isNotOk(chan.opened, '04')
			assert.isOk(chan.closing, '05')
			assert.isOk(chan.closed, '06')

			co(function *() {
				const putResult = yield chan.put('test')
				assert.strictEqual(putResult, null, '07 - put on closed channel returns null')
				const takeResult = yield chan.take()
				assert.strictEqual(takeResult, null, '08 - take on closed channel returns null')
				done()
			}).catch(done)
		})

		it('06 - onClosing callback should fire when channel is closed', done => {
			let callbackFired = false
			const chan = new Channel(null, { onClosing: () => { callbackFired = true } })

			assert.isNotOk(callbackFired, '01')
			chan.close()
			assert.isOk(callbackFired, '02')
			done()
		})

		it('07 - onClosing callback should fire when null is put', done => {
			let callbackFired = false
			const chan = new Channel(null, { onClosing: () => { callbackFired = true } })

			chan.put(null).then(() => {
				assert.isOk(callbackFired, '01')
				done()
			}).catch(done)
		})
	})

	describe('sput with transducer', () => {
		it('08 - sput with transducer should return a Promise', done => {
			const chan = new Channel(map(x => x * 2))

			// Set up a taker first
			chan.take().then(val => {
				assert.equal(val, 10, '01 - value should be transformed')
				done()
			}).catch(done)

			const result = chan.sput(5)
			assert.isOk(result instanceof Promise, '02 - sput with transform returns Promise')
			result.then(success => {
				assert.isOk(success, '03 - sput should succeed')
			}).catch(done)
		})

		it('09 - sput with filter transducer should reject filtered values', done => {
			const chan = new Channel(filter(x => x > 10))

			// Set up a taker
			chan.take()

			const result = chan.sput(5) // Should be filtered out
			assert.isOk(result instanceof Promise, '01')
			result.then(success => {
				assert.strictEqual(success, false, '02 - filtered value should return false')
				done()
			}).catch(done)
		})
	})

	describe('Throttle error handling', () => {
		it('10 - Should capture task errors as { error } objects', done => {
			const tasks = [
				() => Promise.resolve('ok'),
				() => Promise.reject(new Error('task failed')),
				() => Promise.resolve('also ok')
			]

			throttle(tasks, 2).then(results => {
				assert.equal(results.length, 3, '01')
				assert.equal(results[0], 'ok', '02')
				assert.isOk(results[1].error, '03 - failed task should have error property')
				assert.equal(results[1].error.message, 'task failed', '04')
				assert.equal(results[2], 'also ok', '05')
				done()
			}).catch(done)
		})

		it('11 - Should reject when buffer is missing', async () => {
			try {
				await throttle([], null)
				assert.fail('Should have thrown')
			} catch (err) {
				assert.isOk(err.message.indexOf('buffer') >= 0, err.message)
			}
		})

		it('12 - Should reject when buffer is not a number', async () => {
			try {
				await throttle([], 'not a number')
				assert.fail('Should have thrown')
			} catch (err) {
				assert.isOk(err.message.indexOf('buffer') >= 0, err.message)
			}
		})
	})

	describe('Async/await without co', () => {
		it('13 - Should support full async/await channel workflow', async () => {
			const chan = new Channel()
			const values = []

			const producer = (async () => {
				await chan.put(1)
				await chan.put(2)
				await chan.put(3)
				await chan.put(null) // close
			})()

			const consumer = (async () => {
				let val = await chan.take()
				while (val !== null) {
					values.push(val)
					val = await chan.take()
				}
			})()

			await Promise.all([producer, consumer])

			assert.deepEqual(values, [1, 2, 3])
		})

		it('14 - Should support async/await with buffered channel', async () => {
			const chan = new Channel(2)

			await chan.put('a') // buffered
			await chan.put('b') // buffered

			const v1 = await chan.take()
			const v2 = await chan.take()

			assert.equal(v1, 'a')
			assert.equal(v2, 'b')
		})

		it('15 - Should support async/await with timeout', async () => {
			const chan = new Channel()

			try {
				await chan.take({ timeout: 10 })
				assert.fail('Should have thrown')
			} catch (err) {
				assert.equal(err.code, 408)
			}
		})

		it('16 - Should support async/await with alts and timeout', async () => {
			const dataChan = new Channel()
			const t = timeout(10)

			const [val, winner] = await alts([dataChan, t])

			assert.equal(val, 'timeout')
			assert.strictEqual(winner, t)
		})

		it('17 - Should support async/await with transducers', async () => {
			const chan = new Channel(compose(
				filter(x => x > 0),
				map(x => x * 100)
			))

			const producer = (async () => {
				const s1 = await chan.put(-1) // filtered
				const s2 = await chan.put(2)  // passes: 200
				const s3 = await chan.put(3)  // passes: 300
				return { s1, s2, s3 }
			})()

			const v1 = await chan.take()
			const v2 = await chan.take()
			const { s1, s2, s3 } = await producer

			assert.equal(s1, false, 'filtered value returns false')
			assert.equal(s2, true)
			assert.equal(s3, true)
			assert.equal(v1, 200)
			assert.equal(v2, 300)
		})
	})

	describe('alts edge cases', () => {
		it('18 - alts with a single channel should work', done => {
			const chan = new Channel()
			chan.put('only')

			co(function *() {
				const [val, winner] = yield alts([chan])
				assert.equal(val, 'only', '01')
				assert.strictEqual(winner, chan, '02')
				done()
			}).catch(done)
		})
	})

	describe('merge edge cases', () => {
		it('19 - merge with one channel should forward all values', done => {
			const chan = new Channel()
			const merged = merge([chan])

			chan.put(1)
			chan.put(2)
			chan.put(3)

			co(function *() {
				const v1 = yield merged.take()
				const v2 = yield merged.take()
				const v3 = yield merged.take()
				assert.equal(v1, 1, '01')
				assert.equal(v2, 2, '02')
				assert.equal(v3, 3, '03')
				done()
			}).catch(done)
		})
	})

	describe('subscribe edge cases', () => {
		it('20 - subscribe should handle values matching multiple rules', done => {
			const source = new Channel()
			const evenChan = new Channel()
			const positiveChan = new Channel()

			subscribe(source, [
				{ chan: evenChan, rule: data => data % 2 === 0 },
				{ chan: positiveChan, rule: data => data > 0 }
			])

			source.put(2) // matches both
			source.put(-3) // matches neither

			const evens = []
			const positives = []

			co(function *() {
				evens.push(yield evenChan.take())
			})

			co(function *() {
				positives.push(yield positiveChan.take())
			})

			delay(20).then(() => {
				assert.equal(evens.length, 1, '01')
				assert.equal(evens[0], 2, '02')
				assert.equal(positives.length, 1, '03')
				assert.equal(positives[0], 2, '04 - 2 is both even and positive')
				done()
			}).catch(done)
		})
	})

	describe('delay utility', () => {
		it('21 - delay should resolve after specified time', async () => {
			const start = Date.now()
			await delay(15)
			const elapsed = Date.now() - start
			assert.isOk(elapsed >= 14, `Should wait at least 14ms, got ${elapsed}ms`)
		})

		it('22 - delay should support cancel', async () => {
			const d = delay(5000)
			d.cancel()
			// If cancel works, the promise won't resolve for 5 seconds
			// We just verify cancel doesn't throw
			assert.isOk(true)
		})
	})

	describe('Buffered channel stress', () => {
		it('23 - Should handle buffer size > 2 correctly', done => {
			const chan = new Channel(5)
			const values = []

			co(function *() {
				// Fill buffer
				yield chan.put(1)
				yield chan.put(2)
				yield chan.put(3)
				yield chan.put(4)
				yield chan.put(5)
				// Buffer full, this should block until a take
			}).catch(done)

			co(function *() {
				yield delay(5)
				for (let i = 0; i < 5; i++) {
					values.push(yield chan.take())
				}
				assert.deepEqual(values, [1, 2, 3, 4, 5], '01')
				done()
			}).catch(done)
		})
	})

	describe('CJS backward compatibility', () => {
		it('24 - Should support nested namespace destructuring (v2 style)', () => {
			const pkg = require('../dist/index.cjs')

			// v2-style access
			assert.isOk(pkg.utils, 'utils namespace should exist')
			assert.isOk(pkg.transducer, 'transducer namespace should exist')
			assert.equal(typeof pkg.utils.PubSub, 'function')
			assert.equal(typeof pkg.utils.alts, 'function')
			assert.equal(typeof pkg.utils.merge, 'function')
			assert.equal(typeof pkg.utils.subscribe, 'function')
			assert.equal(typeof pkg.utils.throttle, 'function')
			assert.equal(typeof pkg.utils.timeout, 'function')
			assert.equal(typeof pkg.transducer.map, 'function')
			assert.equal(typeof pkg.transducer.filter, 'function')
			assert.equal(typeof pkg.transducer.reduce, 'function')
			assert.equal(typeof pkg.transducer.compose, 'function')

			// v3-style flat access
			assert.equal(typeof pkg.Channel, 'function')
			assert.equal(typeof pkg.PubSub, 'function')
			assert.equal(typeof pkg.alts, 'function')
			assert.equal(typeof pkg.map, 'function')
			assert.equal(typeof pkg.delay, 'function')
		})
	})
})
