const co = require('co')
const { promise:{ delay }, error: { throwIfNotTruthy, throwIfNotNumber } } = require('./utils')

const DROPPING_TYPE = 'dropping'
const SLIDING_TYPE = 'sliding'
const CHANNEL_TYPES = { default:true, dropping:true, sliding:true }
/**
 * Channel object
 * 
 * @param  {Number}   buffer 		[description]
 * @param  {Number}   type 			Valid types: 'default' (default), 'dropping', 'sliding'
 * @return {Function} chan.put 		[description]
 * @return {Function} chan.sput 	[description]
 * @return {Function} chan.take 	[description]
 * @return {Function} chan.stake 	[description]
 */
const Channel = function(buffer,type) {
	/**
	 * ALGORITHM EXPLANATION
	 * =====================
	 * This channel implementation 4 components:
	 * 		1. _chanBuffer: 		Number stricly greater or equal to 0 (default) which determines the number of PUT 
	 * 								requests that can resolve immediately without waiting for a TAKE request. For example:
	 * 								
	 * 									- 0(default), means that all PUT request will only resolve when a TAKE request is or was
	 * 									  issued (i.e., the _takeRequestQueue has at least one item). If there is no TAKE request
	 * 									  available when a PUT request occurs, the PUT request is stored onto the _putRequestQueue. 
	 * 									  Each PUT request will have a 'dispatched' value set to false, meaning the PUT request is 
	 * 									  waiting for a TAKE request to be resolved.
	 * 									  
	 * 									- 2 means that there can be up to 2 PUT requests that will resolve immediately without 
	 * 									  needing any items on the _takeRequestQueue. The 2 PUT requests will still be stored in the
	 * 									  _putRequestQueue, but their 'dispatched' value will be set to true. If the PUT request 
	 * 									  throughput exceeds the TAKE request throughput, the buffer will be exceeded, at which time,
	 * 									  the additional PUT requests stored on the _putRequestQueue will have a 'dispatched' value 
	 * 									  set to false.
	 * 									  
	 * 		2. _putRequestQueue 	Array that stores PUT requests that could not be resolved due to the unavailibility of any TAKE request
	 * 		3. _takeRequestQueue 	Array that stores TAKE requests that could not be resolved due to the unavailibility of any PUT request
	 * 		4. _dataQueue 			Array that stored PUT request's brick. A PUT request always resolves to adding a brick onto that queue,
	 * 								while a TAKE request always resolve to taking out a brick from that queue.
	 *
	 * The code coordinates the synchronization of the data transfer between those 4 components.
	 */
	
	if (!CHANNEL_TYPES[type])
		type = 'default'

	// 1. Defines _chanBuffer
	const _chanBuffer = buffer && buffer > 0 ? buffer : 0
	
	// 2. Defines _putRequestQueue to manage PUT requests
	let _putRequestQueueSize = 0
	const _putRequestQueue = {
		data: [],
		// Full does not mean we can't add more to it. It means it has reached the _chanBuffer
		isFull:() => _putRequestQueueSize >= _chanBuffer,
		isNotEmpty: () => _putRequestQueueSize > 0,
		increment: () => ++_putRequestQueueSize,
		decrement: () => _putRequestQueueSize > 0 ? --_putRequestQueueSize : 0,
	}
	const _queuePutRequest = data => {
		_putRequestQueue.data.push({ data })
		_putRequestQueue.increment()
		return _putRequestQueue.data.length - 1
	} 
	const _unqueuePutRequest = () => {
		const brick = _putRequestQueue.data.splice(0,1)[0]
		if (brick) { // Check if the brick exists
			_putRequestQueue.decrement()
			return brick.data
		} else // The brick has been cancelled, try to get the next brick
			return _unqueuePutRequest()
	}
	const _cancelPutRequest = requestIdx => {
		if (_putRequestQueue.data[requestIdx] === undefined)
			return 
		_putRequestQueue.data[requestIdx] = null
		_putRequestQueue.decrement()
	}
	// used for SLIDING channels
	const _cancelOldestPutRequest = () => {
		let requestIdx = _putRequestQueue.data.findIndex(r => r)
		if (requestIdx >= 0) {
			_putRequestQueue.data[requestIdx] = null
			_putRequestQueue.decrement()
		}
	}
	const _dispatchNextPutRequest = () => {
		const { data } = _putRequestQueue.data.find(({ data }) => data && !data.dispatched) || {}
		if (data && data.execWhenFreeBuffer) {
			data.execWhenFreeBuffer()
			data.dispatched = true
		}
	}

	// 3. Defines _takeRequestQueue to manage TAKE requests
	let _takeRequestQueueSize = 0
	const _takeRequestQueue = {
		data: [],
		isNotEmpty: () => _takeRequestQueueSize > 0,
		increment: () => ++_takeRequestQueueSize,
		decrement: () => _takeRequestQueueSize > 0 ? --_takeRequestQueueSize : 0,
	}
	const _queueTakeRequest = data => {
		_takeRequestQueue.data.push({ data })
		_takeRequestQueue.increment()
		return _takeRequestQueue.data.length - 1
	} 
	const _unqueueTakeRequest =  () => {
		const brick = _takeRequestQueue.data.splice(0,1)[0]
		if (brick) { // Check if the brick exists
			_takeRequestQueue.decrement()
			return brick.data
		} else // The brick has been cancelled, try to get the next brick
			return _unqueueTakeRequest()
	}
	const _cancelTakeRequest = requestIdx => {
		if (_takeRequestQueue.data[requestIdx] === undefined)
			return 
		_takeRequestQueue.data[requestIdx] = null
		_takeRequestQueue.decrement()
	} 
	
	// 4. Defines _dataQueue to store PUT bricks before they are transfered to TAKE request
	const _dataQueue = []
	const _queueData = data => {
		_dataQueue.push({ data })
		return _dataQueue.length - 1
	} 
	const _enqueueData = () => {
		const brick = _dataQueue.splice(0,1)[0]
		if (brick) 
			return brick.data
		else
			return _enqueueData()
	}

	let _isClosed = false

	/**
	 * [description]
	 * @param  {Function} execPut 				[description]
	 * @param  {Function} execWhenFreeBuffer 	[description]
	 * @param  {Boolean}  simple 				Default false. Simple mode
	 * @return {Int}       						Index representing the location of the 'putFn' in the put queue. 
	 *                                			Null means that 'putFn' was executed immediately and therefore, not added to the put queue.
	 *                                		 	If simple mode is on ('options.simple' is true), then -1 means could not proceed
	 */
	const _tryToPut = ({ execPut, execWhenFreeBuffer, execWhenDroppingOrSliding, simple }) => {
		// 1. No need to wait, there is a 'TAKE' ready to process the 'PUT' now
		if (_takeRequestQueue.isNotEmpty()) {
			// 1.1. PUT on the buffer. This function is what's resolve the pending PUT promise
			execPut()
			// 1.2. TAKE from the buffer
			const executePendingTake = _unqueueTakeRequest()
			executePendingTake() // This function is what's resolve the pending TAKE promise
			
			if (_putRequestQueue.isNotEmpty() && _putRequestQueue.isFull())
				_dispatchNextPutRequest()
			
			return null
		}
		// 2. There is no 'TAKE' yet, so add that 'PUT' request on the queue 
		else if (!simple) {
			const chanBufferNotFull = !_putRequestQueue.isFull()
			const dispatchNow = chanBufferNotFull
			if (chanBufferNotFull) {
				execWhenFreeBuffer() // This function is what's resolve the pending PUT promise
				return _queuePutRequest({ execPut, dispatched:dispatchNow, execWhenFreeBuffer })
			}
			else if (type == DROPPING_TYPE) {
				execWhenDroppingOrSliding()
				return -1
			} else if (type == SLIDING_TYPE) {
				_cancelOldestPutRequest()
				execWhenFreeBuffer() 
				return _queuePutRequest({ execPut, dispatched:dispatchNow, execWhenFreeBuffer })
			} else 
				return _queuePutRequest({ execPut, dispatched:dispatchNow, execWhenFreeBuffer })
		}
		else
			return -1
	}

	/**
	 * [description]
	 * @param  {Function} execTake 	[description]
	 * @param  {Boolean}  simple 	Default false. Simple mode
	 * @return {Int}       			Index representing the location of the 'takeFn' in the take queue. 
	 *                         		Null means that 'takeFn' was executed immediately and therefore, not added to the take queue.
	 *                         		If simple mode is on ('options.simple' is true), then -1 means could not proceed
	 */
	const _tryToTake = ({ execTake, simple, execWhenClosed }) => {
		// 1. No need to wait, there is a 'PUT' ready to process the 'TAKE' now
		if (_putRequestQueue.isNotEmpty()) {
			// 1.1. Take the first(oldest) PUT from the waiting queue
			const { execPut:executePendingPut } = _unqueuePutRequest()
			executePendingPut() // This function is what's resolve the pending PUT promise
			// 1.2. Execute the current TAKE
			execTake() 
			
			// This condition might seem redundant, but when there is no buffer, the put request queue is 
			// empty and full at the same time.
			if (_putRequestQueue.isNotEmpty() && _putRequestQueue.isFull())
				_dispatchNextPutRequest()

			return null
		// 2. If closed, then return null immediately
		} else if (_isClosed) {
			if (!simple)
				execWhenClosed()
			return null
		}
		// 2. There is no 'TAKE' yet, so add that 'PUT' request on the queue 
		else if (!simple)
			return _queueTakeRequest(execTake)
		else 
			return -1
	}

	/**
	 * [description]
	 * @param  {Object}  data    			[description]
	 * @param  {Number}  options.timeout 	[description]
	 * @return {Boolean} result        		[description]
	 * @error  {String}  error.message     	[description]
	 * @error  {Number}  error.code     	408 means timeout
	 */
	this.put = (data, options) => {
		options = options || {}
		
		// 1. Check if the channel must be closed
		if (data === null)
			_isClosed = true 

		// 2. If the channel is closed, then return now and don't PUT anything
		if (_isClosed) 
			return Promise.resolve(null)

		let pushPutIndex = null

		// 3. Try to PUT now
		const tryToPut = new Promise(resolve => {
			pushPutIndex = _tryToPut({
				execPut: () => {
					_queueData(data)
					resolve(true)
				},
				execWhenFreeBuffer: () => resolve(true),
				execWhenDroppingOrSliding: () => resolve(null)
			})
		})

		const tasks = [tryToPut]

		const { timeout } = options 
		const errorCode = Date.now()
		
		// 4. If a 'timeout' is specified, create a promise that will always return with the timeout period
		if (timeout)
			tasks.push(delay(timeout).then(() => ({ error: { message: 'timeout', code: errorCode } })))

		// 5. Let's see who comes back first: the 'timeout' promise or the '_tryToPut'.
		return Promise.race(tasks).then(resp => {
			if (resp && resp.error && resp.error.message == 'timeout' && resp.error.code === errorCode) {
				if (pushPutIndex !== null)
					_cancelPutRequest(pushPutIndex)
				let e = new Error(`'channel.put()' timed out after ${timeout} ms. No data was added to the channel.`)
				e.code = 408
				throw e
			} else
				return resp
		})
	}

	/**
	 * [description]
	 * @param  {Object}  data    [description]
	 * @return {Boolean} result  True means the REQUEST to add data was logged and processed successfully. 
	 *                           False means that the REQUEST was not logged because there was no TAKE to processed it.
	 *                           The REQUEST was ignore and no data was added to the channel.
	 */
	this.sput = (data) => {
		
		// 1. If the channel is closed, then return now and don't PUT anything
		if (_isClosed) 
			return null

		// 2. Try to PUT now execPut, execWhenFreeBuffer, simple
		const pushPutIndex = _tryToPut({ execPut:() => _queueData(data), simple:true })
		return pushPutIndex >= 0
	}

	/**
	 * [description]
	 * @param  {Number}  options.timeout 		[description]
	 * @param  {Boolean} options.cancellable 	[description]
	 * @return {Object}  result    				Boolean or Object. If Object, than that means that the REQUEST to get the object 
	 *                             			 	was logged and then processed successfully. If false, that means that the REQUEST 
	 *                             			  	could not be processed because there was not PUT to grab it. The REQUEST was then ignored.
	 */
	this.take = (options) => {
		options = options || {}
		
		let pushTakeIndex = null
		
		// 1. Try to PUT now 
		const tryToTake = new Promise(resolve => {
			pushTakeIndex = _tryToTake({
				execTake: () => {
					const data = _enqueueData()
					resolve(data)
				},
				execWhenClosed: () => resolve(null)
			})
		})

		const tasks = [tryToTake]

		const { timeout } = options 
		const errorCode = Date.now()
		
		// 2. If a 'timeout' is specified, create a promise that will always return with the timeout period
		if (timeout)
			tasks.push(delay(timeout).then(() => ({ error: { message: 'timeout', code: errorCode } })))

		// 3. Allow to manual cancel this TAKE
		let _cancelled = false
		const cancel = () => {
			if (pushTakeIndex !== null) {
				_cancelled = true
				_cancelTakeRequest(pushTakeIndex)
			}
		}

		// 3. Let's see who comes back first: the 'timeout' promise or the '_tryToTake'.
		const takePromise = Promise.race(tasks).then(resp => {
			if (resp && resp.error && resp.error.message == 'timeout' && resp.error.code === errorCode && !_cancelled) {
				cancel()
				let e = new Error(`'channel.take()' timed out after ${timeout} ms. No data was taken off the channel.`)
				e.code = 408
				throw e
			} else
				return resp
		})

		if (options && options.cancellable)
			return { cancel, takePromise }
		else
			return takePromise
	}

	/**
	 * [description]
	 * @return {Object}  result        		Object added by the 'put' method
	 * @error  {String}  error.message     	[description]
	 * @error  {Number}  error.code    		408 means timeout
	 */
	this.stake = () => {
		// 1. Try to PUT now 
		let data
		const pushTakeIndex = _tryToTake({ execTake:() => { data = _enqueueData() }, simple:true })

		if (pushTakeIndex === -1)
			data = false
		
		if (data)
			return data 
		else if (_isClosed)
			return null 
		else 
			return false
	}

	this.close = () => _isClosed = true
	this.isClosed = () => _isClosed ? true : false 

	return this
}

