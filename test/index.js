/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

/* global describe */
/* global it */

const { assert } = require('chai')
const co = require('co')
// const { Channel, PubSub, subscribe, alts, merge, timeout, throttle } = require('../src')
const { Channel, timeout, alts, tools } = require('../src')
const { PubSub, subscribe, merge, throttle } = tools
const { promise: { delay } } = require('../src/utils')

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
			assert.equal(steps[6].id, 7, '09')
			assert.equal(steps[7].id, 8, '10')
			assert.equal(steps[9].id, 10, '11')
			assert.equal(steps[10].id, 11, '12')
			assert.equal(steps[11].id, 12, '13')
			assert.equal(steps[12].id, 13, '14')
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
			assert.equal(steps[6].id, 7, '09')
			assert.equal(steps[7].id, 8, '10')
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
		const chn = new Channel(1, 'dropping')
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
		const chn = new Channel(1, 'sliding')
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

describe('PubSub', () => {
	it('01 - Should support publishing new data', done => {
		// 1. Create a new pub/sub publication
		const pubSub = new PubSub()

		// 2. Create some subscribers
		const numberSusbcriber = new Channel()
		const letterSusbcriber = new Channel()
		const universalSusbcriber = new Channel()

		// 3. Subscribe the subscribers to various topics
		pubSub.sub('number', numberSusbcriber)
		pubSub.sub('letter', letterSusbcriber)
		pubSub.sub(['letter', 'number'], universalSusbcriber)

		// 4. Publish data to topics
		pubSub.pub('number', 1)
		pubSub.pub('letter', 'one')
		pubSub.pub('number', 2)
		pubSub.pub('letter', 'two')
		pubSub.pub('number', 3)
		pubSub.pub('letter', 'three')
		pubSub.pub(['number', 'letter'], '4A')
		pubSub.pub('unknown:topic', 'Some value that will never be picked up by anybody because nobody has subscribed to this topic.')

		const numbers = []
		const letters = []
		const all = []
		co(function *(){
			while(true) {
				const data = yield numberSusbcriber.take()
				numbers.push(data)
			}
		})
		co(function *(){
			while(true) {
				const data = yield letterSusbcriber.take()
				letters.push(data)
			}
		})
		co(function *(){
			while(true) {
				const data = yield universalSusbcriber.take()
				all.push(data)
			}
		})

		delay(30).then(() => {
			assert.equal(numbers.length, 4, '01')
			assert.equal(numbers[0], 1, '02')
			assert.equal(numbers[1], 2, '03')
			assert.equal(numbers[2], 3, '04')
			assert.equal(numbers[3], '4A', '05')

			assert.equal(letters.length, 4, '06')
			assert.equal(letters[0], 'one', '07')
			assert.equal(letters[1], 'two', '08')
			assert.equal(letters[2], 'three', '09')
			assert.equal(letters[3], '4A', '10')			

			assert.equal(all.length, 8, '11')
			assert.equal(all[0], 1, '12')
			assert.equal(all[1], 'one', '13')
			assert.equal(all[2], 2, '14')
			assert.equal(all[3], 'two', '15')
			assert.equal(all[4], 3, '16')
			assert.equal(all[5], 'three', '17')
			assert.equal(all[6], '4A', '18')
			assert.equal(all[7], '4A', '19')

			done()
		}).catch(err => done(err))
	})
	it('02 - Should support unsubscribing a subscriber.', done => {
		// 1. Create a new pub/sub publication
		const pubSub = new PubSub()

		// 2. Create some subscribers
		const numberSusbcriber = new Channel()
		const letterSusbcriber = new Channel()
		const universalSusbcriber = new Channel()

		// 3. Subscribe the subscribers to various topics
		pubSub.sub('number', numberSusbcriber)
		pubSub.sub('letter', letterSusbcriber)
		pubSub.sub(['letter', 'number'], universalSusbcriber)

		// 4. Publish data to topics
		pubSub.pub('number', 1)
		pubSub.pub('letter', 'one')
		pubSub.pub('number', 2)

		pubSub.unsub(['letter', 'number'], universalSusbcriber)
		
		pubSub.pub('letter', 'two')
		
		pubSub.unsub('letter', letterSusbcriber)
		
		pubSub.pub('number', 3)
		pubSub.pub('letter', 'three')
		pubSub.pub(['number', 'letter'], '4A')
		pubSub.pub('unknown:topic', 'Some value that will never be picked up by anybody because nobody has subscribed to this topic.')

		const numbers = []
		const letters = []
		const all = []
		co(function *(){
			while(true) {
				const data = yield numberSusbcriber.take()
				numbers.push(data)
			}
		})
		co(function *(){
			while(true) {
				const data = yield letterSusbcriber.take()
				letters.push(data)
			}
		})
		co(function *(){
			while(true) {
				const data = yield universalSusbcriber.take()
				all.push(data)
			}
		})

		delay(30).then(() => {
			assert.equal(numbers.length, 4, '01')
			assert.equal(numbers[0], 1, '02')
			assert.equal(numbers[1], 2, '03')
			assert.equal(numbers[2], 3, '04')
			assert.equal(numbers[3], '4A', '05')

			assert.equal(letters.length, 0, '06')

			assert.equal(all.length, 0, '11')

			done()
		}).catch(err => done(err))
	})
})

