/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const { assert } = require('chai')
const co = require('co')
const { Channel, utils:{ PubSub, subscribe, throttle, timeout, alts, merge } } = require('../src')
const { promise: { delay } } = require('../src/utils')

describe('utils', () => {
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
				assert.strictEqual(Math.abs(results[2]-results[3]) > 15, true, '04')
				assert.strictEqual(Math.abs(results[3]-results[4]) < 5, true, '05')
				assert.strictEqual(Math.abs(results[4]-results[5]) < 5, true, '06')
				assert.strictEqual(Math.abs(results[5]-results[6]) > 10, true, '07')
				assert.strictEqual(Math.abs(results[6]-results[7]) < 5, true, '08')
				assert.strictEqual(Math.abs(results[7]-results[8]) < 5, true, '09')
				done()
			}).catch(done)
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
})