# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.1.0](https://github.com/nicolasdao/core-async/compare/v3.0.1...v3.1.0) (2026-04-07)

### Features

* **docs:** Add LLM-optimized documentation (`llms.txt`, `llms-full.txt`) for progressive API discovery by AI assistants via a single fetchable URL

### Chores

* **docs:** Improve before/after examples in README with clear value propositions, complete executable code, and explicit contrast between vanilla JS and core-async
* **docs:** Add LLM documentation callout to README top with copy-pasteable prompt for AI assistants
* **tooling:** Update happyskills to 1.24.2 and disable init-doc, init-mission skills

## [3.0.1](https://github.com/nicolasdao/core-async/compare/v3.0.0...v3.0.1) (2026-04-07)

### Chores

* **license:** Transfer copyright from Neap Pty Ltd to Cloudless Consulting Pty Ltd across LICENSE, README, source files, and test files
* **docs:** Add releasing section to README documenting the `/release` skill workflow
* **tooling:** Add Claude Code skills configuration

## [3.0.0](https://github.com/nicolasdao/core-async/compare/v2.0.6...v3.0.0) (2026-04-07)

### ⚠ BREAKING CHANGES

* **esm:** Package is now ESM-first (`"type": "module"`). CommonJS still works via `require('core-async')` through the `exports` map.
* **co:** `co` is no longer bundled or re-exported. Use native `async/await` instead. Install `co` separately if needed.
* **node:** Minimum Node.js version is now 16.
* **channel:** `Channel` is now an ES class — calling `Channel()` without `new` throws a TypeError.

### Features

* **esm:** Dual ESM + CJS package with `exports` map and conditional resolution ([package.json](./package.json))
* **types:** Ship TypeScript type definitions (`.d.ts`) — no `@types` package needed ([src/index.d.ts](./src/index.d.ts))
* **zero-deps:** Remove `co` from runtime dependencies — zero runtime dependencies
* **exports:** Flat named exports for all APIs (`import { Channel, alts, map } from 'core-async'`) alongside backward-compat `utils`/`transducer` namespaces
* **delay:** `delay` utility now exported at top level
* **pubsub:** `PubSub.close()` method to stop internal event loop and prevent memory leaks
* **ring-buffer:** Internal RingBuffer data structure for O(1) channel queue operations ([src/ring-buffer.js](./src/ring-buffer.js))
* **tests:** 56 new unit tests (29 → 85) covering bug fix regressions, RingBuffer, edge cases, async/await patterns, and ESM imports

### Bug Fixes

* **fn:** `put`/`take` with timeout now returns the correct value on success instead of `undefined` ([src/fn.js](./src/fn.js))
* **channel:** Fix `typeof(number)` typo in constructor error message — now correctly shows `typeof(buffer)` ([src/channel.js](./src/channel.js))
* **channel:** Sequence counters (`#pushCounter`/`#pullCounter`) are now instance-scoped instead of global across all Channel instances ([src/channel.js](./src/channel.js))
* **tools:** `alts` race condition fixed — falls back to next candidate or retries if winner value was consumed between detection and take ([src/tools.js](./src/tools.js))
* **channel:** Listener cleanup uses `.length = 0` instead of unnecessary null/reassign pattern ([src/channel.js](./src/channel.js))
* **channel:** Request queues auto-clean cancelled entries via RingBuffer instead of accumulating unboundedly ([src/channel.js](./src/channel.js))
* **tools:** PubSub internal channel leak fixed — `close()` stops the async loop ([src/tools.js](./src/tools.js))

### Performance

* RingBuffer with O(1) enqueue/dequeue replaces O(n) array `find()`/`splice()` for push/pull request queues
* ES classes for V8 hidden class optimization
* Removed generator/coroutine overhead — native `async/await` throughout

### [2.0.6](https://github.com/nicolasdao/core-async/compare/v2.0.5...v2.0.6) (2022-01-30)


### Bug Fixes

