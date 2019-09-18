/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

const getRandomNumber = ({ start, end }) => {
	const endDoesNotExist = end === undefined
	if (start == undefined && endDoesNotExist)
		return Math.random()
	
	const _start = start >= 0 ? Math.round(start) : 0
	const _end = end >= 0 ? Math.round(end) : 0
	const size = endDoesNotExist ? _start : (_end - _start)
	const offset = endDoesNotExist ? 0 : _start
	return offset + Math.floor(Math.random() * size)
}

/**
 * Create an empty promise that returns after a certain delay
 * @param  {Number|[Number]} timeout 	If array, it must contain 2 numbers representing an interval used to select a random number
 * @return {Promise}         			[description]
 */
const delay = (timeout) => {
	let tRef
	let finished = false
	let output = Promise.resolve(null).then(() => {
		let t = timeout || 100
		if (Array.isArray(timeout)) {
			if (timeout.length != 2)
				throw new Error('Wrong argument exception. When \'timeout\' is an array, it must contain exactly 2 number items.')

			const start = timeout[0] * 1
			const end = timeout[1] * 1

			if (isNaN(start))
				throw new Error(`Wrong argument exception. The first item of the 'timeout' array is not a number (current: ${timeout[0]})`)

			if (isNaN(end))
				throw new Error(`Wrong argument exception. The second item of the 'timeout' array is not a number (current: ${timeout[1]})`)

			if (start > end)
				throw new Error(`Wrong argument exception. The first number of the 'timeout' array must be strictly smaller than the second number (current: [${timeout[0]}, ${timeout[1]}])`)			

			t = getRandomNumber({ start, end })
		}
		
		return new Promise(onSuccess => {
			tRef = setTimeout(() => {
				finished = true
				onSuccess()
			}, t)
		})
	})

	output.cancel = () => {
		if (!finished)
			clearTimeout(tRef) 
	}

	return output
}

module.exports = {
	delay
}