const alts = (channels) => new Promise(resolve => {
	let _carryOn = true
	const cancels = []
	channels.forEach((chan) => {
		if (_carryOn) {
			const d = chan.stake()
			if (d !== false && d !== null) {
				_carryOn = false 
				resolve([d,chan])
			}
		}
	})
	if (_carryOn) {
		channels.forEach((chan,id) => {
			if (_carryOn) {
				let isNotClosed = true
				co(function *(){
					while(_carryOn && isNotClosed) {
						const { cancel, takePromise } = chan.take({ cancellable:true })
						cancels.push({ id, cancel })
						const data = yield takePromise
						isNotClosed = data !== null
						if (_carryOn && data !== false && data !== null) {
							_carryOn = false 
							cancels.filter(({ id:_id }) => _id !== id ).forEach(({ cancel }) => cancel())
							resolve([data,chan])
						}
					}
				})
			}
		})
	}
})

/**
 * [description]
 * @param  {[Channel]} channels [description]
 * @return {Channel}     		[description]
 */
const merge = channels => {
	throwIfNotTruthy(channels, 'channels')
	if (!Array.isArray(channels))
		throw new Error('Wrong argument exception. \'channels\' must be an array of Channel types.')
	channels.forEach((chan,idx) => {
		if (!(chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'channels[${idx}]' must be a Channel type.`)
	})

	const out = new Channel()

	channels.forEach(chan => {
		co(function *() {
			let channelNotClosed = true
			while(channelNotClosed) {
				const data = yield chan.take()
				if (data === null)
					channelNotClosed = false 
				else
					out.put(data)
			}
		})
	})

	return out
}

/**
 * Returns an unbuffered Channel that will receive a 'timeout' message after a 
 * period of time determined by 'time'
 * 
 * @param  {Number|[Number]} time 	The numbers are in milliseconds. If it is an array, it must contain 2 numbers representing 
 *                                 	an interval used to select a random number
 * @return {Channel}      			[description]
 */
const timeout = time => {
	throwIfNotTruthy(time,'time')
	const isArray = Array.isArray(time)
	if (typeof(time) != 'number' && !isArray)
		throw new Error('Wrong argument exception. \'time\' must either be a number or an 2D array of numbers')

	let t = time
	if (isArray) {
		const t0 = time[0] < 0 ? 0 : time[0]
		const t1 = time[1] < 0 ? 0 : time[1]
		throwIfNotNumber(t0,'time[0]')
		throwIfNotNumber(t1,'time[1]')

		if (t0 > t1)
			throw new Error('Wrong argument exception. \'time[0]\' must be strictly smaller or equal to \'time[1]\'')

		if (t0 == t1)
			t = t0
	} 

	const out = new Channel()
	delay(t).then(() => out.put('timeout'))
	return out
}

/**
 * PubSub object
 * 
 * @return {Function} pubSub.pub 	(topics,value) => [Void] where 'topics' is an array of strings and 'value' is any object that
 *                                	needs to be published on those specific 'topics'.
 * @return {Function} pubSub.sub 	(topics,subscriber) => [Void] where 'topics' is an array of strings and 'subscriber' is a Channel 
 *                                	that listen to published object on those 'topics'.
 */
const PubSub = function() {
	let subscribers = {}
	const publisher = new Channel()

	this.pub = (topics, value) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')

		_topics.filter(x => x).forEach(topic => publisher.put({ topic, value }))
	}
	
	this.sub = (topics, subscriber) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')
		
		throwIfNotTruthy(subscriber,'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!subscribers[topic])
				subscribers[topic] = []
			subscribers[topic].push(subscriber)
		})
	}

	this.unsub = (topics, subscriber) => {
		throwIfNotTruthy(topics,'topics')
		const _topics = typeof(topics) == 'string' ? [topics] : Array.isArray(topics) ? topics : null
		if (!_topics)
			throw new Error('Wrong argument exception. \'topics\' must either be a string or an array of strings.')
		
		throwIfNotTruthy(subscriber,'subscriber')
		if (!(subscriber instanceof Channel))
			throw new Error('Wrong argument exception. \'subscriber\' must be a Channel type.')

		_topics.filter(x => x).forEach(topic => {
			if (!subscribers[topic])
				subscribers[topic] = []
			subscribers[topic] = subscribers[topic].filter(s => s != subscriber)
		})
	}

	co(function *(){
		while(true) {
			const data = yield publisher.take()

			if (data && data.topic && subscribers[data.topic])
				subscribers[data.topic].forEach(subscriber => subscriber.put(data.value))
		}
	})

	return this
}

/**
 * [description]
 * @param  {Channel}  chan        			[description]
 * @param  {Channel}  subscribers[].chan 	[description]
 * @param  {Function} subscribers[].rule 	(data) => [Boolean] where data is a chan's brick
 * @result {Void}
 */
const subscribe = (chan,subscribers) => {
	throwIfNotTruthy(chan,'chan')
	if (!(chan instanceof Channel))
		throw new Error('Wrong argument exception. \'chan\' must be a Channel type.')

	throwIfNotTruthy(subscribers,'subscribers')
	const _subscribers = Array.isArray(subscribers) ? subscribers : [subscribers]
	_subscribers.forEach((subscriber,idx) => {
		throwIfNotTruthy(subscriber,'subscriber')
		throwIfNotTruthy(subscriber.rule,'subscriber.rule')
		throwIfNotTruthy(subscriber.chan,'subscriber.chan')
		if (!(subscriber.chan instanceof Channel))
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].chan' must be a Channel type.`)
		if (typeof(subscriber.rule) != 'function')
			throw new Error(`Wrong argument exception. 'subscriber[${idx}].rule' must be a function.`)
	})

	co(function *(){
		let channelNotClosed = true
		while(channelNotClosed) {
			const data = yield chan.take()
			if (data === null)
				channelNotClosed = false 
			else
				_subscribers.filter(({ rule }) => rule(data)).forEach(({ chan:c }) => c.put(data))
		}
	})
}

module.exports = {
	Channel,
	PubSub,
	subscribe,
	alts,
	merge,
	timeout
}

// EXAMPLE: Take 2 random streams (one with random numbers and another with random letters), and display a message
//          each time we've gathered enough letters to form the word defined in NAME and each time we've gathered
//          enough numbers that add exactly to AGE.

// const getRandomNumber = ({ start, end }) => {
// 	const endDoesNotExist = end === undefined
// 	if (start == undefined && endDoesNotExist)
// 		return Math.random()
	
// 	const _start = start >= 0 ? Math.round(start) : 0
// 	const _end = end >= 0 ? Math.round(end) : 0
// 	const size = endDoesNotExist ? _start : (_end - _start)
// 	const offset = endDoesNotExist ? 0 : _start
// 	return offset + Math.floor(Math.random() * size)
// }

// const randomNumbersGen = () => {
// 	const out = new Channel()
// 	co(function *(){
// 		while (true) {
// 			const n = getRandomNumber({ start:1, end: 50 })
// 			yield delay(100)
// 			yield out.put(n)
// 		}
// 	})
// 	return out
// }


// const randomLettersGen = () => {
// 	const out = new Channel()
// 	const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
// 	const s = letters.length
// 	co(function *(){
// 		while (true) {
// 			const n = getRandomNumber({ start:1, end: s }) - 1			
// 			yield delay(50)
// 			yield out.put(letters[n])
// 		}
// 	})
// 	return out
// }

// const NAME = 'nic'
// const AGE = 37
// const pubSub = chansToPubSub(
// 	[randomNumbersGen(),randomLettersGen()],
// 	[{
// 		topic: 'nic:name',
// 		filter: data => typeof(data) == 'string' && NAME.indexOf(data) >= 0
// 	}, {
// 		topic: 'nic:age',
// 		filter: data => typeof(data) == 'number' && data <= AGE
// 	}]
// )

// const lettersChan = new Channel()
// const numbersChan = new Channel()
// pubSub.sub(['nic:name'], lettersChan)
// pubSub.sub(['nic:age'], numbersChan)

// co(function *(){
// 	let last = ''
// 	let counter = 0
// 	while(true){
// 		const data = yield lettersChan.take()
// 		counter++
// 		const v = last + data
// 		if (NAME.indexOf(v) == 0)
// 			last = v 
// 		if (NAME == last) {
// 			console.log(`It took ${counter} random letters to generate '${NAME}'`)
// 			last = ''
// 			counter = 0
// 		}
// 	}
// })

// co(function *(){
// 	let last = 0
// 	let counter = 0
// 	while(true){
// 		const data = yield numbersChan.take()
// 		counter++
// 		const v = last + data
// 		if (AGE >= v)
// 			last = v 
// 		if (AGE == last) {
// 			console.log(`It took ${counter} random numbers to generate '${AGE}'`)
// 			last = 0
// 			counter = 0
// 		}
// 	}
// })