describe('#subscribe', () => {
	it('01 - Should subscribe multiple subscriber channels to a source channel', done => {
		const source = new Channel()

		const numberSusbcriber = new Channel()
		const letterSusbcriber = new Channel()

		subscribe(source,[{
			chan: numberSusbcriber,
			rule: data => typeof(data) == 'number'
		}, {
			chan: letterSusbcriber,
			rule: data => typeof(data) == 'string'
		}])

		const numbers = []
		co(function *(){
			while(true) {
				const data = yield numberSusbcriber.take()
				numbers.push(data)
			}
		})

		const letters = []
		co(function *(){
			while(true) {
				const data = yield letterSusbcriber.take()
				letters.push(data)
			}
		})

		const a = [1,'one',2,'two',3,'three']
		a.map(data => source.put(data))

		delay(20).then(() => {
			assert.equal(numbers.length, 3, '01')
			assert.equal(numbers[0], 1, '02')
			assert.equal(numbers[1], 2, '03')
			assert.equal(numbers[2], 3, '04')

			assert.equal(letters.length, 3, '05')
			assert.equal(letters[0], 'one', '06')
			assert.equal(letters[1], 'two', '07')
			assert.equal(letters[2], 'three', '08')

			done()
		}).catch(done)
	})
	it('02 - Should subscribe a single subscriber channel to a source channel', done => {
		const source = new Channel()

		const numberSusbcriber = new Channel()

		subscribe(source,{
			chan: numberSusbcriber,
			rule: data => typeof(data) == 'number'
		})

		const numbers = []
		co(function *(){
			while(true) {
				const data = yield numberSusbcriber.take()
				numbers.push(data)
			}
		})

		const a = [1,'one',2,'two',3,'three']
		a.map(data => source.put(data))

		delay(20).then(() => {
			assert.equal(numbers.length, 3, '01')
			assert.equal(numbers[0], 1, '02')
			assert.equal(numbers[1], 2, '03')
			assert.equal(numbers[2], 3, '04')

			done()
		}).catch(done)
	})
	it('03 - Should stop publishing to subscribers when the source is closed', done => {
		const source = new Channel()

		const numberSusbcriber = new Channel()
		const letterSusbcriber = new Channel()

		subscribe(source,[{
			chan: numberSusbcriber,
			rule: data => typeof(data) == 'number'
		}, {
			chan: letterSusbcriber,
			rule: data => typeof(data) == 'string'
		}])

		const numbers = []
		co(function *(){
			while(true) {
				const data = yield numberSusbcriber.take()
				numbers.push(data)
			}
		})

		const letters = []
		co(function *(){
			while(true) {
				const data = yield letterSusbcriber.take()
				letters.push(data)
			}
		})

		const a = [1,'one',2,'two',null,'three']
		co(function *(){
			for(let i=0;i<a.length;i++)
				yield source.put(a[i])
		})

		delay(20).then(() => {
			assert.equal(numbers.length, 2, '01')
			assert.equal(numbers[0], 1, '02')
			assert.equal(numbers[1], 2, '03')

			assert.equal(letters.length, 2, '04')
			assert.equal(letters[0], 'one', '05')
			assert.equal(letters[1], 'two', '06')

			done()
		}).catch(done)
	})
})

