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
		_acc = yield Promise.resolve(null).then(() => fn(_acc, x, idx))
		idx++
		return _acc
	})
}

const map = fn => reduce((acc, x, idx) => fn(x,idx))
const filter = fn => reduce((acc, x, idx) => fn(x,idx) ? x : NOMATCHKEY)

module.exports = {
	compose,
	map,
	filter,
	reduce
}