* Moderate issues in the dependency tree ([a4ed83e](https://github.com/nicolasdao/core-async/commit/a4ed83ee3a968146a4b491f98295f05439bfe511))

### [2.0.5](https://github.com/nicolasdao/core-async/compare/v2.0.4...v2.0.5) (2021-10-10)


### Bug Fixes

* remove unecessary logs in the test suite ([a3d1b12](https://github.com/nicolasdao/core-async/commit/a3d1b12f2a24e00830abc22ddcca4257bf988ec0))
* Test fail the sync challange ([44d9cd2](https://github.com/nicolasdao/core-async/commit/44d9cd2ab476d7c9bd4493c86c04a71b6dcbd05f))
* Test fail the sync challange ([7db4d7d](https://github.com/nicolasdao/core-async/commit/7db4d7d636b43540668d21bbcb996ed2c352a4c0))
* Test fail the sync challange ([b9bd466](https://github.com/nicolasdao/core-async/commit/b9bd4664683465da59eb5207df7565a7b11263d6))
* Test fail the sync challange ([881bd84](https://github.com/nicolasdao/core-async/commit/881bd849fc30f9b2c91422ae193f11c2a41f2b2c))
* Vulnerabilities ([bf6a1cc](https://github.com/nicolasdao/core-async/commit/bf6a1cccc0afe90cb71653c23a1cac6e28a385f2))

### [2.0.4](https://github.com/nicolasdao/core-async/compare/v2.0.3...v2.0.4) (2020-07-16)


### Bug Fixes

* Vulnerability ([85250da](https://github.com/nicolasdao/core-async/commit/85250daba4f965e99b070b56eb6a8e5dfcd2be07))

### [2.0.3](https://github.com/nicolasdao/core-async/compare/v2.0.2...v2.0.3) (2020-03-23)


### Bug Fixes

* Cannot cancel timeout ([3b67081](https://github.com/nicolasdao/core-async/commit/3b67081739df0f09428106ae970ef3bbd19daf43))

### [2.0.2](https://github.com/nicolasdao/core-async/compare/v2.0.1...v2.0.2) (2020-03-22)

### [2.0.1](https://github.com/nicolasdao/core-async/compare/v2.0.0...v2.0.1) (2020-03-21)


### Bug Fixes

* Transducers do not support promises. ([21191c2](https://github.com/nicolasdao/core-async/commit/21191c271dd02793666eeec1198e5ea2cec015e7))

## [2.0.0](https://github.com/nicolasdao/core-async/compare/v1.0.5...v2.0.0) (2020-03-21)


### Features

* Add support for transducers ([1bbb771](https://github.com/nicolasdao/core-async/commit/1bbb7716a74d4f7f7753c26537185c5be538aaa7))

### [1.0.5](https://github.com/nicolasdao/core-async/compare/v1.0.4...v1.0.5) (2020-03-18)


### Bug Fixes

* travis deploy + vulnerabilities ([44e681a](https://github.com/nicolasdao/core-async/commit/44e681a540af58de432e577eb73b62b815117091))

### [1.0.4](https://github.com/nicolasdao/core-async/compare/v1.0.3...v1.0.4) (2019-11-28)


### Bug Fixes

* 5 vulnerabilities (1 low, 1 moderate, 3 high) ([77f2fdf](https://github.com/nicolasdao/core-async/commit/77f2fdf85781dd47ade2dca583294f6c739b7c91))

<a name="1.0.3"></a>
## [1.0.3](https://github.com/nicolasdao/core-async/compare/v1.0.2...v1.0.3) (2019-09-24)


### Bug Fixes

* setImmediate does not exist in the browser. ([87600f2](https://github.com/nicolasdao/core-async/commit/87600f2))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/nicolasdao/core-async/compare/v1.0.1...v1.0.2) (2019-09-24)



<a name="1.0.1"></a>
## [1.0.1](https://github.com/nicolasdao/core-async/compare/v1.0.0...v1.0.1) (2019-09-18)


### Bug Fixes

* Closing the timeout channel does not remove the task from the nodejs event loop. ([e923726](https://github.com/nicolasdao/core-async/commit/e923726))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/nicolasdao/core-async/compare/v0.1.1...v1.0.0) (2019-09-18)


### Bug Fixes

* Closing a channel does not immediately release all puts and takes. ([a9f2e7f](https://github.com/nicolasdao/core-async/commit/a9f2e7f))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/nicolasdao/core-async/compare/v0.1.0...v0.1.1) (2019-04-30)



<a name="0.1.0"></a>
# [0.1.0](https://github.com/nicolasdao/core-async/compare/v0.0.5...v0.1.0) (2019-04-30)


### Bug Fixes

* alts can create never ending loops ([dd67155](https://github.com/nicolasdao/core-async/commit/dd67155))



<a name="0.0.5"></a>
## [0.0.5](https://github.com/nicolasdao/core-async/compare/v0.0.4...v0.0.5) (2019-04-02)


### Features

* Add support for throttling ([7240214](https://github.com/nicolasdao/core-async/commit/7240214))



<a name="0.0.4"></a>
## [0.0.4](https://github.com/nicolasdao/core-async/compare/v0.0.3...v0.0.4) (2019-03-04)


### Bug Fixes

* Buffered channel does not unblock PUT after a TAKE occurs ([33be2e1](https://github.com/nicolasdao/core-async/commit/33be2e1))



<a name="0.0.3"></a>
## [0.0.3](https://github.com/nicolasdao/core-async/compare/v0.0.2...v0.0.3) (2019-03-03)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/nicolasdao/core-async/compare/v0.0.1...v0.0.2) (2019-03-03)



<a name="0.0.1"></a>
## 0.0.1 (2019-03-03)


### Features

* Add support for all basic core.async features ([32fe82b](https://github.com/nicolasdao/core-async/commit/32fe82b))