describe('#merge', () => {
	it('01 - Should merge many channels into a one', done => {
		const numberChan = new Channel()
		const letterChan = new Channel()

		const source = merge([numberChan,letterChan])

		numberChan.put(1)
		letterChan.put('one')
		numberChan.put(2)
		letterChan.put('two')
		numberChan.put(3)
		letterChan.put('three')

		co(function *(){
			const v1 = yield source.take()
			const v2 = yield source.take()
			const v3 = yield source.take()
			const v4 = yield source.take()
			const v5 = yield source.take()
			const v6 = yield source.take()

			assert.strictEqual(v1,1,'01')
			assert.strictEqual(v2,'one','02')
			assert.strictEqual(v3,2,'02')
			assert.strictEqual(v4,'two','04')
			assert.strictEqual(v5,3,'03')
			assert.strictEqual(v6,'three','06')

			done()
		}).catch(done)
	})
	it('02 - Should ignore channels that have been closed', done => {
		const numberChan = new Channel()
		const letterChan = new Channel()

		const source = merge([numberChan,letterChan])

		numberChan.put(1)
		letterChan.put('one')
		numberChan.put(null)
		letterChan.put('two')
		numberChan.put(3)
		letterChan.put('three')

		co(function *(){
			const v1 = yield source.take()
			const v2 = yield source.take()
			const v3 = yield source.take()
			const v4 = yield source.take()

			assert.strictEqual(v1,1,'01')
			assert.strictEqual(v2,'one','02')
			assert.strictEqual(v3,'two','03')
			assert.strictEqual(v4,'three','04')

			done()
		}).catch(done)
	})
})

describe('#timeout', () => {
	it('01 - Should create an unbuffered timeout channel that receives a message after a specific amount of time.', done => {
		
		const numberChan = new Channel()

		co(function *() {
			const t = timeout(19)
			let carryOn = true
			const values = []
			while(carryOn) {
				const [v,chan] = yield alts([numberChan,t])
				values.push(v)
				if (chan == t) {
					carryOn = false

					assert.equal(values.length, 4, '01')
					assert.equal(values[0], 1, '02')
					assert.equal(values[1], 2, '03')
					assert.equal(values[2], 3, '04')

					done()
				}
			}
		}).catch(done)
		
		co(function *() {
			let counter = 0
			yield delay(5)
			yield numberChan.put(++counter)
			yield numberChan.put(++counter)
			yield numberChan.put(++counter)
			yield delay(30)
			yield numberChan.put(++counter)
			yield numberChan.put(++counter)
			yield numberChan.put(++counter)
		})
	})
})

