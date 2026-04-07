/**
 * Copyright (c) 2017-2019, Neap Pty Ltd.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Channel, NOMATCHKEY } from './channel.js'
import { compose, map, filter, reduce } from './transducer.js'
import { PubSub, subscribe, merge, throttle, timeout, alts } from './tools.js'
import { delay } from './utils/promise.js'

// Namespace re-exports for backward compatibility
const transducer = { compose, map, filter, reduce }
const utils = { PubSub, subscribe, merge, throttle, timeout, alts }

export {
	// Core
	Channel,
	NOMATCHKEY,

	// Transducers (flat)
	compose,
	map,
	filter,
	reduce,

	// Utilities (flat)
	PubSub,
	subscribe,
	merge,
	throttle,
	timeout,
	alts,
	delay,

	// Backward-compat namespaces
	transducer,
	utils
}
