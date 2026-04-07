/**
 * A circular buffer with O(1) enqueue/dequeue and automatic growth.
 * Used internally by Channel for push/pull request queues.
 */
export class RingBuffer {
	#buffer
	#head = 0
	#tail = 0
	#size = 0
	#capacity

	constructor(initialCapacity = 32) {
		this.#capacity = initialCapacity
		this.#buffer = new Array(initialCapacity)
	}

	get size() {
		return this.#size
	}

	enqueue(item) {
		if (this.#size === this.#capacity) this.#grow()
		this.#buffer[this.#tail] = item
		this.#tail = (this.#tail + 1) % this.#capacity
		this.#size++
	}

	dequeue() {
		if (this.#size === 0) return undefined
		const item = this.#buffer[this.#head]
		this.#buffer[this.#head] = undefined
		this.#head = (this.#head + 1) % this.#capacity
		this.#size--
		return item
	}

	/**
	 * Peek at the oldest item matching the predicate without removing it.
	 */
	peekValid(predicate) {
		let idx = this.#head
		for (let i = 0; i < this.#size; i++) {
			const item = this.#buffer[idx]
			if (predicate(item)) return item
			idx = (idx + 1) % this.#capacity
		}
		return undefined
	}

	/**
	 * Dequeue the oldest item matching the predicate,
	 * discarding (auto-cleaning) non-matching items encountered along the way.
	 */
	dequeueValid(predicate) {
		while (this.#size > 0) {
			const item = this.dequeue()
			if (predicate(item)) return item
		}
		return undefined
	}

	/**
	 * Find an item matching the predicate without removing it.
	 */
	find(predicate) {
		let idx = this.#head
		for (let i = 0; i < this.#size; i++) {
			const item = this.#buffer[idx]
			if (predicate(item)) return item
			idx = (idx + 1) % this.#capacity
		}
		return undefined
	}

	/**
	 * Remove and return the most recently enqueued item (for dropping mode).
	 */
	removeLast() {
		if (this.#size === 0) return undefined
		this.#tail = (this.#tail - 1 + this.#capacity) % this.#capacity
		const item = this.#buffer[this.#tail]
		this.#buffer[this.#tail] = undefined
		this.#size--
		return item
	}

	#grow() {
		const newCap = this.#capacity * 2
		const newBuf = new Array(newCap)
		for (let i = 0; i < this.#size; i++) {
			newBuf[i] = this.#buffer[(this.#head + i) % this.#capacity]
		}
		this.#buffer = newBuf
		this.#head = 0
		this.#tail = this.#size
		this.#capacity = newCap
	}
}
