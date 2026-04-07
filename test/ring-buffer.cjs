const { assert } = require('chai')

// RingBuffer is not exported from the package, so we test it via the built bundle internals.
// We import it directly from the source ESM and use dynamic import.
let RingBuffer

before(async () => {
	const mod = await import('../dist/index.js')
	// RingBuffer is internal — we test it indirectly through Channel behavior,
	// but also directly by importing the source module
	const rbMod = await import('../src/ring-buffer.js')
	RingBuffer = rbMod.RingBuffer
})

describe('RingBuffer', () => {
	describe('basic operations', () => {
		it('01 - Should enqueue and dequeue items in FIFO order', () => {
			const rb = new RingBuffer(4)
			rb.enqueue('a')
			rb.enqueue('b')
			rb.enqueue('c')

			assert.equal(rb.size, 3, '01')
			assert.equal(rb.dequeue(), 'a', '02')
			assert.equal(rb.dequeue(), 'b', '03')
			assert.equal(rb.dequeue(), 'c', '04')
			assert.equal(rb.size, 0, '05')
		})

		it('02 - Should return undefined when dequeuing from empty buffer', () => {
			const rb = new RingBuffer(4)
			assert.equal(rb.dequeue(), undefined, '01')
			assert.equal(rb.size, 0, '02')
		})

		it('03 - Should track size correctly through enqueue/dequeue cycles', () => {
			const rb = new RingBuffer(4)
			assert.equal(rb.size, 0, '01')
			rb.enqueue(1)
			assert.equal(rb.size, 1, '02')
			rb.enqueue(2)
			assert.equal(rb.size, 2, '03')
			rb.dequeue()
			assert.equal(rb.size, 1, '04')
			rb.dequeue()
			assert.equal(rb.size, 0, '05')
		})
	})

	describe('auto-grow', () => {
		it('04 - Should grow when capacity is exceeded', () => {
			const rb = new RingBuffer(2)
			rb.enqueue('a')
			rb.enqueue('b')
			// This should trigger a grow
			rb.enqueue('c')

			assert.equal(rb.size, 3, '01')
			assert.equal(rb.dequeue(), 'a', '02')
			assert.equal(rb.dequeue(), 'b', '03')
			assert.equal(rb.dequeue(), 'c', '04')
		})

		it('05 - Should handle many items beyond initial capacity', () => {
			const rb = new RingBuffer(2)
			for (let i = 0; i < 100; i++) {
				rb.enqueue(i)
			}
			assert.equal(rb.size, 100, '01')
			for (let i = 0; i < 100; i++) {
				assert.equal(rb.dequeue(), i, `dequeue ${i}`)
			}
			assert.equal(rb.size, 0, '02')
		})
	})

	describe('wrap-around', () => {
		it('06 - Should handle wrap-around correctly', () => {
			const rb = new RingBuffer(4)
			rb.enqueue('a')
			rb.enqueue('b')
			rb.dequeue() // remove 'a', head advances
			rb.dequeue() // remove 'b', head advances
			rb.enqueue('c')
			rb.enqueue('d')
			rb.enqueue('e') // wraps around

			assert.equal(rb.size, 3, '01')
			assert.equal(rb.dequeue(), 'c', '02')
			assert.equal(rb.dequeue(), 'd', '03')
			assert.equal(rb.dequeue(), 'e', '04')
		})
	})

	describe('#peekValid', () => {
		it('07 - Should peek at the first item matching the predicate', () => {
			const rb = new RingBuffer(8)
			rb.enqueue({ id: 1, cancelled: true })
			rb.enqueue({ id: 2, cancelled: false })
			rb.enqueue({ id: 3, cancelled: false })

			const item = rb.peekValid(r => !r.cancelled)
			assert.equal(item.id, 2, '01')
			assert.equal(rb.size, 3, '02 - peek should not remove items')
		})

		it('08 - Should return undefined when no item matches', () => {
			const rb = new RingBuffer(4)
			rb.enqueue({ id: 1, cancelled: true })
			rb.enqueue({ id: 2, cancelled: true })

			const item = rb.peekValid(r => !r.cancelled)
			assert.equal(item, undefined, '01')
		})
	})

	describe('#dequeueValid', () => {
		it('09 - Should dequeue first valid item and discard non-matching ones', () => {
			const rb = new RingBuffer(8)
			rb.enqueue({ id: 1, cancelled: true })
			rb.enqueue({ id: 2, cancelled: true })
			rb.enqueue({ id: 3, cancelled: false })
			rb.enqueue({ id: 4, cancelled: false })

			const item = rb.dequeueValid(r => !r.cancelled)
			assert.equal(item.id, 3, '01')
			assert.equal(rb.size, 1, '02 - cancelled items should be discarded')
		})

		it('10 - Should return undefined when no items match', () => {
			const rb = new RingBuffer(4)
			rb.enqueue({ id: 1, cancelled: true })
			rb.enqueue({ id: 2, cancelled: true })

			const item = rb.dequeueValid(r => !r.cancelled)
			assert.equal(item, undefined, '01')
			assert.equal(rb.size, 0, '02 - all items should be discarded')
		})
	})

	describe('#find', () => {
		it('11 - Should find an item by predicate without removing it', () => {
			const rb = new RingBuffer(8)
			rb.enqueue({ seq: 10, data: 'a' })
			rb.enqueue({ seq: 20, data: 'b' })
			rb.enqueue({ seq: 30, data: 'c' })

			const item = rb.find(r => r.seq === 20)
			assert.equal(item.data, 'b', '01')
			assert.equal(rb.size, 3, '02 - find should not remove items')
		})

		it('12 - Should return undefined when no item matches find', () => {
			const rb = new RingBuffer(4)
			rb.enqueue({ seq: 1 })

			const item = rb.find(r => r.seq === 999)
			assert.equal(item, undefined, '01')
		})
	})

	describe('#removeLast', () => {
		it('13 - Should remove the most recently enqueued item', () => {
			const rb = new RingBuffer(8)
			rb.enqueue('a')
			rb.enqueue('b')
			rb.enqueue('c')

			const removed = rb.removeLast()
			assert.equal(removed, 'c', '01')
			assert.equal(rb.size, 2, '02')
			assert.equal(rb.dequeue(), 'a', '03')
			assert.equal(rb.dequeue(), 'b', '04')
		})

		it('14 - Should return undefined when removing from empty buffer', () => {
			const rb = new RingBuffer(4)
			assert.equal(rb.removeLast(), undefined, '01')
		})
	})
})
