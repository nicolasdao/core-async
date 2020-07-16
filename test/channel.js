/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const co = require('co')
const { Channel, utils: { timeout } } = require('../src')
const { promise: { delay } } = require('../src/utils')

const _ignoreError = () => null

describe('Channel', () => {
	it('01 - Should sync tasks using \'put\' and \'take\' apis.', () => {
		const chn = new Channel()
		const takeDelay = 20
		return new Promise(resolve => {
			const steps = []
			co(function *() {
				steps.push({ id:1, created: Date.now() })
				yield chn.put('hello')
				steps.push({ id:3, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:2, created: Date.now() })
				const message = yield delay(takeDelay).then(() => chn.take())
				steps.push({ id:4, created: Date.now() })
				resolve({ steps, message })
			})
		}).then(({ steps, message }) => {
			assert.equal(message, 'hello', '01')
			assert.equal(steps.length, 4, '02')
			assert.equal(steps[0].id, 1, '03')
			assert.equal(steps[1].id, 2, '04')
			assert.equal(steps[2].id, 3, '05')
			assert.equal(steps[3].id, 4, '06')
			assert.isOk(steps[1].created - steps[0].created >= 0, '07')
			assert.isOk(steps[2].created - steps[1].created >= takeDelay, '08')
			assert.isOk(steps[3].created - steps[2].created >= 0, '09')
		})
			.catch(() => {
				console.log('BOOMM')
			})
	})
	it('02 - Should support timing out', () => {
		const chn = new Channel()
		const takeDelay = 10
		const takeTimeout = 9
		return new Promise(resolve => {
			const steps = []
			co(function *() {
				steps.push({ id:1, created: Date.now() })
				yield chn.put('hello')
				steps.push({ id:4, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:2, created: Date.now() })
				yield delay(takeDelay).then(() => chn.take())
				steps.push({ id:5, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:3, created: Date.now() })
				try {
					const message = yield delay(takeDelay+1).then(() => chn.take({ timeout:takeTimeout }))
					steps.push({ id:6, created: Date.now() })
					resolve({ steps, message })
				} catch(err) {
					steps.push({ error: err, created: Date.now() })
					resolve({ steps, message: null })
				}
			})
		}).then(({ steps, message }) => {
			assert.isNotOk(message, '01')
			assert.equal(steps.length, 6, '02')
			assert.equal(steps.filter(({id}) => id > 0).length, 5, '03')
			assert.equal(steps[0].id, 1, '04')
			assert.equal(steps[1].id, 2, '05')
			assert.equal(steps[2].id, 3, '06')
			assert.equal(steps[3].id, 4, '07')
			assert.equal(steps[4].id, 5, '08')
			assert.isNotOk(steps[5].id, '09')
			assert.isOk(steps[5].error, '10')
			assert.equal(steps[5].error.message, `'take' timed out after ${takeTimeout} ms. No data was taken off the channel.`, '11')
			assert.equal(steps[5].error.code, 408, '11B')
			assert.isOk(steps[1].created - steps[0].created >= 0, '12')
			assert.isOk(steps[2].created - steps[1].created >= 0, '14')
			assert.isOk(steps[3].created - steps[2].created >= takeDelay, '13')
			assert.isOk(steps[4].created - steps[3].created >= 0, '14')
			assert.isOk(steps[5].created - steps[4].created >= takeTimeout, '15')
		})
	})
	it('03 - Should support complex sequence of \'put\' \'take\' and \'timeout\' events', () => {
		const chn = new Channel()
		const takeDelay = 10
		const takeTimeout = 9
		return new Promise(resolve => {
			const steps = []
			co(function *() {
				steps.push({ id:1, created: Date.now() })
				yield chn.put('hello')
				steps.push({ id:7, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:2, created: Date.now() })
				const message = yield delay(takeDelay).then(() => chn.take())
				steps.push({ id:8, created: Date.now(), message })
			})
			co(function *() {
				steps.push({ id:3, created: Date.now() })
				try {
					const message = yield delay(takeDelay+1).then(() => chn.take({ timeout:takeTimeout }))
					steps.push({ id:9, created: Date.now(), message })
				} catch(err) {
					steps.push({ error: err, created: Date.now() })
				}
			})
			const delay2 = takeDelay+takeTimeout+10
			co(function *() {
				steps.push({ id:4, created: Date.now() })
				yield delay(delay2).then(() => chn.put('world'))
				steps.push({ id:10, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:5, created: Date.now() })
				yield delay(delay2).then(() => chn.put('Hooray'))
				steps.push({ id:13, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:6, created: Date.now() })
				const message = yield delay(delay2).then(() => chn.take({ timeout:takeTimeout }))
				steps.push({ id:11, created: Date.now(), message })
				const msg = yield chn.take()
				steps.push({ id:12, created: Date.now(), message:msg })
				yield chn.put('yo', { timeout:takeTimeout })
					.then(() => steps.push({ id:14, created: Date.now() }))
					.catch(err => steps.push({ error:err, created: Date.now() }))

				const [m] = yield [chn.take({ timeout:takeTimeout }), chn.put('finally', { timeout:takeTimeout })]
				steps.push({ id:15, created: Date.now(), message: m })
				resolve(steps)
			})
		}).then(steps => {
			assert.equal(steps.length, 15, '01')
			assert.equal(steps.filter(({id}) => id > 0).length, 13, '02')
			assert.equal(steps[0].id, 1, '03')
			assert.equal(steps[1].id, 2, '04')
			assert.equal(steps[2].id, 3, '05')
			assert.equal(steps[3].id, 4, '06')
			assert.equal(steps[4].id, 5, '07')
			assert.equal(steps[5].id, 6, '08')
			// this deals with the order in which statements are being executed based on the runtime
			try {
				assert.equal(steps[6].id, 8, '09')
			} catch(err) {
				assert.equal(steps[6].id, 7, '09')
				_ignoreError(err)
			}
			try {
				assert.equal(steps[7].id, 7, '10')
			} catch(err) {
				assert.equal(steps[7].id, 8, '10')
				_ignoreError(err)
			}
			assert.equal(steps[9].id, 10, '11')
			assert.equal(steps[10].id, 11, '12')
			// this deals with the order in which statements are being executed based on the runtime
			try {
				assert.equal(steps[11].id, 12, '13')
			} catch (err) {
				assert.equal(steps[11].id, 13, '13')
				_ignoreError(err)
			}
			try {
				assert.equal(steps[12].id, 13, '14')
			} catch(err) {
				assert.equal(steps[12].id, 12, '14')
				_ignoreError(err)
			}
			assert.equal(steps[14].id, 15, '15')
			assert.isNotOk(steps[8].id, '16')
			assert.isNotOk(steps[13].id, '17')
			assert.isOk(steps[8].error, '18')
			assert.equal(steps[8].error.message, `'take' timed out after ${takeTimeout} ms. No data was taken off the channel.`, '19')
			assert.equal(steps[8].error.code, 408, '19B')
			assert.isOk(steps[13].error, '20')
			assert.equal(steps[13].error.message, `'put' timed out after ${takeTimeout} ms. No data was added to the channel.`, '21')
			assert.equal(steps[13].error.code, 408, '21B')
			assert.isOk(steps[1].created - steps[0].created >= 0, '22')
			assert.isOk(steps[2].created - steps[1].created >= 0, '23')
			assert.isOk(steps[3].created - steps[2].created >= 0, '24')
			assert.isOk(steps[4].created - steps[3].created >= 0, '25')
			assert.isOk(steps[5].created - steps[4].created >= 0, '26')
			assert.isOk(steps[6].created - steps[5].created >= takeDelay, '27')
			assert.isOk(steps[7].created - steps[6].created >= 0, '28')
			assert.isOk(steps[8].created - steps[7].created >= 0, '29')
			assert.isOk(steps[9].created - steps[8].created >= 0, '30')
			assert.isOk(steps[10].created - steps[9].created >= 0, '31')
			assert.isOk(steps[11].created - steps[10].created >= 0, '32')
			assert.isOk(steps[12].created - steps[11].created >= 0, '33')
		})
	})
	it('04 - Should support \'sput\' and \'stake\' apis', done => {
		const chn = new Channel()
		new Promise(resolve => {
			const steps = []
			co(function *() {
				steps.push({ id:1, created: Date.now() })
				yield chn.put('hello')
				steps.push({ id:7, created: Date.now() })
			})
			co(function *() {
				steps.push({ id:2, created: Date.now() })
				const v = chn.sput('hello again')
				steps.push({ id:3, created: Date.now(), value:v })
				const data = yield chn.take()
				steps.push({ id:8, created: Date.now(), value:data })
				yield chn.put('world')
			})
			co(function *(){
				steps.push({ id:4, created: Date.now() })
				const v = chn.stake()	
				steps.push({ id:5, created: Date.now(), value: v })
				const v2 = chn.sput('Yep')
				steps.push({ id:6, created: Date.now(), value: v2 })
				const data = yield chn.take()
				steps.push({ id:9, created: Date.now(), value: data })
				const d = yield chn.take()
				steps.push({ id:11, created: Date.now(), value: d })
				resolve(steps)
			})
			delay(20).then(() => {
				const v = chn.sput('finish')
				steps.push({ id:10, created: Date.now(), value: v })
			})
		}).then(steps => {
			assert.equal(steps.length, 11, '01')
			assert.equal(steps.filter(({id}) => id > 0).length, 11, '02')
			assert.equal(steps[0].id, 1, '03')
			assert.equal(steps[1].id, 2, '04')
			assert.equal(steps[2].id, 3, '05')
			assert.equal(steps[3].id, 4, '06')
			assert.equal(steps[4].id, 5, '07')
			assert.equal(steps[5].id, 6, '08')

			// this deals with the order in which statements are being executed based on the runtime
			try {
				assert.equal(steps[6].id, 8, '09')
			} catch(err) {
				assert.equal(steps[6].id, 7, '09')
				_ignoreError(err)
			}
			try {
				assert.equal(steps[7].id, 7, '10')
			} catch(err) {
				assert.equal(steps[7].id, 8, '10')
				_ignoreError(err)
			}

			assert.equal(steps[8].id, 9, '11')
			assert.equal(steps[9].id, 10, '12')
			assert.equal(steps[10].id, 11, '13')
			assert.strictEqual(steps[2].value, false, '14')
			assert.strictEqual(steps[4].value, false, '15')
			assert.strictEqual(steps[5].value, false, '16')
			assert.strictEqual(steps[7].value, 'hello', '17')
			assert.strictEqual(steps[8].value, 'world', '18')
			assert.strictEqual(steps[9].value, true, '19')
			assert.strictEqual(steps[10].value, 'finish', '20')
			done()
		}).catch(done)
	})
	it('05 - Should support buffered Channels', done => {
		new Promise(resolve => {
			const chn = new Channel(1)
			const steps = []
			co(function *() {
				steps.push({ id:1, created: Date.now() })
				yield chn.put('hello')
				steps.push({ id:2, created: Date.now() })
				const data = yield chn.take()
				steps.push({ id:3, created: Date.now(), value:data })
				yield chn.put('world!')
				steps.push({ id:4, created: Date.now() })
				yield chn.put('Are you good?')
				steps.push({ id:6, created: Date.now() })
			})
			co(function *(){
				yield delay(10)
				steps.push({ id:5, created: Date.now() })
				const d1 = yield chn.take()
				steps.push({ id:7, created: Date.now(), value:d1 })
				const d2 = yield chn.take()
				steps.push({ id:8, created: Date.now(), value:d2 })

				assert.equal(steps.length, 8, '01')
				assert.equal(steps.filter(({id}) => id > 0).length, 8, '02')
				assert.equal(steps[0].id, 1, '03')
				assert.equal(steps[1].id, 2, '04')
				assert.equal(steps[2].id, 3, '05')
				assert.equal(steps[3].id, 4, '06')
				assert.equal(steps[4].id, 5, '07')
				assert.equal(steps[5].id, 7, '08')
				assert.equal(steps[6].id, 6, '09')
				assert.equal(steps[7].id, 8, '10')
				assert.strictEqual(steps[2].value, 'hello', '11')
				assert.strictEqual(steps[5].value, 'world!', '12')
				assert.strictEqual(steps[7].value, 'Are you good?', '13')

				resolve()
			}).catch(done)
		}).then(() => {
			const chan = new Channel(2)
			const steps = []
			co(function *(){
				let putCounter = 0
				while(true) {
					++putCounter
					const id = putCounter+10
					yield chan.put(id)
					steps.push({ id, type:'PUT' })
				}
			}).catch(done)

			co(function *(){
				yield delay(10)
				steps.push({ id:1, type:'TAKING' })
				const data = yield chan.take()
				steps.push({ id:2, type:'TAKE', data })
				yield delay(5)
				assert.equal(steps.length, 5, '14')
				assert.equal(steps[0].id, 11, '15')
				assert.equal(steps[0].type, 'PUT', '16')
				assert.equal(steps[1].id, 12, '17')
				assert.equal(steps[1].type, 'PUT', '18')
				assert.equal(steps[2].id, 1, '19')
				assert.equal(steps[2].type, 'TAKING', '20')
				assert.equal(steps[4].id, 13, '21')
				assert.equal(steps[4].type, 'PUT', '22')
				assert.equal(steps[3].id, 2, '23')
				assert.equal(steps[3].type, 'TAKE', '24')
				assert.equal(steps[3].data, 11, '25')

			}).catch(done)
		}).then(() => {
			const chan = new Channel(2)
			const steps = []

			let putCounter = 0
			chan.put(++putCounter) // 1
			chan.put(++putCounter) // 2
			chan.put(++putCounter) // 3
			chan.put(++putCounter) // 4
			chan.put(++putCounter) // 5

			co(function *(){
				while(true) {
					++putCounter
					yield chan.put(putCounter)  // 6
					steps.push({ id:putCounter, type:'PUT' })
				}
			}).catch(done)

			co(function *(){
				let d = yield chan.take() // 1
				steps.push({ id:1, type:'TOOK', d })
				d = yield chan.take() // 2
				steps.push({ id:2, type:'TOOK', d })
				d = yield chan.take() // 3
				steps.push({ id:3, type:'TOOK', d })
				d = yield chan.take() // 4
				steps.push({ id:4, type:'TOOK', d })
				d = yield chan.take() // 5
				steps.push({ id:5, type:'TOOK', d })
				d = yield chan.take() // 6
				steps.push({ id:6, type:'TOOK', d })
				d = yield chan.take() // 7
				steps.push({ id:7, type:'TOOK', d })
				d = yield chan.take() // 8
				steps.push({ id:8, type:'TOOK', d })

				assert.equal(steps[0].id, 1, 'A-01')
				assert.equal(steps[0].type, 'TOOK', 'A-02')
				assert.equal(steps[0].d, 1, 'A-03')

				assert.equal(steps[1].id, 2, 'A-04')
				assert.equal(steps[1].type, 'TOOK', 'A-05')
				assert.equal(steps[1].d, 2, 'A-06')
				
				assert.equal(steps[2].id, 3, 'A-07')
				assert.equal(steps[2].type, 'TOOK', 'A-08')
				assert.equal(steps[2].d, 3, 'A-09')
				
				assert.equal(steps[3].id, 4, 'A-12')
				assert.equal(steps[3].type, 'TOOK', 'A-13')
				assert.equal(steps[3].d, 4, 'A-14')

				assert.equal(steps[4].id, 6, 'A-10')
				assert.equal(steps[4].type, 'PUT', 'A-11')
				
				assert.equal(steps[5].id, 5, 'A-17')
				assert.equal(steps[5].type, 'TOOK', 'A-18')
				assert.equal(steps[5].d, 5, 'A-19')
				
				assert.equal(steps[6].id, 7, 'A-15')
				assert.equal(steps[6].type, 'PUT', 'A-16')
				
				assert.equal(steps[7].id, 6, 'A-22')
				assert.equal(steps[7].type, 'TOOK', 'A-23')
				assert.equal(steps[7].d, 6, 'A-24')
				
				assert.equal(steps[8].id, 8, 'A-20')
				assert.equal(steps[8].type, 'PUT', 'A-21')
				
				assert.equal(steps[9].id, 7, 'A-27')
				assert.equal(steps[9].type, 'TOOK', 'A-28')
				assert.equal(steps[9].d, 7, 'A-29')
				
				assert.equal(steps[10].id, 9, 'A-25')
				assert.equal(steps[10].type, 'PUT', 'A-26')
				
				assert.equal(steps[11].id, 8, 'A-32')
				assert.equal(steps[11].type, 'TOOK', 'A-33')
				assert.equal(steps[11].d, 8, 'A-34')

				done()
			}).catch(done)

		}).catch(done)
	})
	it('06 - Should let a \'take\' release the next blocked \'put\' if the current \'put\' was immediately released', (done) => {
		const chan = new Channel(1)
		const steps = []
		co(function *(){
			steps.push({ id: 0 })
			yield chan.put('ok 1')
			steps.push({ id: 1 })
			yield delay(10)
			yield chan.take()
			steps.push({ id: 2 })
		})
		co(function *(){
			yield delay(5)
			yield chan.put('ok 2')
			steps.push({ id: 3 })
			yield chan.take()
			steps.push({ id: 4 })
			try {
				assert.equal(steps.length, 5, '01')
				assert.strictEqual(steps[0].id, 0, '02')
				assert.equal(steps[1].id, 1, '03')
				assert.equal(steps[2].id, 2, '04')
				assert.equal(steps[3].id, 3, '05')
				assert.equal(steps[4].id, 4, '06')
				done()
			}
			catch(err) {
				done(err)
			}
		})
	})
	it('07 - Should support closing a channel. When the channel is closed, \'put\' and \'take\' ops return immediately with respectively false and null.', (done) => {
		const chan  = new Channel()
		const putValues = []
		const takeValues = []
		
		assert.isOk(chan.opened, '-03')
		assert.isNotOk(chan.closing, '-02')
		assert.isNotOk(chan.closed, '-01')

		chan.put(1).then(p1 => {
			putValues.push({ id:1, val:p1 })
			assert.strictEqual(p1, false, '00')
		}).catch(done)
		
		co(function *() {	
			const p2 = yield chan.put(2)
			putValues.push({ id:2, val:p2 })
			const p3 = yield chan.put(3)
			putValues.push({ id:3, val:p3 })
		}).catch(done)

		co(function *() {
			chan.close()
			const t1 = yield chan.take()
			takeValues.push({ id:1, val:t1 })
			const t2 = yield chan.take()
			takeValues.push({ id:2, val:t2 })
			const t3 = yield chan.take()
			takeValues.push({ id:3, val:t3 })
			const t4 = yield chan.take()
			takeValues.push({ id:4, val:t4 })

			assert.strictEqual(putValues.length, 3, '01')
			assert.strictEqual(putValues[0].id, 1, '02')
			assert.strictEqual(putValues[0].val, false, '03')
			assert.strictEqual(putValues[1].id, 2, '04')
			assert.strictEqual(putValues[1].val, false, '05')
			assert.strictEqual(putValues[2].id, 3, '06')
			assert.strictEqual(putValues[2].val, null, '07')

			assert.strictEqual(takeValues.length, 4, '08')
			assert.strictEqual(takeValues[0].id, 1, '09')
			assert.strictEqual(takeValues[0].val, null, '10')
			assert.strictEqual(takeValues[1].id, 2, '11')
			assert.strictEqual(takeValues[1].val, null, '12')
			assert.strictEqual(takeValues[2].id, 3, '13')
			assert.strictEqual(takeValues[2].val, null, '14')
			assert.strictEqual(takeValues[3].id, 4, '15')
			assert.strictEqual(takeValues[3].val, null, '16')

			assert.isNotOk(chan.opened, '17')
			assert.isOk(chan.closing, '18')
			assert.isOk(chan.closed, '19')

			done()
		}).catch(done)
	})
	it('08 - Should support closing a channel by putting null', (done) => {
		const chan  = new Channel()
		const putValues = []
		const takeValues = []
		
		chan.put(1).then(p1 => {
			putValues.push({ id:1, val:p1 })
			assert.strictEqual(p1, true, '01')
		}).catch(done)
		
		co(function *() {	
			const p2 = yield chan.put(2)
			putValues.push({ id:2, val:p2 })
			const p3 = yield chan.put(null) // CLOSING
			putValues.push({ id:3, val:p3 })
		}).catch(done)

		co(function *() {
			const t1 = yield chan.take()
			takeValues.push({ id:1, val:t1 })
			const t2 = yield chan.take()
			takeValues.push({ id:2, val:t2 })
			const t3 = yield chan.take()
			takeValues.push({ id:3, val:t3 })
			const t4 = yield chan.take()
			takeValues.push({ id:4, val:t4 })
			const t5 = chan.stake()
			takeValues.push({ id:5, val:t5 })

			assert.strictEqual(putValues.length, 3, '01')
			assert.strictEqual(putValues[0].id, 1, '02')
			assert.strictEqual(putValues[0].val, true, '03')
			assert.strictEqual(putValues[1].id, 2, '04')
			assert.strictEqual(putValues[1].val, true, '05')
			assert.strictEqual(putValues[2].id, 3, '06')
			assert.strictEqual(putValues[2].val, null, '07')

			assert.strictEqual(takeValues.length, 5, '08')
			assert.strictEqual(takeValues[0].id, 1, '09')
			assert.strictEqual(takeValues[0].val, 1, '10')
			assert.strictEqual(takeValues[1].id, 2, '11')
			assert.strictEqual(takeValues[1].val, 2, '12')
			assert.strictEqual(takeValues[2].id, 3, '13')
			assert.strictEqual(takeValues[2].val, null, '14')
			assert.strictEqual(takeValues[3].id, 4, '15')
			assert.strictEqual(takeValues[3].val, null, '16')
			assert.strictEqual(takeValues[4].id, 5, '17')
			assert.strictEqual(takeValues[4].val, false, '18')

			done()
		}).catch(done)
	})
	it('09 - Should support DROPPING channel, i.e., the channels drops new \'put\' if the buffer is full.', done => {
		const chn = new Channel(1, { mode: 'dropping' })
		const steps = []

		co(function *() {
			steps.push({ id:0 })
			const p1 = yield chn.put('hello')
			steps.push({ id:1, value:p1 })
			const p2 = yield chn.put('baby')
			steps.push({ id:2, value:p2 })
			const p3 = yield chn.put('world!')
			steps.push({ id:3, value:p3 })
		})

		co(function *(){
			yield delay(10)
			steps.push({ id:4 })
			const d1 = yield chn.take()
			steps.push({ id:5, value:d1 })
			const d2 = yield chn.take({ timeout: 5 }).catch(err => err)
			steps.push({ id:6, value:d2 })
			
			assert.equal(steps.length, 7, 'LENGTH')
			assert.equal(steps[0].id, 0, '00')
			assert.equal(steps[1].id, 1, '01')
			assert.equal(steps[2].id, 2, '02')
			assert.equal(steps[3].id, 3, '03')
			assert.equal(steps[4].id, 4, '04')
			assert.equal(steps[5].id, 5, '05')
			assert.equal(steps[6].id, 6, '06')

			assert.strictEqual(steps[1].value, true, '07')
			assert.strictEqual(steps[2].value, null, '08')
			assert.strictEqual(steps[3].value, null, '09')
			assert.strictEqual(steps[5].value, 'hello', '09')
			assert.isOk(steps[6].value.message.indexOf('timed out') >= 0, '10')

			done()
		}).catch(done)
	})
	it('10 - Should support SLIDING channel, i.e., the channels drops the oldest \'put\' if the buffer is full.', done => {
		const chn = new Channel(1, { mode:'sliding' })
		const steps = []

		co(function *() {
			steps.push({ id:0 })
			const p1 = yield chn.put('hello')
			steps.push({ id:1, value:p1 })
			const p2 = yield chn.put('baby')
			steps.push({ id:2, value:p2 })
			const p3 = yield chn.put('world!')
			steps.push({ id:3, value:p3 })
		})

		co(function *(){
			yield delay(10)
			steps.push({ id:4 })
			const d1 = yield chn.take()
			steps.push({ id:5, value:d1 })
			const d2 = yield chn.take({ timeout: 5 }).catch(err => err)
			steps.push({ id:6, value:d2 })
			
			assert.equal(steps.length, 7, 'LENGTH')
			assert.equal(steps[0].id, 0, '00')
			assert.equal(steps[1].id, 1, '01')
			assert.equal(steps[2].id, 2, '02')
			assert.equal(steps[3].id, 3, '03')
			assert.equal(steps[4].id, 4, '04')
			assert.equal(steps[5].id, 5, '05')
			assert.equal(steps[6].id, 6, '06')

			assert.strictEqual(steps[1].value, true, '07')
			assert.strictEqual(steps[2].value, true, '08')
			assert.strictEqual(steps[3].value, true, '09')
			assert.strictEqual(steps[5].value, 'world!', '09')
			assert.isOk(steps[6].value.message.indexOf('timed out') >= 0, '10')

			done()
		}).catch(done)
	})
	it('11 - Should support resolving all blocked put immediately after a channel is closed.', (done) => {
		const chan  = new Channel()
		const seq = []
		
		chan.put(1).then(() => {
			const v = seq[0]
			assert.equal(seq.length,1,'01')
			assert.equal(v,1,'02')
			done()
		}).catch(done)
		
		co(function *() {	
			yield timeout(10).take()
			seq.push(1)
			chan.close()
		}).catch(done)

		co(function *() {	
			yield timeout(20).take()
			seq.push(2)
			yield chan.take()
		}).catch(done)
	})
	it('12 - Should support resolving all blocked take immediately after a channel is closed.', (done) => {
		const chan  = new Channel()
		const seq = []
		
		chan.take().then(() => {
			const v = seq[0]
			assert.equal(seq.length,1,'01')
			assert.equal(v,1,'02')
			done()
		}).catch(done)
		
		co(function *() {	
			yield timeout(10).take()
			seq.push(1)
			chan.close()
		}).catch(done)

		co(function *() {	
			yield timeout(20).take()
			seq.push(2)
			yield chan.put(1)
		}).catch(done)
	})
})



