export interface ChannelOptions {
	mode?: 'default' | 'dropping' | 'sliding'
	onClosing?: () => void
}

export interface PutOptions {
	timeout?: number
}

export interface TakeOptions {
	timeout?: number
}

export type TransducerFn<TIn = any, TOut = any> = (value: TIn) => TOut | Promise<TOut>

export class Channel<T = any> {
	constructor()
	constructor(buffer: number)
	constructor(transform: TransducerFn)
	constructor(buffer: number, options: ChannelOptions)
	constructor(transform: TransducerFn, options: ChannelOptions)
	constructor(buffer: number, transform: TransducerFn)
	constructor(buffer: number, transform: TransducerFn, options: ChannelOptions)

	readonly opened: boolean
	readonly closed: boolean
	readonly closing: boolean

	put(value: T, options?: PutOptions): Promise<boolean | null>
	take(options?: TakeOptions): Promise<T | null>
	sput(value: T): boolean | Promise<boolean>
	stake(): T | false
	close(): void
}

export const NOMATCHKEY: string

// Transducers
export function compose<T>(...fns: TransducerFn[]): TransducerFn<T>
export function map<TIn, TOut>(fn: (value: TIn, index: number) => TOut | Promise<TOut>): TransducerFn<TIn, TOut>
export function filter<T>(fn: (value: T, index: number) => boolean | Promise<boolean>): TransducerFn<T, T>
export function reduce<T, TAcc>(fn: (acc: TAcc, value: T, index: number) => TAcc | Promise<TAcc>, initial: TAcc): TransducerFn<T, TAcc>

// Utilities
export class PubSub {
	pub(topics: string | string[], value: any): void
	sub(topics: string | string[], subscriber: Channel): void
	unsub(topics: string | string[], subscriber: Channel): void
	close(): void
}

export interface Subscriber<T = any> {
	chan: Channel<T>
	rule: (data: any) => boolean
}

export function subscribe<T>(chan: Channel<T>, subscribers: Subscriber | Subscriber[]): void
export function merge(channels: Channel[]): Channel
export function throttle<T>(tasks: Array<() => T | Promise<T>>, buffer: number): Promise<T[]>
export function timeout(time: number | [number, number]): Channel<'timeout'>
export function alts<T>(channels: Channel<T>[]): Promise<[T, Channel<T>]>
export function delay(timeout: number | [number, number]): Promise<void> & { cancel: () => void }

// Backward-compat namespace re-exports
export const transducer: {
	compose: typeof compose
	map: typeof map
	filter: typeof filter
	reduce: typeof reduce
}
export const utils: {
	PubSub: typeof PubSub
	subscribe: typeof subscribe
	merge: typeof merge
	throttle: typeof throttle
	timeout: typeof timeout
	alts: typeof alts
}
