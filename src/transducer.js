const co = require('co')
const { NOMATCHKEY } = require('./channel')

const compose = (...funcs) => x => co(function *(){
	let v = x
	for(let i=0;i<funcs.length;i++) {
		v = yield funcs[i](v)
		if (v === NOMATCHKEY)
			return v
	}

	return v
})

const reduce = (fn, acc) => {
	let _acc = acc
	let idx = 0
	return x => co(function *() {
		const v = fn(_acc, x, idx)
		if (v && v instanceof Promise)
			_acc = yield v 
		else {
			_acc = v
		}
		idx++
		return _acc
	})
}

const map = fn => reduce((acc, x, idx) => fn(x,idx))
const filter = fn => reduce((acc, x, idx) => co(function *(){
	const v = fn(x,idx)
	let val
	if (v && v instanceof Promise)
		val = yield v
	else
		val = v

	return val ? x : NOMATCHKEY
}))

module.exports = {
	compose,
	map,
	filter,
	reduce
}