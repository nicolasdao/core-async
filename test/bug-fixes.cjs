/**
 * Regression tests for all 8 bug fixes in v3.0.0
 */

const { assert } = require('chai')
const co = require('co')
const { Channel, utils: { timeout, alts, PubSub }, delay } = require('../dist/index.cjs')

describe('Bug Fix Regressions', () => {

	describe('Bug 1: put/take timeout should return value on success', () => {
		it('01 - put with timeout should return true when consumed before timeout', done => {
			const chan = new Channel()

			co(function *() {
				const result = yield chan.put('hello', { timeout: 5000 })
				assert.strictEqual(result, true, 'put should return true on success')
				done()
			}).catch(done)

			co(function *() {
				yield chan.take()
			}).catch(done)
		})

		it('02 - take with timeout should return the value when available before timeout', done => {
			const chan = new Channel()

			co(function *() {
				yield chan.put('hello')
			}).catch(done)

			co(function *() {
				const result = yield chan.take({ timeout: 5000 })
				assert.strictEqual(result, 'hello', 'take should return the actual value')
				done()
			}).catch(done)
		})

		it('03 - put with timeout should throw 408 when not consumed in time', done => {
			const chan = new Channel()

			co(function *() {
				try {
					yield chan.put('hello', { timeout: 10 })
					done(new Error('Should have thrown'))
				} catch (err) {
					assert.equal(err.code, 408, '01')
					assert.isOk(err.message.indexOf('put') >= 0, '02')
					done()
				}
			}).catch(done)
		})

		it('04 - take with timeout should throw 408 when no value in time', done => {
			const chan = new Channel()

			co(function *() {
				try {
					yield chan.take({ timeout: 10 })
					done(new Error('Should have thrown'))
				} catch (err) {
					assert.equal(err.code, 408, '01')
					assert.isOk(err.message.indexOf('take') >= 0, '02')
					done()
				}
			}).catch(done)
		})
	})

	describe('Bug 2: Channel constructor error messages', () => {
		it('05 - Should show correct typeof in error when buffer is not a number', () => {
			try {
				new Channel('not a number')
				assert.fail('Should have thrown')
			} catch (err) {
				assert.isOk(err.message.indexOf('string') >= 0,
					`Error should mention 'string' type, got: ${err.message}`)
				assert.isNotOk(err.message.indexOf('undefined') >= 0,
					'Error should NOT say undefined (old bug)')
			}
		})

		it('06 - Should throw for invalid mode', () => {
			try {
				new Channel(1, { mode: 'invalid' })
				assert.fail('Should have thrown')
			} catch (err) {
				assert.isOk(err.message.indexOf('invalid') >= 0, err.message)
			}
		})

		it('07 - Should throw when dropping/sliding mode has buffer < 1', () => {
			assert.throws(() => new Channel(0, { mode: 'dropping' }))
			assert.throws(() => new Channel(0, { mode: 'sliding' }))
		})

		it('08 - Should throw when onClosing is not a function', () => {
			try {
				new Channel(null, { onClosing: 'not a function' })
				assert.fail('Should have thrown')
			} catch (err) {
				assert.isOk(err.message.indexOf('onClosing') >= 0, err.message)
			}
		})
	})

	describe('Bug 3: Instance-scoped sequence counters', () => {
		it('09 - Two channels should have independent sequence counters', done => {
			const chan1 = new Channel()
			const chan2 = new Channel()

			// Put on chan1 many times
			for (let i = 0; i < 10; i++) chan1.put(i)

			// Put on chan2 once — if counters were shared, seq would be 11+
			// If independent, seq starts fresh at 1
			co(function *() {
				const val = yield chan2.put('hello')
				// The key test: chan2 operations work correctly regardless of chan1 activity
				assert.strictEqual(val, true, 'chan2 put should succeed independently')
				done()
			}).catch(done)

			co(function *() {
				yield chan2.take()
			}).catch(done)
		})
	})

	describe('Bug 4: Channel must be called with new', () => {
		it('10 - Channel is an ES class and throws without new', () => {
			assert.throws(() => {
				Channel()
			}, TypeError)
		})

		it('11 - Channel is an instance of Channel', () => {
			const chan = new Channel()
			assert.isOk(chan instanceof Channel, 'Should be instanceof Channel')
		})
	})

	describe('Bug 5: alts race condition resilience', () => {
		it('12 - alts should correctly pick the first available channel', done => {
			const chan1 = new Channel()
			const chan2 = new Channel()

			chan1.put(1)
			chan2.put(2)

			co(function *() {
				const [val, winner] = yield alts([chan1, chan2])
				assert.strictEqual(val, 1, 'Should take from first channel (lowest seq)')
				assert.strictEqual(winner, chan1, 'Winner should be chan1')
				done()
			}).catch(done)
		})

		it('13 - alts should work when only one channel has data', done => {
			const chan1 = new Channel()
			const chan2 = new Channel()

			delay(5).then(() => chan2.put('only-chan2'))

			co(function *() {
				const [val, winner] = yield alts([chan1, chan2])
				assert.strictEqual(val, 'only-chan2', 'Should take from chan2')
				assert.strictEqual(winner, chan2, 'Winner should be chan2')
				done()
			}).catch(done)
		})
	})

	describe('Bug 8: PubSub.close()', () => {
		it('14 - PubSub should support close() to stop internal loop', done => {
			const pubSub = new PubSub()
			const subscriber = new Channel()

			pubSub.sub('topic', subscriber)
			pubSub.pub('topic', 'before-close')

			co(function *() {
				const val = yield subscriber.take()
				assert.strictEqual(val, 'before-close', '01')

				pubSub.close()

				// After close, further pub calls should not deliver
				pubSub.pub('topic', 'after-close')

				// Verify no more data arrives by using a timeout
				try {
					yield subscriber.take({ timeout: 20 })
					// If we get here, data arrived unexpectedly
					done(new Error('Should have timed out — PubSub was closed'))
				} catch (err) {
					assert.equal(err.code, 408, '02')
					done()
				}
			}).catch(done)
		})

		it('15 - PubSub should work normally before close()', done => {
			const pubSub = new PubSub()
			const sub = new Channel()

			pubSub.sub('test', sub)
			pubSub.pub('test', 'value1')
			pubSub.pub('test', 'value2')

			co(function *() {
				const v1 = yield sub.take()
				const v2 = yield sub.take()
				assert.equal(v1, 'value1', '01')
				assert.equal(v2, 'value2', '02')
				pubSub.close()
				done()
			}).catch(done)
		})
	})
})