describe('#alts', () => {
	it('01 - Should return a 2 dimensional array related to the 1st channel that could successfully \'take\'.', done => {
		const numberChan = new Channel()
		const letterChan = new Channel()

		numberChan.put(1)
		letterChan.put('one')
		numberChan.put(2)
		letterChan.put('two')
		numberChan.put(3)
		letterChan.put('three')

		const steps = []
		const correctLength = 11
		let counter = 0
		co(function *(){
			while (true) {
				const [v,chan] = yield alts([numberChan, letterChan], ++counter)
				steps.push({ v,chan })
				if (steps.length == correctLength) {
					assert.strictEqual(steps[0].v, 1, '01')
					assert.strictEqual(steps[1].v, 'one', '02')
					assert.strictEqual(steps[2].v, 2, '03')
					assert.strictEqual(steps[3].v, 'two', '04')
					assert.strictEqual(steps[4].v, 3, '05')
					assert.strictEqual(steps[5].v, 'three', '06')
					assert.strictEqual(steps[6].v, 'four', '07')
					assert.strictEqual(steps[7].v, 'five', '08')
					assert.strictEqual(steps[8].v, 6, '09')
					assert.strictEqual(steps[9].v, 7, '10')
					assert.strictEqual(steps[10].v, 'eight', '11')

					assert.strictEqual(steps[0].chan, numberChan, '12')
					assert.strictEqual(steps[1].chan, letterChan, '13')
					assert.strictEqual(steps[2].chan, numberChan, '14')
					assert.strictEqual(steps[3].chan, letterChan, '15')
					assert.strictEqual(steps[4].chan, numberChan, '16')
					assert.strictEqual(steps[5].chan, letterChan, '17')
					assert.strictEqual(steps[6].chan, letterChan, '18')
					assert.strictEqual(steps[7].chan, letterChan, '19')
					assert.strictEqual(steps[8].chan, numberChan, '20')
					assert.strictEqual(steps[9].chan, numberChan, '21')
					assert.strictEqual(steps[10].chan, letterChan, '22')

					done()
				} else if (steps.length > correctLength)
					assert.equal(steps.length, correctLength, '12')
			}
		}).catch(done)

		delay(17).then(() => letterChan.put('eight'))
		delay(2).then(() => letterChan.put('four'))
		delay(8).then(() => numberChan.put(6))
		delay(5).then(() => letterChan.put('five'))
		delay(13).then(() => numberChan.put(7))

		delay(50).then(() => assert.equal(steps.length, correctLength, '12')).catch(done)
	})
	// it('02 - Should ignore channels that have been closed.', done => {
	// 	const numberChan = new Channel()
	// 	const letterChan = new Channel()

	// 	numberChan.put(1)
	// 	letterChan.put('one')
	// 	numberChan.put(2)
	// 	letterChan.put('two')
	// 	numberChan.put(3)
	// 	letterChan.put(null)

	// 	const steps = []
	// 	const correctLength = 7
	// 	co(function *(){
	// 		while (true) {
	// 			const [v,chan] = yield alts([numberChan, letterChan])

	// 			steps.push({ v,chan })
	// 			if (steps.length == correctLength) {
	// 				assert.strictEqual(steps[0].v, 1, '01')
	// 				assert.strictEqual(steps[1].v, 'one', '02')
	// 				assert.strictEqual(steps[2].v, 2, '03')
	// 				assert.strictEqual(steps[3].v, 'two', '04')
	// 				assert.strictEqual(steps[4].v, 3, '05')
	// 				assert.strictEqual(steps[5].v, 6, '06')
	// 				assert.strictEqual(steps[6].v, 7, '07')

	// 				assert.strictEqual(steps[0].chan, numberChan, '08')
	// 				assert.strictEqual(steps[1].chan, letterChan, '09')
	// 				assert.strictEqual(steps[2].chan, numberChan, '10')
	// 				assert.strictEqual(steps[3].chan, letterChan, '11')
	// 				assert.strictEqual(steps[4].chan, numberChan, '12')
	// 				assert.strictEqual(steps[5].chan, numberChan, '13')
	// 				assert.strictEqual(steps[6].chan, numberChan, '14')

	// 				done()
	// 			} else if (steps.length > correctLength)
	// 				assert.equal(steps.length, correctLength, '15')
	// 		}
	// 	}).catch(done)

	// 	delay(17).then(() => letterChan.put('eight'))
	// 	delay(2).then(() => letterChan.put('four'))
	// 	delay(8).then(() => numberChan.put(6))
	// 	delay(5).then(() => letterChan.put('five'))
	// 	delay(13).then(() => numberChan.put(7))

	// 	delay(50).then(() => assert.equal(steps.length, correctLength, '15')).catch(done)
	// })
	it('03 - Should supports the timeout scenario.', done => {
		const numberChan = new Channel()
		let d = false
		// 1. Keeps adding number forever
		co(function *(){
			let counter = 0
			while(true) {
				yield numberChan.put(++counter)
			}
		})

		// 2. Exit the process after 3 seconds.
		co(function *() {
			const t = timeout(15)
			let carryOn = true
			while(carryOn) {
				const [,chan] = yield alts([numberChan,t])
				// Checks which channel has returned. If this is the 'timeout' channel, then stop.
				carryOn = chan != t
			}
			d = true
			done()
		})

		co(function *() {
			yield timeout(25).take()
			if (!d)
				done(new Error('Should have time out after 15 ms.'))
		})
	})
})

describe('#throttle', () => {
	it('01 - Should throttles concurrent tasks.', done => {
		
		const tasks = [
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now()),
			() => delay(20).then(() => Date.now())
		]

		throttle(tasks, 3).then(results => {
			assert.equal(results.length, 9, '01')
			assert.strictEqual(Math.abs(results[0]-results[1]) < 5, true, '02')
			assert.strictEqual(Math.abs(results[1]-results[2]) < 5, true, '03')
			assert.strictEqual(Math.abs(results[2]-results[3]) > 18, true, '04')
			assert.strictEqual(Math.abs(results[3]-results[4]) < 5, true, '05')
			assert.strictEqual(Math.abs(results[4]-results[5]) < 5, true, '06')
			assert.strictEqual(Math.abs(results[5]-results[6]) > 10, true, '07')
			assert.strictEqual(Math.abs(results[6]-results[7]) < 5, true, '08')
			assert.strictEqual(Math.abs(results[7]-results[8]) < 5, true, '09')
			done()
		}).catch(done)
	})
})



