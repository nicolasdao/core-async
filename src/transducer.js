import { NOMATCHKEY } from './channel.js'

const compose = (...funcs) => async (x) => {
	let v = x
	for (let i = 0; i < funcs.length; i++) {
		v = await funcs[i](v)
		if (v === NOMATCHKEY)
			return v
	}
	return v
}

const reduce = (fn, acc) => {
	let _acc = acc
	let idx = 0
	return async (x) => {
		const v = fn(_acc, x, idx)
		_acc = (v instanceof Promise) ? await v : v
		idx++
		return _acc
	}
}

const map = fn => reduce((acc, x, idx) => fn(x, idx))

const filter = fn => reduce((acc, x, idx) => {
	const v = fn(x, idx)
	const val = (v instanceof Promise) ? v.then(r => r ? x : NOMATCHKEY) : (v ? x : NOMATCHKEY)
	return val
})

export {
	compose,
	map,
	filter,
	reduce
}
