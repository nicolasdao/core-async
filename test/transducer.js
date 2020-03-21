/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const co = require('co')

const { Channel, transducer:{ compose, map, filter, reduce } } = require('../src')

describe('transducer', () => {
	describe('#map', () => {
		it('01 - Should map bricks.', done => {
			const chan = new Channel(map(x => x+1))
			
			co(function *(){
				yield chan.put(1)
				yield chan.put(2)
				yield chan.put(3)
			})

			co(function *(){
				const a = yield chan.take()
				const b = yield chan.take()
				const c = yield chan.take()
				assert.equal(a, 2, '01')
				assert.equal(b, 3, '02')
				assert.equal(c, 4, '03')
				done()
			}).catch(done)
		})
		it('02 - Should support Promises.', done => {
			const chan = new Channel(map(x => Promise.resolve(x+1)))
			
			co(function *(){
				yield chan.put(1)
				yield chan.put(2)
				yield chan.put(3)
			})

			co(function *(){
				const a = yield chan.take()
				const b = yield chan.take()
				const c = yield chan.take()
				assert.equal(a, 2, '01')
				assert.equal(b, 3, '02')
				assert.equal(c, 4, '03')
				done()
			}).catch(done)
		})
	})
	describe('#filter', () => {
		it('01 - Should filter bricks.', done => {
			const chan = new Channel(filter(x => x > 1))
			
			co(function *(){
				let status = yield chan.put(1)
				assert.strictEqual(status, false, '01')
				status = yield chan.put(2)
				assert.strictEqual(status, true, '02')
				status = yield chan.put(3)
				assert.strictEqual(status, true, '03')
			}).catch(done)

			co(function *(){
				const a = yield chan.take()
				const b = yield chan.take()
				assert.equal(a, 2, '04')
				assert.equal(b, 3, '05')
				done()
			}).catch(done)
		})
		it('02 - Should support Promises.', done => {
			const chan = new Channel(filter(x => Promise.resolve(null).then(() => x > 1)))
			
			co(function *(){
				let status = yield chan.put(1)
				assert.strictEqual(status, false, '01')
				status = yield chan.put(2)
				assert.strictEqual(status, true, '02')
				status = yield chan.put(3)
				assert.strictEqual(status, true, '03')
			}).catch(done)

			co(function *(){
				const a = yield chan.take()
				const b = yield chan.take()
				assert.equal(a, 2, '04')
				assert.equal(b, 3, '05')
				done()
			}).catch(done)
		})
	})
	describe('#reduce', () => {
		it('01 - Should reduce bricks.', done => {
			const chan = new Channel(reduce((acc, x, idx) => {
				return { total:acc.total+x, idx }
			}, { total:0 }))
			
			co(function *(){
				yield chan.put(1)
				yield chan.put(2)
				yield chan.put(3)
			})

			co(function *(){
				const a = yield chan.take()
				const b = yield chan.take()
				const c = yield chan.take()
				assert.equal(a.total, 1, '01')
				assert.equal(a.idx, 0, '02')
				assert.equal(b.total, 3, '03')
				assert.equal(b.idx, 1, '04')
				assert.equal(c.total, 6, '05')
				assert.equal(c.idx, 2, '06')
				done()
			}).catch(done)
		})
	})
	describe('#compose', () => {
		it('01 - Should transform bricks based on composed transducers.', done => {
			const chan = new Channel(compose(
				filter(x => x > 1),
				map(x => x+10),
				filter(x => x<13)
			))
			
			co(function *(){
				yield chan.put(1)
				yield chan.put(2)
				yield chan.put(3)
			})

			co(function *(){
				const a = yield chan.take()
				assert.equal(a, 12, '01')
				done()
			}).catch(done)
		})
	})
})




