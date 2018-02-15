(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

var fingerprint = require('./lib/fingerprint.js');
var pad = require('./lib/pad.js');

var c = 0,
  blockSize = 4,
  base = 36,
  discreteValues = Math.pow(base, blockSize);

function randomBlock () {
  return pad((Math.random() *
    discreteValues << 0)
    .toString(base), blockSize);
}

function safeCounter () {
  c = c < discreteValues ? c : 0;
  c++; // this is not subliminal
  return c - 1;
}

function cuid () {
  // Starting with a lowercase letter makes
  // it HTML element ID friendly.
  var letter = 'c', // hard-coded allows for sequential access

    // timestamp
    // warning: this exposes the exact date and time
    // that the uid was created.
    timestamp = (new Date().getTime()).toString(base),

    // Prevent same-machine collisions.
    counter = pad(safeCounter().toString(base), blockSize),

    // A few chars to generate distinct ids for different
    // clients (so different computers are far less
    // likely to generate the same id)
    print = fingerprint(),

    // Grab some more chars from Math.random()
    random = randomBlock() + randomBlock();

  return letter + timestamp + counter + print + random;
}

cuid.slug = function slug () {
  var date = new Date().getTime().toString(36),
    counter = safeCounter().toString(36).slice(-4),
    print = fingerprint().slice(0, 1) +
      fingerprint().slice(-1),
    random = randomBlock().slice(-2);

  return date.slice(-2) +
    counter + print + random;
};

cuid.fingerprint = fingerprint;

module.exports = cuid;

},{"./lib/fingerprint.js":2,"./lib/pad.js":3}],2:[function(require,module,exports){
var pad = require('./pad.js');

var env = typeof window === 'object' ? window : self;
var globalCount = Object.keys(env);
var mimeTypesLength = navigator.mimeTypes ? navigator.mimeTypes.length : 0;
var clientId = pad((mimeTypesLength +
  navigator.userAgent.length).toString(36) +
  globalCount.toString(36), 4);

module.exports = function fingerprint () {
  return clientId;
};

},{"./pad.js":3}],3:[function(require,module,exports){
module.exports = function pad (num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

},{}],4:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.2+97478eb6
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === GET_THEN_ERROR) {
      reject(promise, GET_THEN_ERROR.error);
      GET_THEN_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    return promise.then(function (value) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
    var local = void 0;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":21}],5:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
var wildcard = require('wildcard');
var reMimePartSplit = /[\/\+\.]/;

/**
  # mime-match

  A simple function to checker whether a target mime type matches a mime-type
  pattern (e.g. image/jpeg matches image/jpeg OR image/*).

  ## Example Usage

  <<< example.js

**/
module.exports = function(target, pattern) {
  function test(pattern) {
    var result = wildcard(pattern, target, reMimePartSplit);

    // ensure that we have a valid mime type (should have two parts)
    return result && result.length >= 2;
  }

  return pattern ? test(pattern.split(';')[0]) : test;
};

},{"wildcard":10}],7:[function(require,module,exports){
/**
* Create an event emitter with namespaces
* @name createNamespaceEmitter
* @example
* var emitter = require('./index')()
*
* emitter.on('*', function () {
*   console.log('all events emitted', this.event)
* })
*
* emitter.on('example', function () {
*   console.log('example event emitted')
* })
*/
module.exports = function createNamespaceEmitter () {
  var emitter = {}
  var _fns = emitter._fns = {}

  /**
  * Emit an event. Optionally namespace the event. Handlers are fired in the order in which they were added with exact matches taking precedence. Separate the namespace and event with a `:`
  * @name emit
  * @param {String} event – the name of the event, with optional namespace
  * @param {...*} data – up to 6 arguments that are passed to the event listener
  * @example
  * emitter.emit('example')
  * emitter.emit('demo:test')
  * emitter.emit('data', { example: true}, 'a string', 1)
  */
  emitter.emit = function emit (event, arg1, arg2, arg3, arg4, arg5, arg6) {
    var toEmit = getListeners(event)

    if (toEmit.length) {
      emitAll(event, toEmit, [arg1, arg2, arg3, arg4, arg5, arg6])
    }
  }

  /**
  * Create en event listener.
  * @name on
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.on('example', function () {})
  * emitter.on('demo', function () {})
  */
  emitter.on = function on (event, fn) {
    if (!_fns[event]) {
      _fns[event] = []
    }

    _fns[event].push(fn)
  }

  /**
  * Create en event listener that fires once.
  * @name once
  * @param {String} event
  * @param {Function} fn
  * @example
  * emitter.once('example', function () {})
  * emitter.once('demo', function () {})
  */
  emitter.once = function once (event, fn) {
    function one () {
      fn.apply(this, arguments)
      emitter.off(event, one)
    }
    this.on(event, one)
  }

  /**
  * Stop listening to an event. Stop all listeners on an event by only passing the event name. Stop a single listener by passing that event handler as a callback.
  * You must be explicit about what will be unsubscribed: `emitter.off('demo')` will unsubscribe an `emitter.on('demo')` listener,
  * `emitter.off('demo:example')` will unsubscribe an `emitter.on('demo:example')` listener
  * @name off
  * @param {String} event
  * @param {Function} [fn] – the specific handler
  * @example
  * emitter.off('example')
  * emitter.off('demo', function () {})
  */
  emitter.off = function off (event, fn) {
    var keep = []

    if (event && fn) {
      var fns = this._fns[event]
      var i = 0
      var l = fns.length

      for (i; i < l; i++) {
        if (fns[i] !== fn) {
          keep.push(fns[i])
        }
      }
    }

    keep.length ? this._fns[event] = keep : delete this._fns[event]
  }

  function getListeners (e) {
    var out = _fns[e] ? _fns[e] : []
    var idx = e.indexOf(':')
    var args = (idx === -1) ? [e] : [e.substring(0, idx), e.substring(idx + 1)]

    var keys = Object.keys(_fns)
    var i = 0
    var l = keys.length

    for (i; i < l; i++) {
      var key = keys[i]
      if (key === '*') {
        out = out.concat(_fns[key])
      }

      if (args.length === 2 && args[0] === key) {
        out = out.concat(_fns[key])
        break
      }
    }

    return out
  }

  function emitAll (e, fns, args) {
    var i = 0
    var l = fns.length

    for (i; i < l; i++) {
      if (!fns[i]) break
      fns[i].event = e
      fns[i].apply(fns[i], args)
    }
  }

  return emitter
}

},{}],8:[function(require,module,exports){
!function() {
    'use strict';
    function VNode() {}
    function h(nodeName, attributes) {
        var lastSimple, child, simple, i, children = EMPTY_CHILDREN;
        for (i = arguments.length; i-- > 2; ) stack.push(arguments[i]);
        if (attributes && null != attributes.children) {
            if (!stack.length) stack.push(attributes.children);
            delete attributes.children;
        }
        while (stack.length) if ((child = stack.pop()) && void 0 !== child.pop) for (i = child.length; i--; ) stack.push(child[i]); else {
            if ('boolean' == typeof child) child = null;
            if (simple = 'function' != typeof nodeName) if (null == child) child = ''; else if ('number' == typeof child) child = String(child); else if ('string' != typeof child) simple = !1;
            if (simple && lastSimple) children[children.length - 1] += child; else if (children === EMPTY_CHILDREN) children = [ child ]; else children.push(child);
            lastSimple = simple;
        }
        var p = new VNode();
        p.nodeName = nodeName;
        p.children = children;
        p.attributes = null == attributes ? void 0 : attributes;
        p.key = null == attributes ? void 0 : attributes.key;
        if (void 0 !== options.vnode) options.vnode(p);
        return p;
    }
    function extend(obj, props) {
        for (var i in props) obj[i] = props[i];
        return obj;
    }
    function cloneElement(vnode, props) {
        return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
    }
    function enqueueRender(component) {
        if (!component.__d && (component.__d = !0) && 1 == items.push(component)) (options.debounceRendering || defer)(rerender);
    }
    function rerender() {
        var p, list = items;
        items = [];
        while (p = list.pop()) if (p.__d) renderComponent(p);
    }
    function isSameNodeType(node, vnode, hydrating) {
        if ('string' == typeof vnode || 'number' == typeof vnode) return void 0 !== node.splitText;
        if ('string' == typeof vnode.nodeName) return !node._componentConstructor && isNamedNode(node, vnode.nodeName); else return hydrating || node._componentConstructor === vnode.nodeName;
    }
    function isNamedNode(node, nodeName) {
        return node.__n === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }
    function getNodeProps(vnode) {
        var props = extend({}, vnode.attributes);
        props.children = vnode.children;
        var defaultProps = vnode.nodeName.defaultProps;
        if (void 0 !== defaultProps) for (var i in defaultProps) if (void 0 === props[i]) props[i] = defaultProps[i];
        return props;
    }
    function createNode(nodeName, isSvg) {
        var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
        node.__n = nodeName;
        return node;
    }
    function removeNode(node) {
        var parentNode = node.parentNode;
        if (parentNode) parentNode.removeChild(node);
    }
    function setAccessor(node, name, old, value, isSvg) {
        if ('className' === name) name = 'class';
        if ('key' === name) ; else if ('ref' === name) {
            if (old) old(null);
            if (value) value(node);
        } else if ('class' === name && !isSvg) node.className = value || ''; else if ('style' === name) {
            if (!value || 'string' == typeof value || 'string' == typeof old) node.style.cssText = value || '';
            if (value && 'object' == typeof value) {
                if ('string' != typeof old) for (var i in old) if (!(i in value)) node.style[i] = '';
                for (var i in value) node.style[i] = 'number' == typeof value[i] && !1 === IS_NON_DIMENSIONAL.test(i) ? value[i] + 'px' : value[i];
            }
        } else if ('dangerouslySetInnerHTML' === name) {
            if (value) node.innerHTML = value.__html || '';
        } else if ('o' == name[0] && 'n' == name[1]) {
            var useCapture = name !== (name = name.replace(/Capture$/, ''));
            name = name.toLowerCase().substring(2);
            if (value) {
                if (!old) node.addEventListener(name, eventProxy, useCapture);
            } else node.removeEventListener(name, eventProxy, useCapture);
            (node.__l || (node.__l = {}))[name] = value;
        } else if ('list' !== name && 'type' !== name && !isSvg && name in node) {
            setProperty(node, name, null == value ? '' : value);
            if (null == value || !1 === value) node.removeAttribute(name);
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
            if (null == value || !1 === value) if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase()); else node.removeAttribute(name); else if ('function' != typeof value) if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value); else node.setAttribute(name, value);
        }
    }
    function setProperty(node, name, value) {
        try {
            node[name] = value;
        } catch (e) {}
    }
    function eventProxy(e) {
        return this.__l[e.type](options.event && options.event(e) || e);
    }
    function flushMounts() {
        var c;
        while (c = mounts.pop()) {
            if (options.afterMount) options.afterMount(c);
            if (c.componentDidMount) c.componentDidMount();
        }
    }
    function diff(dom, vnode, context, mountAll, parent, componentRoot) {
        if (!diffLevel++) {
            isSvgMode = null != parent && void 0 !== parent.ownerSVGElement;
            hydrating = null != dom && !('__preactattr_' in dom);
        }
        var ret = idiff(dom, vnode, context, mountAll, componentRoot);
        if (parent && ret.parentNode !== parent) parent.appendChild(ret);
        if (!--diffLevel) {
            hydrating = !1;
            if (!componentRoot) flushMounts();
        }
        return ret;
    }
    function idiff(dom, vnode, context, mountAll, componentRoot) {
        var out = dom, prevSvgMode = isSvgMode;
        if (null == vnode || 'boolean' == typeof vnode) vnode = '';
        if ('string' == typeof vnode || 'number' == typeof vnode) {
            if (dom && void 0 !== dom.splitText && dom.parentNode && (!dom._component || componentRoot)) {
                if (dom.nodeValue != vnode) dom.nodeValue = vnode;
            } else {
                out = document.createTextNode(vnode);
                if (dom) {
                    if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                    recollectNodeTree(dom, !0);
                }
            }
            out.__preactattr_ = !0;
            return out;
        }
        var vnodeName = vnode.nodeName;
        if ('function' == typeof vnodeName) return buildComponentFromVNode(dom, vnode, context, mountAll);
        isSvgMode = 'svg' === vnodeName ? !0 : 'foreignObject' === vnodeName ? !1 : isSvgMode;
        vnodeName = String(vnodeName);
        if (!dom || !isNamedNode(dom, vnodeName)) {
            out = createNode(vnodeName, isSvgMode);
            if (dom) {
                while (dom.firstChild) out.appendChild(dom.firstChild);
                if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                recollectNodeTree(dom, !0);
            }
        }
        var fc = out.firstChild, props = out.__preactattr_, vchildren = vnode.children;
        if (null == props) {
            props = out.__preactattr_ = {};
            for (var a = out.attributes, i = a.length; i--; ) props[a[i].name] = a[i].value;
        }
        if (!hydrating && vchildren && 1 === vchildren.length && 'string' == typeof vchildren[0] && null != fc && void 0 !== fc.splitText && null == fc.nextSibling) {
            if (fc.nodeValue != vchildren[0]) fc.nodeValue = vchildren[0];
        } else if (vchildren && vchildren.length || null != fc) innerDiffNode(out, vchildren, context, mountAll, hydrating || null != props.dangerouslySetInnerHTML);
        diffAttributes(out, vnode.attributes, props);
        isSvgMode = prevSvgMode;
        return out;
    }
    function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
        var j, c, f, vchild, child, originalChildren = dom.childNodes, children = [], keyed = {}, keyedLen = 0, min = 0, len = originalChildren.length, childrenLen = 0, vlen = vchildren ? vchildren.length : 0;
        if (0 !== len) for (var i = 0; i < len; i++) {
            var _child = originalChildren[i], props = _child.__preactattr_, key = vlen && props ? _child._component ? _child._component.__k : props.key : null;
            if (null != key) {
                keyedLen++;
                keyed[key] = _child;
            } else if (props || (void 0 !== _child.splitText ? isHydrating ? _child.nodeValue.trim() : !0 : isHydrating)) children[childrenLen++] = _child;
        }
        if (0 !== vlen) for (var i = 0; i < vlen; i++) {
            vchild = vchildren[i];
            child = null;
            var key = vchild.key;
            if (null != key) {
                if (keyedLen && void 0 !== keyed[key]) {
                    child = keyed[key];
                    keyed[key] = void 0;
                    keyedLen--;
                }
            } else if (!child && min < childrenLen) for (j = min; j < childrenLen; j++) if (void 0 !== children[j] && isSameNodeType(c = children[j], vchild, isHydrating)) {
                child = c;
                children[j] = void 0;
                if (j === childrenLen - 1) childrenLen--;
                if (j === min) min++;
                break;
            }
            child = idiff(child, vchild, context, mountAll);
            f = originalChildren[i];
            if (child && child !== dom && child !== f) if (null == f) dom.appendChild(child); else if (child === f.nextSibling) removeNode(f); else dom.insertBefore(child, f);
        }
        if (keyedLen) for (var i in keyed) if (void 0 !== keyed[i]) recollectNodeTree(keyed[i], !1);
        while (min <= childrenLen) if (void 0 !== (child = children[childrenLen--])) recollectNodeTree(child, !1);
    }
    function recollectNodeTree(node, unmountOnly) {
        var component = node._component;
        if (component) unmountComponent(component); else {
            if (null != node.__preactattr_ && node.__preactattr_.ref) node.__preactattr_.ref(null);
            if (!1 === unmountOnly || null == node.__preactattr_) removeNode(node);
            removeChildren(node);
        }
    }
    function removeChildren(node) {
        node = node.lastChild;
        while (node) {
            var next = node.previousSibling;
            recollectNodeTree(node, !0);
            node = next;
        }
    }
    function diffAttributes(dom, attrs, old) {
        var name;
        for (name in old) if ((!attrs || null == attrs[name]) && null != old[name]) setAccessor(dom, name, old[name], old[name] = void 0, isSvgMode);
        for (name in attrs) if (!('children' === name || 'innerHTML' === name || name in old && attrs[name] === ('value' === name || 'checked' === name ? dom[name] : old[name]))) setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
    }
    function collectComponent(component) {
        var name = component.constructor.name;
        (components[name] || (components[name] = [])).push(component);
    }
    function createComponent(Ctor, props, context) {
        var inst, list = components[Ctor.name];
        if (Ctor.prototype && Ctor.prototype.render) {
            inst = new Ctor(props, context);
            Component.call(inst, props, context);
        } else {
            inst = new Component(props, context);
            inst.constructor = Ctor;
            inst.render = doRender;
        }
        if (list) for (var i = list.length; i--; ) if (list[i].constructor === Ctor) {
            inst.__b = list[i].__b;
            list.splice(i, 1);
            break;
        }
        return inst;
    }
    function doRender(props, state, context) {
        return this.constructor(props, context);
    }
    function setComponentProps(component, props, opts, context, mountAll) {
        if (!component.__x) {
            component.__x = !0;
            if (component.__r = props.ref) delete props.ref;
            if (component.__k = props.key) delete props.key;
            if (!component.base || mountAll) {
                if (component.componentWillMount) component.componentWillMount();
            } else if (component.componentWillReceiveProps) component.componentWillReceiveProps(props, context);
            if (context && context !== component.context) {
                if (!component.__c) component.__c = component.context;
                component.context = context;
            }
            if (!component.__p) component.__p = component.props;
            component.props = props;
            component.__x = !1;
            if (0 !== opts) if (1 === opts || !1 !== options.syncComponentUpdates || !component.base) renderComponent(component, 1, mountAll); else enqueueRender(component);
            if (component.__r) component.__r(component);
        }
    }
    function renderComponent(component, opts, mountAll, isChild) {
        if (!component.__x) {
            var rendered, inst, cbase, props = component.props, state = component.state, context = component.context, previousProps = component.__p || props, previousState = component.__s || state, previousContext = component.__c || context, isUpdate = component.base, nextBase = component.__b, initialBase = isUpdate || nextBase, initialChildComponent = component._component, skip = !1;
            if (isUpdate) {
                component.props = previousProps;
                component.state = previousState;
                component.context = previousContext;
                if (2 !== opts && component.shouldComponentUpdate && !1 === component.shouldComponentUpdate(props, state, context)) skip = !0; else if (component.componentWillUpdate) component.componentWillUpdate(props, state, context);
                component.props = props;
                component.state = state;
                component.context = context;
            }
            component.__p = component.__s = component.__c = component.__b = null;
            component.__d = !1;
            if (!skip) {
                rendered = component.render(props, state, context);
                if (component.getChildContext) context = extend(extend({}, context), component.getChildContext());
                var toUnmount, base, childComponent = rendered && rendered.nodeName;
                if ('function' == typeof childComponent) {
                    var childProps = getNodeProps(rendered);
                    inst = initialChildComponent;
                    if (inst && inst.constructor === childComponent && childProps.key == inst.__k) setComponentProps(inst, childProps, 1, context, !1); else {
                        toUnmount = inst;
                        component._component = inst = createComponent(childComponent, childProps, context);
                        inst.__b = inst.__b || nextBase;
                        inst.__u = component;
                        setComponentProps(inst, childProps, 0, context, !1);
                        renderComponent(inst, 1, mountAll, !0);
                    }
                    base = inst.base;
                } else {
                    cbase = initialBase;
                    toUnmount = initialChildComponent;
                    if (toUnmount) cbase = component._component = null;
                    if (initialBase || 1 === opts) {
                        if (cbase) cbase._component = null;
                        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, !0);
                    }
                }
                if (initialBase && base !== initialBase && inst !== initialChildComponent) {
                    var baseParent = initialBase.parentNode;
                    if (baseParent && base !== baseParent) {
                        baseParent.replaceChild(base, initialBase);
                        if (!toUnmount) {
                            initialBase._component = null;
                            recollectNodeTree(initialBase, !1);
                        }
                    }
                }
                if (toUnmount) unmountComponent(toUnmount);
                component.base = base;
                if (base && !isChild) {
                    var componentRef = component, t = component;
                    while (t = t.__u) (componentRef = t).base = base;
                    base._component = componentRef;
                    base._componentConstructor = componentRef.constructor;
                }
            }
            if (!isUpdate || mountAll) mounts.unshift(component); else if (!skip) {
                if (component.componentDidUpdate) component.componentDidUpdate(previousProps, previousState, previousContext);
                if (options.afterUpdate) options.afterUpdate(component);
            }
            if (null != component.__h) while (component.__h.length) component.__h.pop().call(component);
            if (!diffLevel && !isChild) flushMounts();
        }
    }
    function buildComponentFromVNode(dom, vnode, context, mountAll) {
        var c = dom && dom._component, originalComponent = c, oldDom = dom, isDirectOwner = c && dom._componentConstructor === vnode.nodeName, isOwner = isDirectOwner, props = getNodeProps(vnode);
        while (c && !isOwner && (c = c.__u)) isOwner = c.constructor === vnode.nodeName;
        if (c && isOwner && (!mountAll || c._component)) {
            setComponentProps(c, props, 3, context, mountAll);
            dom = c.base;
        } else {
            if (originalComponent && !isDirectOwner) {
                unmountComponent(originalComponent);
                dom = oldDom = null;
            }
            c = createComponent(vnode.nodeName, props, context);
            if (dom && !c.__b) {
                c.__b = dom;
                oldDom = null;
            }
            setComponentProps(c, props, 1, context, mountAll);
            dom = c.base;
            if (oldDom && dom !== oldDom) {
                oldDom._component = null;
                recollectNodeTree(oldDom, !1);
            }
        }
        return dom;
    }
    function unmountComponent(component) {
        if (options.beforeUnmount) options.beforeUnmount(component);
        var base = component.base;
        component.__x = !0;
        if (component.componentWillUnmount) component.componentWillUnmount();
        component.base = null;
        var inner = component._component;
        if (inner) unmountComponent(inner); else if (base) {
            if (base.__preactattr_ && base.__preactattr_.ref) base.__preactattr_.ref(null);
            component.__b = base;
            removeNode(base);
            collectComponent(component);
            removeChildren(base);
        }
        if (component.__r) component.__r(null);
    }
    function Component(props, context) {
        this.__d = !0;
        this.context = context;
        this.props = props;
        this.state = this.state || {};
    }
    function render(vnode, parent, merge) {
        return diff(merge, vnode, {}, !1, parent, !1);
    }
    var options = {};
    var stack = [];
    var EMPTY_CHILDREN = [];
    var defer = 'function' == typeof Promise ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
    var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
    var items = [];
    var mounts = [];
    var diffLevel = 0;
    var isSvgMode = !1;
    var hydrating = !1;
    var components = {};
    extend(Component.prototype, {
        setState: function(state, callback) {
            var s = this.state;
            if (!this.__s) this.__s = extend({}, s);
            extend(s, 'function' == typeof state ? state(s, this.props) : state);
            if (callback) (this.__h = this.__h || []).push(callback);
            enqueueRender(this);
        },
        forceUpdate: function(callback) {
            if (callback) (this.__h = this.__h || []).push(callback);
            renderComponent(this, 2);
        },
        render: function() {}
    });
    var preact = {
        h: h,
        createElement: h,
        cloneElement: cloneElement,
        Component: Component,
        render: render,
        rerender: rerender,
        options: options
    };
    if ('undefined' != typeof module) module.exports = preact; else self.preact = preact;
}();

},{}],9:[function(require,module,exports){
module.exports = prettierBytes

function prettierBytes (num) {
  if (typeof num !== 'number' || isNaN(num)) {
    throw new TypeError('Expected a number, got ' + typeof num)
  }

  var neg = num < 0
  var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  if (neg) {
    num = -num
  }

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B'
  }

  var exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  num = Number(num / Math.pow(1000, exponent))
  var unit = units[exponent]

  if (num >= 10 || num % 1 === 0) {
    // Do not show decimals when the number is two-digit, or if the number has no
    // decimal component.
    return (neg ? '-' : '') + num.toFixed(0) + ' ' + unit
  } else {
    return (neg ? '-' : '') + num.toFixed(1) + ' ' + unit
  }
}

},{}],10:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  # wildcard

  Very simple wildcard matching, which is designed to provide the same
  functionality that is found in the
  [eve](https://github.com/adobe-webplatform/eve) eventing library.

  ## Usage

  It works with strings:

  <<< examples/strings.js

  Arrays:

  <<< examples/arrays.js

  Objects (matching against keys):

  <<< examples/objects.js

  While the library works in Node, if you are are looking for file-based
  wildcard matching then you should have a look at:

  <https://github.com/isaacs/node-glob>
**/

function WildcardMatcher(text, separator) {
  this.text = text = text || '';
  this.hasWild = ~text.indexOf('*');
  this.separator = separator;
  this.parts = text.split(separator);
}

WildcardMatcher.prototype.match = function(input) {
  var matches = true;
  var parts = this.parts;
  var ii;
  var partsCount = parts.length;
  var testParts;

  if (typeof input == 'string' || input instanceof String) {
    if (!this.hasWild && this.text != input) {
      matches = false;
    } else {
      testParts = (input || '').split(this.separator);
      for (ii = 0; matches && ii < partsCount; ii++) {
        if (parts[ii] === '*')  {
          continue;
        } else if (ii < testParts.length) {
          matches = parts[ii] === testParts[ii];
        } else {
          matches = false;
        }
      }

      // If matches, then return the component parts
      matches = matches && testParts;
    }
  }
  else if (typeof input.splice == 'function') {
    matches = [];

    for (ii = input.length; ii--; ) {
      if (this.match(input[ii])) {
        matches[matches.length] = input[ii];
      }
    }
  }
  else if (typeof input == 'object') {
    matches = {};

    for (var key in input) {
      if (this.match(key)) {
        matches[key] = input[key];
      }
    }
  }

  return matches;
};

module.exports = function(text, test, separator) {
  var matcher = new WildcardMatcher(text, separator || /[\/\.]/);
  if (typeof test != 'undefined') {
    return matcher.match(test);
  }

  return matcher;
};

},{}],11:[function(require,module,exports){
(function (global){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Utils = require('../core/Utils');
var Translator = require('../core/Translator');
var ee = require('namespace-emitter');
var cuid = require('cuid');
var throttle = require('lodash.throttle');
var prettyBytes = require('prettier-bytes');
var match = require('mime-match');
var DefaultStore = require('../store/DefaultStore');

/**
 * Uppy Core module.
 * Manages plugins, state updates, acts as an event bus,
 * adds/removes files and metadata.
 *
 * @param {object} opts — Uppy options
 */

var Uppy = function () {
  function Uppy(opts) {
    var _this = this;

    _classCallCheck(this, Uppy);

    var defaultLocale = {
      strings: {
        youCanOnlyUploadX: {
          0: 'You can only upload %{smart_count} file',
          1: 'You can only upload %{smart_count} files'
        },
        youHaveToAtLeastSelectX: {
          0: 'You have to select at least %{smart_count} file',
          1: 'You have to select at least %{smart_count} files'
        },
        exceedsSize: 'This file exceeds maximum allowed size of',
        youCanOnlyUploadFileTypes: 'You can only upload:',
        uppyServerError: 'Connection with Uppy Server failed'
      }

      // set default options
    };var defaultOptions = {
      id: 'uppy',
      autoProceed: true,
      debug: false,
      restrictions: {
        maxFileSize: false,
        maxNumberOfFiles: false,
        minNumberOfFiles: false,
        allowedFileTypes: false
      },
      meta: {},
      onBeforeFileAdded: function onBeforeFileAdded(currentFile, files) {
        return _Promise.resolve();
      },
      onBeforeUpload: function onBeforeUpload(files) {
        return _Promise.resolve();
      },
      locale: defaultLocale,
      store: new DefaultStore()

      // Merge default options with the ones set by user
    };this.opts = _extends({}, defaultOptions, opts);

    this.locale = _extends({}, defaultLocale, this.opts.locale);
    this.locale.strings = _extends({}, defaultLocale.strings, this.opts.locale.strings);

    // i18n
    this.translator = new Translator({ locale: this.locale });
    this.i18n = this.translator.translate.bind(this.translator);

    // Container for different types of plugins
    this.plugins = {};

    this.translator = new Translator({ locale: this.opts.locale });
    this.i18n = this.translator.translate.bind(this.translator);
    this.getState = this.getState.bind(this);
    this.getPlugin = this.getPlugin.bind(this);
    this.setFileMeta = this.setFileMeta.bind(this);
    this.setFileState = this.setFileState.bind(this);
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.hideInfo = this.hideInfo.bind(this);
    this.addFile = this.addFile.bind(this);
    this.removeFile = this.removeFile.bind(this);
    this.pauseResume = this.pauseResume.bind(this);
    this._calculateProgress = this._calculateProgress.bind(this);
    this.updateOnlineStatus = this.updateOnlineStatus.bind(this);
    this.resetProgress = this.resetProgress.bind(this);

    this.pauseAll = this.pauseAll.bind(this);
    this.resumeAll = this.resumeAll.bind(this);
    this.retryAll = this.retryAll.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
    this.retryUpload = this.retryUpload.bind(this);
    this.upload = this.upload.bind(this);

    this.emitter = ee();
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.once = this.emitter.once.bind(this.emitter);
    this.emit = this.emitter.emit.bind(this.emitter);

    this.preProcessors = [];
    this.uploaders = [];
    this.postProcessors = [];

    this.store = this.opts.store;
    this.setState({
      plugins: {},
      files: {},
      currentUploads: {},
      capabilities: {
        resumableUploads: false
      },
      totalProgress: 0,
      meta: _extends({}, this.opts.meta),
      info: {
        isHidden: true,
        type: 'info',
        message: ''
      }
    });

    this._storeUnsubscribe = this.store.subscribe(function (prevState, nextState, patch) {
      _this.emit('state-update', prevState, nextState, patch);
      _this.updateAll(nextState);
    });

    // for debugging and testing
    // this.updateNum = 0
    if (this.opts.debug) {
      global.uppyLog = '';
      global[this.opts.id] = this;
    }
  }

  Uppy.prototype.on = function on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  };

  Uppy.prototype.off = function off(event, callback) {
    this.emitter.off(event, callback);
    return this;
  };

  /**
   * Iterate on all plugins and run `update` on them.
   * Called each time state changes.
   *
   */


  Uppy.prototype.updateAll = function updateAll(state) {
    this.iteratePlugins(function (plugin) {
      plugin.update(state);
    });
  };

  /**
   * Updates state
   *
   * @param {patch} object
   */


  Uppy.prototype.setState = function setState(patch) {
    this.store.setState(patch);
  };

  /**
   * Returns current state.
   */


  Uppy.prototype.getState = function getState() {
    return this.store.getState();
  };

  /**
  * Back compat for when this.state is used instead of this.getState().
  */


  /**
  * Shorthand to set state for a specific file.
  */
  Uppy.prototype.setFileState = function setFileState(fileID, state) {
    var _extends2;

    this.setState({
      files: _extends({}, this.getState().files, (_extends2 = {}, _extends2[fileID] = _extends({}, this.getState().files[fileID], state), _extends2))
    });
  };

  Uppy.prototype.resetProgress = function resetProgress() {
    var defaultProgress = {
      percentage: 0,
      bytesUploaded: 0,
      uploadComplete: false,
      uploadStarted: false
    };
    var files = _extends({}, this.getState().files);
    var updatedFiles = {};
    Object.keys(files).forEach(function (fileID) {
      var updatedFile = _extends({}, files[fileID]);
      updatedFile.progress = _extends({}, updatedFile.progress, defaultProgress);
      updatedFiles[fileID] = updatedFile;
    });

    this.setState({
      files: updatedFiles,
      totalProgress: 0
    });

    // TODO Document on the website
    this.emit('reset-progress');
  };

  Uppy.prototype.addPreProcessor = function addPreProcessor(fn) {
    this.preProcessors.push(fn);
  };

  Uppy.prototype.removePreProcessor = function removePreProcessor(fn) {
    var i = this.preProcessors.indexOf(fn);
    if (i !== -1) {
      this.preProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addPostProcessor = function addPostProcessor(fn) {
    this.postProcessors.push(fn);
  };

  Uppy.prototype.removePostProcessor = function removePostProcessor(fn) {
    var i = this.postProcessors.indexOf(fn);
    if (i !== -1) {
      this.postProcessors.splice(i, 1);
    }
  };

  Uppy.prototype.addUploader = function addUploader(fn) {
    this.uploaders.push(fn);
  };

  Uppy.prototype.removeUploader = function removeUploader(fn) {
    var i = this.uploaders.indexOf(fn);
    if (i !== -1) {
      this.uploaders.splice(i, 1);
    }
  };

  Uppy.prototype.setMeta = function setMeta(data) {
    var updatedMeta = _extends({}, this.getState().meta, data);
    var updatedFiles = _extends({}, this.getState().files);

    Object.keys(updatedFiles).forEach(function (fileID) {
      updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
        meta: _extends({}, updatedFiles[fileID].meta, data)
      });
    });

    this.log('Adding metadata:');
    this.log(data);

    this.setState({
      meta: updatedMeta,
      files: updatedFiles
    });
  };

  Uppy.prototype.setFileMeta = function setFileMeta(fileID, data) {
    var updatedFiles = _extends({}, this.getState().files);
    if (!updatedFiles[fileID]) {
      this.log('Was trying to set metadata for a file that’s not with us anymore: ', fileID);
      return;
    }
    var newMeta = _extends({}, updatedFiles[fileID].meta, data);
    updatedFiles[fileID] = _extends({}, updatedFiles[fileID], {
      meta: newMeta
    });
    this.setState({ files: updatedFiles });
  };

  /**
   * Get a file object.
   *
   * @param {string} fileID The ID of the file object to return.
   */


  Uppy.prototype.getFile = function getFile(fileID) {
    return this.getState().files[fileID];
  };

  /**
  * Check if minNumberOfFiles restriction is reached before uploading.
  *
  * @return {boolean}
  * @private
  */


  Uppy.prototype._checkMinNumberOfFiles = function _checkMinNumberOfFiles() {
    var minNumberOfFiles = this.opts.restrictions.minNumberOfFiles;

    if (Object.keys(this.getState().files).length < minNumberOfFiles) {
      throw new Error('' + this.i18n('youHaveToAtLeastSelectX', { smart_count: minNumberOfFiles }));
    }
  };

  /**
  * Check if file passes a set of restrictions set in options: maxFileSize,
  * maxNumberOfFiles and allowedFileTypes.
  *
  * @param {object} file object to check
  * @private
  */


  Uppy.prototype._checkRestrictions = function _checkRestrictions(file) {
    var _opts$restrictions = this.opts.restrictions,
        maxFileSize = _opts$restrictions.maxFileSize,
        maxNumberOfFiles = _opts$restrictions.maxNumberOfFiles,
        allowedFileTypes = _opts$restrictions.allowedFileTypes;


    if (maxNumberOfFiles) {
      if (Object.keys(this.getState().files).length + 1 > maxNumberOfFiles) {
        throw new Error('' + this.i18n('youCanOnlyUploadX', { smart_count: maxNumberOfFiles }));
      }
    }

    if (allowedFileTypes) {
      var isCorrectFileType = allowedFileTypes.filter(function (type) {
        if (!file.type) return false;
        return match(file.type, type);
      }).length > 0;

      if (!isCorrectFileType) {
        var allowedFileTypesString = allowedFileTypes.join(', ');
        throw new Error(this.i18n('youCanOnlyUploadFileTypes') + ' ' + allowedFileTypesString);
      }
    }

    if (maxFileSize) {
      if (file.data.size > maxFileSize) {
        throw new Error(this.i18n('exceedsSize') + ' ' + prettyBytes(maxFileSize));
      }
    }
  };

  /**
  * Add a new file to `state.files`. This will run `onBeforeFileAdded`,
  * try to guess file type in a clever way, check file against restrictions,
  * and start an upload if `autoProceed === true`.
  *
  * @param {object} file object to add
  */


  Uppy.prototype.addFile = function addFile(file) {
    var _this2 = this;

    return _Promise.resolve()
    // Wrap this in a Promise `.then()` handler so errors will reject the Promise
    // instead of throwing.
    .then(function () {
      return _this2.opts.onBeforeFileAdded(file, _this2.getState().files);
    }).then(function () {
      return Utils.getFileType(file);
    }).then(function (fileType) {
      var updatedFiles = _extends({}, _this2.getState().files);
      var fileName = void 0;
      if (file.name) {
        fileName = file.name;
      } else if (fileType.split('/')[0] === 'image') {
        fileName = fileType.split('/')[0] + '.' + fileType.split('/')[1];
      } else {
        fileName = 'noname';
      }
      var fileExtension = Utils.getFileNameAndExtension(fileName).extension;
      var isRemote = file.isRemote || false;

      var fileID = Utils.generateFileID(file);

      var newFile = {
        source: file.source || '',
        id: fileID,
        name: fileName,
        extension: fileExtension || '',
        meta: _extends({}, _this2.getState().meta, {
          name: fileName,
          type: fileType
        }),
        type: fileType,
        data: file.data,
        progress: {
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.data.size || 0,
          uploadComplete: false,
          uploadStarted: false
        },
        size: file.data.size || 0,
        isRemote: isRemote,
        remote: file.remote || '',
        preview: file.preview
      };

      _this2._checkRestrictions(newFile);

      updatedFiles[fileID] = newFile;
      _this2.setState({ files: updatedFiles });

      _this2.emit('file-added', newFile);
      _this2.log('Added file: ' + fileName + ', ' + fileID + ', mime type: ' + fileType);

      if (_this2.opts.autoProceed && !_this2.scheduledAutoProceed) {
        _this2.scheduledAutoProceed = setTimeout(function () {
          _this2.scheduledAutoProceed = null;
          _this2.upload().catch(function (err) {
            console.error(err.stack || err.message || err);
          });
        }, 4);
      }
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this2.log(message);
      _this2.info(message, 'error', 5000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  Uppy.prototype.removeFile = function removeFile(fileID) {
    var _this3 = this;

    var _state = this.state,
        files = _state.files,
        currentUploads = _state.currentUploads;

    var updatedFiles = _extends({}, files);
    var removedFile = updatedFiles[fileID];
    delete updatedFiles[fileID];

    // Remove this file from its `currentUpload`.
    var updatedUploads = _extends({}, currentUploads);
    var removeUploads = [];
    Object.keys(updatedUploads).forEach(function (uploadID) {
      var newFileIDs = currentUploads[uploadID].fileIDs.filter(function (uploadFileID) {
        return uploadFileID !== fileID;
      });
      // Remove the upload if no files are associated with it anymore.
      if (newFileIDs.length === 0) {
        removeUploads.push(uploadID);
        return;
      }

      updatedUploads[uploadID] = _extends({}, currentUploads[uploadID], {
        fileIDs: newFileIDs
      });
    });

    this.setState({
      currentUploads: updatedUploads,
      files: updatedFiles
    });

    removeUploads.forEach(function (uploadID) {
      _this3._removeUpload(uploadID);
    });

    this._calculateTotalProgress();
    this.emit('file-removed', fileID);

    // Clean up object URLs.
    if (removedFile.preview && Utils.isObjectURL(removedFile.preview)) {
      URL.revokeObjectURL(removedFile.preview);
    }

    this.log('Removed file: ' + fileID);
  };

  Uppy.prototype.pauseResume = function pauseResume(fileID) {
    var updatedFiles = _extends({}, this.getState().files);

    if (updatedFiles[fileID].uploadComplete) return;

    var wasPaused = updatedFiles[fileID].isPaused || false;
    var isPaused = !wasPaused;

    var updatedFile = _extends({}, updatedFiles[fileID], {
      isPaused: isPaused
    });

    updatedFiles[fileID] = updatedFile;
    this.setState({ files: updatedFiles });

    this.emit('upload-pause', fileID, isPaused);

    return isPaused;
  };

  Uppy.prototype.pauseAll = function pauseAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: true
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('pause-all');
  };

  Uppy.prototype.resumeAll = function resumeAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var inProgressUpdatedFiles = Object.keys(updatedFiles).filter(function (file) {
      return !updatedFiles[file].progress.uploadComplete && updatedFiles[file].progress.uploadStarted;
    });

    inProgressUpdatedFiles.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({ files: updatedFiles });

    this.emit('resume-all');
  };

  Uppy.prototype.retryAll = function retryAll() {
    var updatedFiles = _extends({}, this.getState().files);
    var filesToRetry = Object.keys(updatedFiles).filter(function (file) {
      return updatedFiles[file].error;
    });

    filesToRetry.forEach(function (file) {
      var updatedFile = _extends({}, updatedFiles[file], {
        isPaused: false,
        error: null
      });
      updatedFiles[file] = updatedFile;
    });
    this.setState({
      files: updatedFiles,
      error: null
    });

    this.emit('retry-all', filesToRetry);

    var uploadID = this._createUpload(filesToRetry);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.cancelAll = function cancelAll() {
    this.emit('cancel-all');
    this.setState({ files: {}, totalProgress: 0 });
  };

  Uppy.prototype.retryUpload = function retryUpload(fileID) {
    var updatedFiles = _extends({}, this.getState().files);
    var updatedFile = _extends({}, updatedFiles[fileID], { error: null, isPaused: false });
    updatedFiles[fileID] = updatedFile;
    this.setState({
      files: updatedFiles
    });

    this.emit('upload-retry', fileID);

    var uploadID = this._createUpload([fileID]);
    return this._runUpload(uploadID);
  };

  Uppy.prototype.reset = function reset() {
    this.cancelAll();
  };

  Uppy.prototype._calculateProgress = function _calculateProgress(data) {
    var fileID = data.id;

    // skip progress event for a file that’s been removed
    if (!this.getFile(fileID)) {
      this.log('Trying to set progress for a file that’s been removed: ', fileID);
      return;
    }

    this.setFileState(fileID, {
      progress: _extends({}, this.getState().files[fileID].progress, {
        bytesUploaded: data.bytesUploaded,
        bytesTotal: data.bytesTotal,
        percentage: Math.floor((data.bytesUploaded / data.bytesTotal * 100).toFixed(2))
      })
    });

    this._calculateTotalProgress();
  };

  Uppy.prototype._calculateTotalProgress = function _calculateTotalProgress() {
    // calculate total progress, using the number of files currently uploading,
    // multiplied by 100 and the summ of individual progress of each file
    var files = _extends({}, this.getState().files);

    var inProgress = Object.keys(files).filter(function (file) {
      return files[file].progress.uploadStarted;
    });
    var progressMax = inProgress.length * 100;
    var progressAll = 0;
    inProgress.forEach(function (file) {
      progressAll = progressAll + files[file].progress.percentage;
    });

    var totalProgress = progressMax === 0 ? 0 : Math.floor((progressAll * 100 / progressMax).toFixed(2));

    this.setState({
      totalProgress: totalProgress
    });
  };

  /**
   * Registers listeners for all global actions, like:
   * `error`, `file-removed`, `upload-progress`
   *
   */


  Uppy.prototype.actions = function actions() {
    var _this4 = this;

    // const log = this.log
    // this.on('*', function (payload) {
    //   log(`[Core] Event: ${this.event}`)
    //   log(payload)
    // })

    // stress-test re-rendering
    // setInterval(() => {
    //   this.setState({bla: 'bla'})
    // }, 20)

    this.on('error', function (error) {
      _this4.setState({ error: error.message });
    });

    this.on('upload-error', function (fileID, error) {
      _this4.setFileState(fileID, { error: error.message });
      _this4.setState({ error: error.message });

      var fileName = _this4.getState().files[fileID].name;
      var message = 'Failed to upload ' + fileName;
      if ((typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error.message) {
        message = { message: message, details: error.message };
      }
      _this4.info(message, 'error', 5000);
    });

    this.on('upload', function () {
      _this4.setState({ error: null });
    });

    // this.on('file-add', (data) => {
    //   this.addFile(data)
    // })

    this.on('file-remove', function (fileID) {
      _this4.removeFile(fileID);
    });

    this.on('upload-started', function (fileID, upload) {
      var file = _this4.getFile(fileID);
      _this4.setFileState(fileID, {
        progress: _extends({}, file.progress, {
          uploadStarted: Date.now(),
          uploadComplete: false,
          percentage: 0,
          bytesUploaded: 0,
          bytesTotal: file.size
        })
      });
    });

    // upload progress events can occur frequently, especially when you have a good
    // connection to the remote server. Therefore, we are throtteling them to
    // prevent accessive function calls.
    // see also: https://github.com/tus/tus-js-client/commit/9940f27b2361fd7e10ba58b09b60d82422183bbb
    var _throttledCalculateProgress = throttle(this._calculateProgress, 100, { leading: true, trailing: true });

    this.on('upload-progress', _throttledCalculateProgress);

    this.on('upload-success', function (fileID, uploadResp, uploadURL) {
      _this4.setFileState(fileID, {
        progress: _extends({}, _this4.getState().files[fileID].progress, {
          uploadComplete: true,
          percentage: 100
        }),
        uploadURL: uploadURL,
        isPaused: false
      });

      _this4._calculateTotalProgress();
    });

    this.on('preprocess-progress', function (fileID, progress) {
      _this4.setFileState(fileID, {
        progress: _extends({}, _this4.getState().files[fileID].progress, {
          preprocess: progress
        })
      });
    });

    this.on('preprocess-complete', function (fileID) {
      var files = _extends({}, _this4.getState().files);
      files[fileID] = _extends({}, files[fileID], {
        progress: _extends({}, files[fileID].progress)
      });
      delete files[fileID].progress.preprocess;

      _this4.setState({ files: files });
    });

    this.on('postprocess-progress', function (fileID, progress) {
      _this4.setFileState(fileID, {
        progress: _extends({}, _this4.getState().files[fileID].progress, {
          postprocess: progress
        })
      });
    });

    this.on('postprocess-complete', function (fileID) {
      var files = _extends({}, _this4.getState().files);
      files[fileID] = _extends({}, files[fileID], {
        progress: _extends({}, files[fileID].progress)
      });
      delete files[fileID].progress.postprocess;
      // TODO should we set some kind of `fullyComplete` property on the file object
      // so it's easier to see that the file is upload…fully complete…rather than
      // what we have to do now (`uploadComplete && !postprocess`)

      _this4.setState({ files: files });
    });

    this.on('restored', function () {
      // Files may have changed--ensure progress is still accurate.
      _this4._calculateTotalProgress();
    });

    // show informer if offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', function () {
        return _this4.updateOnlineStatus();
      });
      window.addEventListener('offline', function () {
        return _this4.updateOnlineStatus();
      });
      setTimeout(function () {
        return _this4.updateOnlineStatus();
      }, 3000);
    }
  };

  Uppy.prototype.updateOnlineStatus = function updateOnlineStatus() {
    var online = typeof window.navigator.onLine !== 'undefined' ? window.navigator.onLine : true;
    if (!online) {
      this.emit('is-offline');
      this.info('No internet connection', 'error', 0);
      this.wasOffline = true;
    } else {
      this.emit('is-online');
      if (this.wasOffline) {
        this.emit('back-online');
        this.info('Connected!', 'success', 3000);
        this.wasOffline = false;
      }
    }
  };

  Uppy.prototype.getID = function getID() {
    return this.opts.id;
  };

  /**
   * Registers a plugin with Core.
   *
   * @param {Class} Plugin object
   * @param {Object} options object that will be passed to Plugin later
   * @return {Object} self for chaining
   */


  Uppy.prototype.use = function use(Plugin, opts) {
    if (typeof Plugin !== 'function') {
      var msg = 'Expected a plugin class, but got ' + (Plugin === null ? 'null' : typeof Plugin === 'undefined' ? 'undefined' : _typeof(Plugin)) + '.' + ' Please verify that the plugin was imported and spelled correctly.';
      throw new TypeError(msg);
    }

    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginId = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginId) {
      throw new Error('Your plugin must have an id');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginId);
    if (existsPluginAlready) {
      var _msg = 'Already found a plugin named \'' + existsPluginAlready.id + '\'.\n        Tried to use: \'' + pluginId + '\'.\n        Uppy is currently limited to running one of every plugin.\n        Share your use case with us over at\n        https://github.com/transloadit/uppy/issues/\n        if you want us to reconsider.';
      throw new Error(_msg);
    }

    this.plugins[plugin.type].push(plugin);
    plugin.install();

    return this;
  };

  /**
   * Find one Plugin by name.
   *
   * @param string name description
   */


  Uppy.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = false;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins.
   *
   * @param function method description
   */


  Uppy.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this5 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this5.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Uninstall and remove a plugin.
   *
   * @param {Plugin} instance The plugin instance to remove.
   */


  Uppy.prototype.removePlugin = function removePlugin(instance) {
    var list = this.plugins[instance.type];

    if (instance.uninstall) {
      instance.uninstall();
    }

    var index = list.indexOf(instance);
    if (index !== -1) {
      list.splice(index, 1);
    }
  };

  /**
   * Uninstall all plugins and close down this Uppy instance.
   */


  Uppy.prototype.close = function close() {
    this.reset();

    this._storeUnsubscribe();

    this.iteratePlugins(function (plugin) {
      plugin.uninstall();
    });
  };

  /**
  * Set info message in `state.info`, so that UI plugins like `Informer`
  * can display the message.
  *
  * @param {string} msg Message to be displayed by the informer
  */

  Uppy.prototype.info = function info(message) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3000;

    var isComplexMessage = (typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object';

    this.setState({
      info: {
        isHidden: false,
        type: type,
        message: isComplexMessage ? message.message : message,
        details: isComplexMessage ? message.details : null
      }
    });

    this.emit('info-visible');

    window.clearTimeout(this.infoTimeoutID);
    if (duration === 0) {
      this.infoTimeoutID = undefined;
      return;
    }

    // hide the informer after `duration` milliseconds
    this.infoTimeoutID = setTimeout(this.hideInfo, duration);
  };

  Uppy.prototype.hideInfo = function hideInfo() {
    var newInfo = _extends({}, this.getState().info, {
      isHidden: true
    });
    this.setState({
      info: newInfo
    });
    this.emit('info-hidden');
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @param {String|Object} msg to log
   * @param {String} type optional `error` or `warning`
   */


  Uppy.prototype.log = function log(msg, type) {
    if (!this.opts.debug) {
      return;
    }

    var message = '[Uppy] [' + Utils.getTimeStamp() + '] ' + msg;

    global.uppyLog = global.uppyLog + '\n' + 'DEBUG LOG: ' + msg;

    if (type === 'error') {
      console.error(message);
      return;
    }

    if (type === 'warning') {
      console.warn(message);
      return;
    }

    if (msg === '' + msg) {
      console.log(message);
    } else {
      message = '[Uppy] [' + Utils.getTimeStamp() + ']';
      console.log(message);
      console.dir(msg);
    }
  };

  /**
   * Initializes actions.
   *
   */


  Uppy.prototype.run = function run() {
    this.log('Core is run, initializing actions...');
    this.actions();

    return this;
  };

  /**
   * Restore an upload by its ID.
   */


  Uppy.prototype.restore = function restore(uploadID) {
    this.log('Core: attempting to restore upload "' + uploadID + '"');

    if (!this.getState().currentUploads[uploadID]) {
      this._removeUpload(uploadID);
      return _Promise.reject(new Error('Nonexistent upload'));
    }

    return this._runUpload(uploadID);
  };

  /**
   * Create an upload for a bunch of files.
   *
   * @param {Array<string>} fileIDs File IDs to include in this upload.
   * @return {string} ID of this upload.
   */


  Uppy.prototype._createUpload = function _createUpload(fileIDs) {
    var _extends3;

    var uploadID = cuid();

    this.emit('upload', {
      id: uploadID,
      fileIDs: fileIDs
    });

    this.setState({
      currentUploads: _extends({}, this.getState().currentUploads, (_extends3 = {}, _extends3[uploadID] = {
        fileIDs: fileIDs,
        step: 0,
        result: {}
      }, _extends3))
    });

    return uploadID;
  };

  Uppy.prototype._getUpload = function _getUpload(uploadID) {
    return this.getState().currentUploads[uploadID];
  };

  /**
   * Add data to an upload's result object.
   *
   * @param {string} uploadID The ID of the upload.
   * @param {object} data Data properties to add to the result object.
   */


  Uppy.prototype.addResultData = function addResultData(uploadID, data) {
    var _extends4;

    var currentUploads = this.getState().currentUploads;
    var currentUpload = _extends({}, currentUploads[uploadID], {
      result: _extends({}, currentUploads[uploadID].result, data)
    });
    this.setState({
      currentUploads: _extends({}, currentUploads, (_extends4 = {}, _extends4[uploadID] = currentUpload, _extends4))
    });
  };

  /**
   * Remove an upload, eg. if it has been canceled or completed.
   *
   * @param {string} uploadID The ID of the upload.
   */


  Uppy.prototype._removeUpload = function _removeUpload(uploadID) {
    var currentUploads = _extends({}, this.getState().currentUploads);
    delete currentUploads[uploadID];

    this.setState({
      currentUploads: currentUploads
    });
  };

  /**
   * Run an upload. This picks up where it left off in case the upload is being restored.
   *
   * @private
   */


  Uppy.prototype._runUpload = function _runUpload(uploadID) {
    var _this6 = this;

    var uploadData = this.getState().currentUploads[uploadID];
    var fileIDs = uploadData.fileIDs;
    var restoreStep = uploadData.step;

    var steps = [].concat(this.preProcessors, this.uploaders, this.postProcessors);
    var lastStep = _Promise.resolve();
    steps.forEach(function (fn, step) {
      // Skip this step if we are restoring and have already completed this step before.
      if (step < restoreStep) {
        return;
      }

      lastStep = lastStep.then(function () {
        var _extends5;

        var _getState = _this6.getState(),
            currentUploads = _getState.currentUploads;

        var currentUpload = _extends({}, currentUploads[uploadID], {
          step: step
        });
        _this6.setState({
          currentUploads: _extends({}, currentUploads, (_extends5 = {}, _extends5[uploadID] = currentUpload, _extends5))
        });
        // TODO give this the `currentUpload` object as its only parameter maybe?
        // Otherwise when more metadata may be added to the upload this would keep getting more parameters
        return fn(fileIDs, uploadID);
      }).then(function (result) {
        return null;
      });
    });

    // Not returning the `catch`ed promise, because we still want to return a rejected
    // promise from this method if the upload failed.
    lastStep.catch(function (err) {
      _this6.emit('error', err);

      _this6._removeUpload(uploadID);
    });

    return lastStep.then(function () {
      var files = fileIDs.map(function (fileID) {
        return _this6.getFile(fileID);
      });
      var successful = files.filter(function (file) {
        return file && !file.error;
      });
      var failed = files.filter(function (file) {
        return file && file.error;
      });
      _this6.addResultData(uploadID, { successful: successful, failed: failed, uploadID: uploadID });

      var _getState2 = _this6.getState(),
          currentUploads = _getState2.currentUploads;

      var result = currentUploads[uploadID].result;
      _this6.emit('complete', result);
      // Compatibility with pre-0.21
      _this6.emit('success', fileIDs);

      _this6._removeUpload(uploadID);

      return result;
    });
  };

  /**
  * Start an upload for all the files that are not currently being uploaded.
  *
  * @return {Promise}
  */


  Uppy.prototype.upload = function upload() {
    var _this7 = this;

    if (!this.plugins.uploader) {
      this.log('No uploader type plugins are used', 'warning');
    }

    return _Promise.resolve().then(function () {
      return _this7.opts.onBeforeUpload(_this7.getState().files);
    }).then(function () {
      return _this7._checkMinNumberOfFiles();
    }).then(function () {
      var _getState3 = _this7.getState(),
          currentUploads = _getState3.currentUploads;
      // get a list of files that are currently assigned to uploads


      var currentlyUploadingFiles = Object.keys(currentUploads).reduce(function (prev, curr) {
        return prev.concat(currentUploads[curr].fileIDs);
      }, []);

      var waitingFileIDs = [];
      Object.keys(_this7.getState().files).forEach(function (fileID) {
        var file = _this7.getFile(fileID);
        // if the file hasn't started uploading and hasn't already been assigned to an upload..
        if (!file.progress.uploadStarted && currentlyUploadingFiles.indexOf(fileID) === -1) {
          waitingFileIDs.push(file.id);
        }
      });

      var uploadID = _this7._createUpload(waitingFileIDs);
      return _this7._runUpload(uploadID);
    }).catch(function (err) {
      var message = (typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err.message : err;
      _this7.log(message);
      _this7.info(message, 'error', 4000);
      return _Promise.reject((typeof err === 'undefined' ? 'undefined' : _typeof(err)) === 'object' ? err : new Error(err));
    });
  };

  _createClass(Uppy, [{
    key: 'state',
    get: function get() {
      return this.getState();
    }
  }]);

  return Uppy;
}();

module.exports = function (opts) {
  return new Uppy(opts);
};
// Expose class constructor.
module.exports.Uppy = Uppy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Translator":13,"../core/Utils":15,"../store/DefaultStore":19,"cuid":1,"es6-promise":4,"lodash.throttle":5,"mime-match":6,"namespace-emitter":7,"prettier-bytes":9}],12:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var preact = require('preact');

var _require = require('../core/Utils'),
    findDOMElement = _require.findDOMElement;

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */


module.exports = function () {
  function Plugin(uppy, opts) {
    _classCallCheck(this, Plugin);

    this.uppy = uppy;
    this.opts = opts || {};

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.install = this.install.bind(this);
    this.uninstall = this.uninstall.bind(this);
  }

  Plugin.prototype.getPluginState = function getPluginState() {
    return this.uppy.state.plugins[this.id];
  };

  Plugin.prototype.setPluginState = function setPluginState(update) {
    var plugins = _extends({}, this.uppy.state.plugins);
    plugins[this.id] = _extends({}, plugins[this.id], update);

    this.uppy.setState({
      plugins: plugins
    });
  };

  Plugin.prototype.update = function update(state) {
    if (typeof this.el === 'undefined') {
      return;
    }

    if (this.updateUI) {
      this.updateUI(state);
    }
  };

  /**
   * Check if supplied `target` is a DOM element or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var _this = this;

    var callerPluginName = plugin.id;

    var targetElement = findDOMElement(target);

    if (targetElement) {
      this.updateUI = function (state) {
        _this.el = preact.render(_this.render(state), targetElement, _this.el);
      };

      this.uppy.log('Installing ' + callerPluginName + ' to a DOM element');

      // clear everything inside the target container
      if (this.opts.replaceTargetContent) {
        targetElement.innerHTML = '';
      }

      this.el = preact.render(this.render(this.uppy.state), targetElement);

      return this.el;
    }

    var targetPlugin = void 0;
    if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof Plugin) {
      // Targeting a plugin *instance*
      targetPlugin = target;
    } else if (typeof target === 'function') {
      // Targeting a plugin type
      var Target = target;
      // Find the target plugin instance.
      this.uppy.iteratePlugins(function (plugin) {
        if (plugin instanceof Target) {
          targetPlugin = plugin;
          return false;
        }
      });
    }

    if (targetPlugin) {
      var targetPluginName = targetPlugin.id;
      this.uppy.log('Installing ' + callerPluginName + ' to ' + targetPluginName);
      this.el = targetPlugin.addTarget(plugin);
      return this.el;
    }

    this.uppy.log('Not installing ' + callerPluginName);
    throw new Error('Invalid target option given to ' + callerPluginName);
  };

  Plugin.prototype.render = function render(state) {
    throw new Error('Extend the render method to add your plugin to a DOM element');
  };

  Plugin.prototype.addTarget = function addTarget(plugin) {
    throw new Error('Extend the addTarget method to add your plugin to another plugin\'s target');
  };

  Plugin.prototype.unmount = function unmount() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    // this.target = null
  };

  Plugin.prototype.install = function install() {};

  Plugin.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return Plugin;
}();

},{"../core/Utils":15,"preact":8}],13:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.
 * Extensible with custom dictionaries and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */
module.exports = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {
      locale: {
        strings: {},
        pluralize: function pluralize(n) {
          if (n === 1) {
            return 0;
          }
          return 1;
        }
      }
    };

    this.opts = _extends({}, defaultOptions, opts);
    this.locale = _extends({}, defaultOptions.locale, opts.locale);

    // console.log(this.opts.locale)

    // this.locale.pluralize = this.locale ? this.locale.pluralize : defaultPluralize
    // this.locale.strings = Object.assign({}, en_US.strings, this.opts.locale.strings)
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.locale.pluralize(options.smart_count);
      return this.interpolate(this.opts.locale.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locale.strings[key], options);
  };

  return Translator;
}();

},{}],14:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ee = require('namespace-emitter');

module.exports = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = ee();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.close = this.close.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.close = function close() {
    return this.socket.close();
  };

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    console.log(action);
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    console.log(action);
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      console.log(message);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

},{"namespace-emitter":7}],15:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var throttle = require('lodash.throttle');
// we inline file-type module, as opposed to using the NPM version,
// because of this https://github.com/sindresorhus/file-type/issues/78
// and https://github.com/sindresorhus/copy-text-to-clipboard/issues/5
var fileType = require('../vendor/file-type');

/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

function isTouchDevice() {
  return 'ontouchstart' in window || // works on most browsers
  navigator.maxTouchPoints; // works on IE10/11 and Surface
}

function truncateString(str, length) {
  if (str.length > length) {
    return str.substr(0, length / 2) + '...' + str.substr(str.length - length / 4, str.length);
  }
  return str;

  // more precise version if needed
  // http://stackoverflow.com/a/831583
}

function secondsToTime(rawSeconds) {
  var hours = Math.floor(rawSeconds / 3600) % 24;
  var minutes = Math.floor(rawSeconds / 60) % 60;
  var seconds = Math.floor(rawSeconds % 60);

  return { hours: hours, minutes: minutes, seconds: seconds };
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Returns a timestamp in the format of `hours:minutes:seconds`
*/
function getTimeStamp() {
  var date = new Date();
  var hours = pad(date.getHours().toString());
  var minutes = pad(date.getMinutes().toString());
  var seconds = pad(date.getSeconds().toString());
  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Adds zero to strings shorter than two characters
*/
function pad(str) {
  return str.length !== 2 ? 0 + str : str;
}

/**
 * Takes a file object and turns it into fileID, by converting file.name to lowercase,
 * removing extra characters and adding type, size and lastModified
 *
 * @param {Object} file
 * @return {String} the fileID
 *
 */
function generateFileID(file) {
  // filter is needed to not join empty values with `-`
  return ['uppy', file.name ? file.name.toLowerCase().replace(/[^A-Z0-9]/ig, '') : '', file.type, file.data.size, file.data.lastModified].filter(function (val) {
    return val;
  }).join('-');
}

/**
 * Runs an array of promise-returning functions in sequence.
 */
function runPromiseSequence(functions) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var promise = _Promise.resolve();
  functions.forEach(function (func) {
    promise = promise.then(function () {
      return func.apply(undefined, args);
    });
  });
  return promise;
}

function isPreviewSupported(fileType) {
  if (!fileType) return false;
  var fileTypeSpecific = fileType.split('/')[1];
  // list of images that browsers can preview
  if (/^(jpeg|gif|png|svg|svg\+xml|bmp)$/.test(fileTypeSpecific)) {
    return true;
  }
  return false;
}

function getArrayBuffer(chunk) {
  return new _Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.addEventListener('load', function (e) {
      // e.target.result is an ArrayBuffer
      resolve(e.target.result);
    });
    reader.addEventListener('error', function (err) {
      console.error('FileReader error' + err);
      reject(err);
    });
    // file-type only needs the first 4100 bytes
    reader.readAsArrayBuffer(chunk);
  });
}

function getFileType(file) {
  var extensionsToMime = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'mp4': 'video/mp4',
    'mp3': 'audio/mp3',
    'svg': 'image/svg+xml',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };

  var fileExtension = file.name ? getFileNameAndExtension(file.name).extension : null;

  if (file.isRemote) {
    // some remote providers do not support file types
    var mime = file.type ? file.type : extensionsToMime[fileExtension];
    return _Promise.resolve(mime);
  }

  // 1. try to determine file type from magic bytes with file-type module
  // this should be the most trustworthy way
  var chunk = file.data.slice(0, 4100);
  return getArrayBuffer(chunk).then(function (buffer) {
    var type = fileType(buffer);
    if (type && type.mime) {
      return type.mime;
    }

    // 2. if that’s no good, check if mime type is set in the file object
    if (file.type) {
      return file.type;
    }

    // 3. if that’s no good, see if we can map extension to a mime type
    if (fileExtension && extensionsToMime[fileExtension]) {
      return extensionsToMime[fileExtension];
    }

    // if all fails, well, return empty
    return null;
  }).catch(function () {
    return null;
  });
}

// TODO Check which types are actually supported in browsers. Chrome likes webm
// from my testing, but we may need more.
// We could use a library but they tend to contain dozens of KBs of mappings,
// most of which will go unused, so not sure if that's worth it.
var mimeToExtensions = {
  'video/ogg': 'ogv',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/mp3': 'mp3'
};

function getFileTypeExtension(mimeType) {
  return mimeToExtensions[mimeType] || null;
}

/**
* Takes a full filename string and returns an object {name, extension}
*
* @param {string} fullFileName
* @return {object} {name, extension}
*/
function getFileNameAndExtension(fullFileName) {
  var re = /(?:\.([^.]+))?$/;
  var fileExt = re.exec(fullFileName)[1];
  var fileName = fullFileName.replace('.' + fileExt, '');
  return {
    name: fileName,
    extension: fileExt
  };
}

/**
 * Check if a URL string is an object URL from `URL.createObjectURL`.
 *
 * @param {string} url
 * @return {boolean}
 */
function isObjectURL(url) {
  return url.indexOf('blob:') === 0;
}

function getProportionalHeight(img, width) {
  var aspect = img.width / img.height;
  return Math.round(width / aspect);
}

/**
 * Create a thumbnail for the given Uppy file object.
 *
 * @param {{data: Blob}} file
 * @param {number} width
 * @return {Promise}
 */
function createThumbnail(file, targetWidth) {
  var originalUrl = URL.createObjectURL(file.data);
  var onload = new _Promise(function (resolve, reject) {
    var image = new Image();
    image.src = originalUrl;
    image.onload = function () {
      URL.revokeObjectURL(originalUrl);
      resolve(image);
    };
    image.onerror = function () {
      // The onerror event is totally useless unfortunately, as far as I know
      URL.revokeObjectURL(originalUrl);
      reject(new Error('Could not create thumbnail'));
    };
  });

  return onload.then(function (image) {
    var targetHeight = getProportionalHeight(image, targetWidth);
    var canvas = resizeImage(image, targetWidth, targetHeight);
    return canvasToBlob(canvas, 'image/png');
  }).then(function (blob) {
    return URL.createObjectURL(blob);
  });
}

/**
 * Resize an image to the target `width` and `height`.
 *
 * Returns a Canvas with the resized image on it.
 */
function resizeImage(image, targetWidth, targetHeight) {
  var sourceWidth = image.width;
  var sourceHeight = image.height;

  if (targetHeight < image.height / 2) {
    var steps = Math.floor(Math.log(image.width / targetWidth) / Math.log(2));
    var stepScaled = downScaleInSteps(image, steps);
    image = stepScaled.image;
    sourceWidth = stepScaled.sourceWidth;
    sourceHeight = stepScaled.sourceHeight;
  }

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  var context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Downscale an image by 50% `steps` times.
 */
function downScaleInSteps(image, steps) {
  var source = image;
  var currentWidth = source.width;
  var currentHeight = source.height;

  for (var i = 0; i < steps; i += 1) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = currentWidth / 2;
    canvas.height = currentHeight / 2;
    context.drawImage(source,
    // The entire source image. We pass width and height here,
    // because we reuse this canvas, and should only scale down
    // the part of the canvas that contains the previous scale step.
    0, 0, currentWidth, currentHeight,
    // Draw to 50% size
    0, 0, currentWidth / 2, currentHeight / 2);
    currentWidth /= 2;
    currentHeight /= 2;
    source = canvas;
  }

  return {
    image: source,
    sourceWidth: currentWidth,
    sourceHeight: currentHeight
  };
}

/**
 * Save a <canvas> element's content to a Blob object.
 *
 * @param {HTMLCanvasElement} canvas
 * @return {Promise}
 */
function canvasToBlob(canvas, type, quality) {
  if (canvas.toBlob) {
    return new _Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }
  return _Promise.resolve().then(function () {
    return dataURItoBlob(canvas.toDataURL(type, quality), {});
  });
}

function dataURItoBlob(dataURI, opts, toFile) {
  // get the base64 data
  var data = dataURI.split(',')[1];

  // user may provide mime type, if not get it from data URI
  var mimeType = opts.mimeType || dataURI.split(',')[0].split(':')[1].split(';')[0];

  // default to plain/text if data URI has no mimeType
  if (mimeType == null) {
    mimeType = 'plain/text';
  }

  var binary = atob(data);
  var array = [];
  for (var i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }

  // Convert to a File?
  if (toFile) {
    return new File([new Uint8Array(array)], opts.name || '', { type: mimeType });
  }

  return new Blob([new Uint8Array(array)], { type: mimeType });
}

function dataURItoFile(dataURI, opts) {
  return dataURItoBlob(dataURI, opts, true);
}

/**
 * Copies text to clipboard by creating an almost invisible textarea,
 * adding text there, then running execCommand('copy').
 * Falls back to prompt() when the easy way fails (hello, Safari!)
 * From http://stackoverflow.com/a/30810322
 *
 * @param {String} textToCopy
 * @param {String} fallbackString
 * @return {Promise}
 */
function copyToClipboard(textToCopy, fallbackString) {
  fallbackString = fallbackString || 'Copy the URL below';

  return new _Promise(function (resolve) {
    var textArea = document.createElement('textarea');
    textArea.setAttribute('style', {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '2em',
      height: '2em',
      padding: 0,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent'
    });

    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();

    var magicCopyFailed = function magicCopyFailed() {
      document.body.removeChild(textArea);
      window.prompt(fallbackString, textToCopy);
      resolve();
    };

    try {
      var successful = document.execCommand('copy');
      if (!successful) {
        return magicCopyFailed('copy command unavailable');
      }
      document.body.removeChild(textArea);
      return resolve();
    } catch (err) {
      document.body.removeChild(textArea);
      return magicCopyFailed(err);
    }
  });
}

function getSpeed(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var timeElapsed = new Date() - fileProgress.uploadStarted;
  var uploadSpeed = fileProgress.bytesUploaded / (timeElapsed / 1000);
  return uploadSpeed;
}

function getBytesRemaining(fileProgress) {
  return fileProgress.bytesTotal - fileProgress.bytesUploaded;
}

function getETA(fileProgress) {
  if (!fileProgress.bytesUploaded) return 0;

  var uploadSpeed = getSpeed(fileProgress);
  var bytesRemaining = getBytesRemaining(fileProgress);
  var secondsRemaining = Math.round(bytesRemaining / uploadSpeed * 10) / 10;

  return secondsRemaining;
}

function prettyETA(seconds) {
  var time = secondsToTime(seconds);

  // Only display hours and minutes if they are greater than 0 but always
  // display minutes if hours is being displayed
  // Display a leading zero if the there is a preceding unit: 1m 05s, but 5s
  var hoursStr = time.hours ? time.hours + 'h ' : '';
  var minutesVal = time.hours ? ('0' + time.minutes).substr(-2) : time.minutes;
  var minutesStr = minutesVal ? minutesVal + 'm ' : '';
  var secondsVal = minutesVal ? ('0' + time.seconds).substr(-2) : time.seconds;
  var secondsStr = secondsVal + 's';

  return '' + hoursStr + minutesStr + secondsStr;
}

/**
 * Check if an object is a DOM element. Duck-typing based on `nodeType`.
 *
 * @param {*} obj
 */
function isDOMElement(obj) {
  return obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj.nodeType === Node.ELEMENT_NODE;
}

/**
 * Find a DOM element.
 *
 * @param {Node|string} element
 * @return {Node|null}
 */
function findDOMElement(element) {
  if (typeof element === 'string') {
    return document.querySelector(element);
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return element;
  }
}

/**
 * Find one or more DOM elements.
 *
 * @param {string} element
 * @return {Array|null}
 */
function findAllDOMElements(element) {
  if (typeof element === 'string') {
    var elements = [].slice.call(document.querySelectorAll(element));
    return elements.length > 0 ? elements : null;
  }

  if ((typeof element === 'undefined' ? 'undefined' : _typeof(element)) === 'object' && isDOMElement(element)) {
    return [element];
  }
}

function getSocketHost(url) {
  // get the host domain
  var regex = /^(?:https?:\/\/|\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\n]+)/;
  var host = regex.exec(url)[1];
  var socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

  return socketProtocol + '://' + host;
}

function _emitSocketProgress(uploader, progressData, file) {
  var progress = progressData.progress,
      bytesUploaded = progressData.bytesUploaded,
      bytesTotal = progressData.bytesTotal;

  if (progress) {
    uploader.uppy.log('Upload progress: ' + progress);
    uploader.uppy.emit('upload-progress', {
      uploader: uploader,
      id: file.id,
      bytesUploaded: bytesUploaded,
      bytesTotal: bytesTotal
    });
  }
}

var emitSocketProgress = throttle(_emitSocketProgress, 300, { leading: true, trailing: true });

function settle(promises) {
  var resolutions = [];
  var rejections = [];
  function resolved(value) {
    resolutions.push(value);
  }
  function rejected(error) {
    rejections.push(error);
  }

  var wait = _Promise.all(promises.map(function (promise) {
    return promise.then(resolved, rejected);
  }));

  return wait.then(function () {
    return {
      successful: resolutions,
      failed: rejections
    };
  });
}

/**
 * Limit the amount of simultaneously pending Promises.
 * Returns a function that, when passed a function `fn`,
 * will make sure that at most `limit` calls to `fn` are pending.
 *
 * @param {number} limit
 * @return {function()}
 */
function limitPromises(limit) {
  var pending = 0;
  var queue = [];
  return function (fn) {
    return function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var call = function call() {
        pending++;
        var promise = fn.apply(undefined, args);
        promise.then(onfinish, onfinish);
        return promise;
      };

      if (pending >= limit) {
        return new _Promise(function (resolve, reject) {
          queue.push(function () {
            call().then(resolve, reject);
          });
        });
      }
      return call();
    };
  };
  function onfinish() {
    pending--;
    var next = queue.shift();
    if (next) next();
  }
}

module.exports = {
  generateFileID: generateFileID,
  toArray: toArray,
  getTimeStamp: getTimeStamp,
  runPromiseSequence: runPromiseSequence,
  isTouchDevice: isTouchDevice,
  getFileNameAndExtension: getFileNameAndExtension,
  truncateString: truncateString,
  getFileTypeExtension: getFileTypeExtension,
  getFileType: getFileType,
  getArrayBuffer: getArrayBuffer,
  isPreviewSupported: isPreviewSupported,
  isObjectURL: isObjectURL,
  createThumbnail: createThumbnail,
  secondsToTime: secondsToTime,
  dataURItoBlob: dataURItoBlob,
  dataURItoFile: dataURItoFile,
  canvasToBlob: canvasToBlob,
  getSpeed: getSpeed,
  getBytesRemaining: getBytesRemaining,
  getETA: getETA,
  copyToClipboard: copyToClipboard,
  prettyETA: prettyETA,
  findDOMElement: findDOMElement,
  findAllDOMElements: findAllDOMElements,
  getSocketHost: getSocketHost,
  emitSocketProgress: emitSocketProgress,
  settle: settle,
  limitPromises: limitPromises
};

},{"../vendor/file-type":20,"es6-promise":4,"lodash.throttle":5}],16:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('../core/Utils'),
    toArray = _require.toArray;

var Translator = require('../core/Translator');

var _require2 = require('preact'),
    h = _require2.h;

module.exports = function (_Plugin) {
  _inherits(FileInput, _Plugin);

  function FileInput(uppy, opts) {
    _classCallCheck(this, FileInput);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'FileInput';
    _this.title = 'File Input';
    _this.type = 'acquirer';

    var defaultLocale = {
      strings: {
        chooseFiles: 'Choose files'
      }

      // Default options
    };var defaultOptions = {
      target: null,
      allowMultipleFiles: true,
      pretty: true,
      inputName: 'files[]',
      locale: defaultLocale

      // Merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.render = _this.render.bind(_this);
    _this.handleInputChange = _this.handleInputChange.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    return _this;
  }

  FileInput.prototype.handleInputChange = function handleInputChange(ev) {
    var _this2 = this;

    this.uppy.log('[FileInput] Something selected through input...');

    var files = toArray(ev.target.files);

    files.forEach(function (file) {
      _this2.uppy.addFile({
        source: _this2.id,
        name: file.name,
        type: file.type,
        data: file
      }).catch(function () {
        // Ignore
      });
    });
  };

  FileInput.prototype.handleClick = function handleClick(ev) {
    this.input.click();
  };

  FileInput.prototype.render = function render(state) {
    var _this3 = this;

    var hiddenInputStyle = {
      width: '0.1px',
      height: '0.1px',
      opacity: 0,
      overflow: 'hidden',
      position: 'absolute',
      zIndex: -1
    };

    return h(
      'div',
      { 'class': 'uppy uppy-FileInput-container' },
      h('input', { 'class': 'uppy-FileInput-input',
        style: this.opts.pretty && hiddenInputStyle,
        type: 'file',
        name: this.opts.inputName,
        onchange: this.handleInputChange,
        multiple: this.opts.allowMultipleFiles,
        ref: function ref(input) {
          _this3.input = input;
        } }),
      this.opts.pretty && h(
        'button',
        { 'class': 'uppy-FileInput-btn', type: 'button', onclick: this.handleClick },
        this.i18n('chooseFiles')
      )
    );
  };

  FileInput.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  FileInput.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return FileInput;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/Utils":15,"preact":8}],17:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Plugin = require('../core/Plugin');

var _require = require('preact'),
    h = _require.h;

/**
 * Progress bar
 *
 */


module.exports = function (_Plugin) {
  _inherits(ProgressBar, _Plugin);

  function ProgressBar(uppy, opts) {
    _classCallCheck(this, ProgressBar);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.id = _this.opts.id || 'ProgressBar';
    _this.title = 'Progress Bar';
    _this.type = 'progressindicator';

    // set default options
    var defaultOptions = {
      target: 'body',
      replaceTargetContent: false,
      fixed: false,
      hideAfterFinish: true

      // merge default options with the ones set by user
    };_this.opts = _extends({}, defaultOptions, opts);

    _this.render = _this.render.bind(_this);
    return _this;
  }

  ProgressBar.prototype.render = function render(state) {
    var progress = state.totalProgress || 0;
    var isHidden = progress === 100 && this.opts.hideAfterFinish;
    return h(
      'div',
      { 'class': 'uppy uppy-ProgressBar', style: { position: this.opts.fixed ? 'fixed' : 'initial' }, 'aria-hidden': isHidden },
      h('div', { 'class': 'uppy-ProgressBar-inner', style: { width: progress + '%' } }),
      h(
        'div',
        { 'class': 'uppy-ProgressBar-percentage' },
        progress
      )
    );
  };

  ProgressBar.prototype.install = function install() {
    var target = this.opts.target;
    if (target) {
      this.mount(target, this);
    }
  };

  ProgressBar.prototype.uninstall = function uninstall() {
    this.unmount();
  };

  return ProgressBar;
}(Plugin);

},{"../core/Plugin":12,"preact":8}],18:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

var Plugin = require('../core/Plugin');
var cuid = require('cuid');
var Translator = require('../core/Translator');
var UppySocket = require('../core/UppySocket');

var _require = require('../core/Utils'),
    emitSocketProgress = _require.emitSocketProgress,
    getSocketHost = _require.getSocketHost,
    settle = _require.settle,
    limitPromises = _require.limitPromises;

module.exports = function (_Plugin) {
  _inherits(XHRUpload, _Plugin);

  function XHRUpload(uppy, opts) {
    _classCallCheck(this, XHRUpload);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, uppy, opts));

    _this.type = 'uploader';
    _this.id = 'XHRUpload';
    _this.title = 'XHRUpload';

    var defaultLocale = {
      strings: {
        timedOut: 'Upload stalled for %{seconds} seconds, aborting.'
      }

      // Default options
    };var defaultOptions = {
      formData: true,
      fieldName: 'files[]',
      method: 'post',
      metaFields: null,
      responseUrlFieldName: 'url',
      bundle: false,
      headers: {},
      locale: defaultLocale,
      timeout: 30 * 1000,
      limit: 0,
      /**
       * @typedef respObj
       * @property {string} responseText
       * @property {number} status
       * @property {string} statusText
       * @property {Object.<string, string>} headers
       *
       * @param {string} responseContent the response body
       * @param {XMLHttpRequest | respObj} responseObject the response object
       */
      getResponseData: function getResponseData(responseContent, responseObject) {
        var response = {};
        try {
          response = JSON.parse(responseContent);
        } catch (err) {
          this.uppy.log(err, 'error');
        }

        return response;
      },

      /**
       *
       * @param {string} responseContent the response body
       * @param {XMLHttpRequest | respObj} responseObject the response object
       */
      getResponseError: function getResponseError(responseContent, responseObject) {
        return new Error('Upload error');
      }
    };

    // Merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);
    _this.locale = _extends({}, defaultLocale, _this.opts.locale);
    _this.locale.strings = _extends({}, defaultLocale.strings, _this.opts.locale.strings);

    // i18n
    _this.translator = new Translator({ locale: _this.locale });
    _this.i18n = _this.translator.translate.bind(_this.translator);

    _this.handleUpload = _this.handleUpload.bind(_this);

    // Simultaneous upload limiting is shared across all uploads with this plugin.
    if (typeof _this.opts.limit === 'number' && _this.opts.limit !== 0) {
      _this.limitUploads = limitPromises(_this.opts.limit);
    } else {
      _this.limitUploads = function (fn) {
        return fn;
      };
    }

    if (_this.opts.bundle && !_this.opts.formData) {
      throw new Error('`opts.formData` must be true when `opts.bundle` is enabled.');
    }
    return _this;
  }

  XHRUpload.prototype.getOptions = function getOptions(file) {
    var opts = _extends({}, this.opts, this.uppy.state.xhrUpload || {}, file.xhrUpload || {});
    opts.headers = {};
    _extends(opts.headers, this.opts.headers);
    if (this.uppy.state.xhrUpload) {
      _extends(opts.headers, this.uppy.state.xhrUpload.headers);
    }
    if (file.xhrUpload) {
      _extends(opts.headers, file.xhrUpload.headers);
    }

    return opts;
  };

  // Helper to abort upload requests if there has not been any progress for `timeout` ms.
  // Create an instance using `timer = createProgressTimeout(10000, onTimeout)`
  // Call `timer.progress()` to signal that there has been progress of any kind.
  // Call `timer.done()` when the upload has completed.


  XHRUpload.prototype.createProgressTimeout = function createProgressTimeout(timeout, timeoutHandler) {
    var uppy = this.uppy;
    var self = this;
    function onTimedOut() {
      uppy.log('[XHRUpload] timed out');
      var error = new Error(self.i18n('timedOut', { seconds: Math.ceil(timeout / 1000) }));
      timeoutHandler(error);
    }

    var aliveTimer = null;
    function progress() {
      if (timeout > 0) {
        done();
        aliveTimer = setTimeout(onTimedOut, timeout);
      }
    }

    function done() {
      if (aliveTimer) {
        clearTimeout(aliveTimer);
        aliveTimer = null;
      }
    }

    return {
      progress: progress,
      done: done
    };
  };

  XHRUpload.prototype.createFormDataUpload = function createFormDataUpload(file, opts) {
    var formPost = new FormData();

    var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
    // Send along all fields by default.
    : Object.keys(file.meta);
    metaFields.forEach(function (item) {
      formPost.append(item, file.meta[item]);
    });

    formPost.append(opts.fieldName, file.data);

    return formPost;
  };

  XHRUpload.prototype.createBareUpload = function createBareUpload(file, opts) {
    return file.data;
  };

  XHRUpload.prototype.upload = function upload(file, current, total) {
    var _this2 = this;

    var opts = this.getOptions(file);

    this.uppy.log('uploading ' + current + ' of ' + total);
    return new _Promise(function (resolve, reject) {
      var data = opts.formData ? _this2.createFormDataUpload(file, opts) : _this2.createBareUpload(file, opts);

      var timer = _this2.createProgressTimeout(opts.timeout, function (error) {
        xhr.abort();
        _this2.uppy.emit('upload-error', file.id, error);
        reject(error);
      });

      var xhr = new XMLHttpRequest();
      var id = cuid();

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' started');
        // Begin checking for timeouts when loading starts.
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' progress: ' + ev.loaded + ' / ' + ev.total);
        timer.progress();

        if (ev.lengthComputable) {
          _this2.uppy.emit('upload-progress', {
            uploader: _this2,
            id: file.id,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        }
      });

      xhr.addEventListener('load', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' finished');
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var resp = opts.getResponseData(xhr.responseText, xhr);
          var uploadURL = resp[opts.responseUrlFieldName];

          _this2.uppy.emit('upload-success', file.id, resp, uploadURL);

          if (uploadURL) {
            _this2.uppy.log('Download ' + file.name + ' from ' + file.uploadURL);
          }

          return resolve(file);
        } else {
          var error = opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
          error.request = xhr;
          _this2.uppy.emit('upload-error', file.id, error);
          return reject(error);
        }
      });

      xhr.addEventListener('error', function (ev) {
        _this2.uppy.log('[XHRUpload] ' + id + ' errored');
        timer.done();

        var error = opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        _this2.uppy.emit('upload-error', file.id, error);
        return reject(error);
      });

      xhr.open(opts.method.toUpperCase(), opts.endpoint, true);

      Object.keys(opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, opts.headers[header]);
      });

      xhr.send(data);

      _this2.uppy.on('upload-cancel', function (fileID) {
        if (fileID === file.id) {
          xhr.abort();
        }
      });

      _this2.uppy.on('cancel-all', function () {
        // const files = this.uppy.getState().files
        // if (!files[file.id]) return
        xhr.abort();
      });
    });
  };

  XHRUpload.prototype.uploadRemote = function uploadRemote(file, current, total) {
    var _this3 = this;

    var opts = this.getOptions(file);
    return new _Promise(function (resolve, reject) {
      var fields = {};
      var metaFields = Array.isArray(opts.metaFields) ? opts.metaFields
      // Send along all fields by default.
      : Object.keys(file.meta);

      metaFields.forEach(function (name) {
        fields[name] = file.meta[name];
      });

      fetch(file.remote.url, {
        method: 'post',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_extends({}, file.remote.body, {
          endpoint: opts.endpoint,
          size: file.data.size,
          fieldname: opts.fieldName,
          metadata: fields,
          headers: opts.headers
        }))
      }).then(function (res) {
        if (res.status < 200 && res.status > 300) {
          return reject(res.statusText);
        }

        res.json().then(function (data) {
          var token = data.token;
          var host = getSocketHost(file.remote.host);
          var socket = new UppySocket({ target: host + '/api/' + token });

          socket.on('progress', function (progressData) {
            return emitSocketProgress(_this3, progressData, file);
          });

          socket.on('success', function (data) {
            var resp = opts.getResponseData(data.response.responseText, data.response);
            var uploadURL = resp[opts.responseUrlFieldName];
            _this3.uppy.emit('upload-success', file.id, resp, uploadURL);
            socket.close();
            return resolve();
          });

          socket.on('error', function (errData) {
            var resp = errData.response;
            var error = resp ? opts.getResponseError(resp.responseText, resp) : new Error(errData.error);
            _this3.uppy.emit('upload-error', file.id, error);
            reject(new Error(errData.error));
          });
        });
      });
    });
  };

  XHRUpload.prototype.uploadBundle = function uploadBundle(files) {
    var _this4 = this;

    return new _Promise(function (resolve, reject) {
      var endpoint = _this4.opts.endpoint;
      var method = _this4.opts.method;

      var formData = new FormData();
      files.forEach(function (file, i) {
        var opts = _this4.getOptions(file);
        formData.append(opts.fieldName, file.data);
      });

      var xhr = new XMLHttpRequest();

      var timer = _this4.createProgressTimeout(_this4.opts.timeout, function (error) {
        xhr.abort();
        emitError(error);
        reject(error);
      });

      var emitError = function emitError(error) {
        files.forEach(function (file) {
          _this4.uppy.emit('upload-error', file.id, error);
        });
      };

      xhr.upload.addEventListener('loadstart', function (ev) {
        _this4.uppy.log('[XHRUpload] started uploading bundle');
        timer.progress();
      });

      xhr.upload.addEventListener('progress', function (ev) {
        timer.progress();

        if (!ev.lengthComputable) return;

        files.forEach(function (file) {
          _this4.uppy.emit('upload-progress', {
            uploader: _this4,
            id: file.id,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total
          });
        });
      });

      xhr.addEventListener('load', function (ev) {
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          var resp = _this4.opts.getResponseData(xhr.responseText, xhr);
          files.forEach(function (file) {
            _this4.uppy.emit('upload-success', file.id, resp);
          });
          return resolve();
        }

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        error.request = xhr;
        emitError(error);
        return reject(error);
      });

      xhr.addEventListener('error', function (ev) {
        timer.done();

        var error = _this4.opts.getResponseError(xhr.responseText, xhr) || new Error('Upload error');
        emitError(error);
        return reject(error);
      });

      _this4.uppy.on('cancel-all', function () {
        xhr.abort();
      });

      xhr.open(method.toUpperCase(), endpoint, true);

      Object.keys(_this4.opts.headers).forEach(function (header) {
        xhr.setRequestHeader(header, _this4.opts.headers[header]);
      });

      xhr.send(formData);

      files.forEach(function (file) {
        _this4.uppy.emit('upload-started', file.id);
      });
    });
  };

  XHRUpload.prototype.uploadFiles = function uploadFiles(files) {
    var _this5 = this;

    var actions = files.map(function (file, i) {
      var current = parseInt(i, 10) + 1;
      var total = files.length;

      if (file.error) {
        return function () {
          return _Promise.reject(new Error(file.error));
        };
      } else if (file.isRemote) {
        // We emit upload-started here, so that it's also emitted for files
        // that have to wait due to the `limit` option.
        _this5.uppy.emit('upload-started', file.id);
        return _this5.uploadRemote.bind(_this5, file, current, total);
      } else {
        _this5.uppy.emit('upload-started', file.id);
        return _this5.upload.bind(_this5, file, current, total);
      }
    });

    var promises = actions.map(function (action) {
      var limitedAction = _this5.limitUploads(action);
      return limitedAction();
    });

    return settle(promises);
  };

  XHRUpload.prototype.handleUpload = function handleUpload(fileIDs) {
    var _this6 = this;

    if (fileIDs.length === 0) {
      this.uppy.log('[XHRUpload] No files to upload!');
      return _Promise.resolve();
    }

    this.uppy.log('[XHRUpload] Uploading...');
    var files = fileIDs.map(function (fileID) {
      return _this6.uppy.getFile(fileID);
    });

    if (this.opts.bundle) {
      return this.uploadBundle(files);
    }

    return this.uploadFiles(files).then(function () {
      return null;
    });
  };

  XHRUpload.prototype.install = function install() {
    this.uppy.addUploader(this.handleUpload);
  };

  XHRUpload.prototype.uninstall = function uninstall() {
    this.uppy.removeUploader(this.handleUpload);
  };

  return XHRUpload;
}(Plugin);

},{"../core/Plugin":12,"../core/Translator":13,"../core/UppySocket":14,"../core/Utils":15,"cuid":1,"es6-promise":4}],19:[function(require,module,exports){
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Default store that keeps state in a simple object.
 */
var DefaultStore = function () {
  function DefaultStore() {
    _classCallCheck(this, DefaultStore);

    this.state = {};
    this.callbacks = [];
  }

  DefaultStore.prototype.getState = function getState() {
    return this.state;
  };

  DefaultStore.prototype.setState = function setState(patch) {
    var prevState = _extends({}, this.state);
    var nextState = _extends({}, this.state, patch);

    this.state = nextState;
    this._publish(prevState, nextState, patch);
  };

  DefaultStore.prototype.subscribe = function subscribe(listener) {
    var _this = this;

    this.callbacks.push(listener);
    return function () {
      // Remove the listener.
      _this.callbacks.splice(_this.callbacks.indexOf(listener), 1);
    };
  };

  DefaultStore.prototype._publish = function _publish() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this.callbacks.forEach(function (listener) {
      listener.apply(undefined, args);
    });
  };

  return DefaultStore;
}();

module.exports = function defaultStore() {
  return new DefaultStore();
};

},{}],20:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

module.exports = function (input) {
	var buf = new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	var check = function check(header, opts) {
		opts = _extends({
			offset: 0
		}, opts);

		for (var i = 0; i < header.length; i++) {
			if (header[i] !== buf[i + opts.offset]) {
				return false;
			}
		}

		return true;
	};

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], { offset: 8 })) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if ((check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) && check([0x43, 0x52], { offset: 8 })) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Needs to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], { offset: 30 })) {
		return {
			ext: 'epub',
			mime: 'application/epub+zip'
		};
	}

	// Needs to be before `zip` check
	// Assumes signed `.xpi` from addons.mozilla.org
	if (check([0x50, 0x4B, 0x3, 0x4]) && check([0x4D, 0x45, 0x54, 0x41, 0x2D, 0x49, 0x4E, 0x46, 0x2F, 0x6D, 0x6F, 0x7A, 0x69, 0x6C, 0x6C, 0x61, 0x2E, 0x72, 0x73, 0x61], { offset: 30 })) {
		return {
			ext: 'xpi',
			mime: 'application/x-xpinstall'
		};
	}

	if (check([0x50, 0x4B]) && (buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) && (buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], { offset: 257 })) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) && (buf[6] === 0x0 || buf[6] === 0x1)) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x0, 0x0, 0x0]) && (buf[3] === 0x18 || buf[3] === 0x20) && check([0x66, 0x74, 0x79, 0x70], { offset: 4 }) || check([0x33, 0x67, 0x70, 0x35]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]) && check([0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D], { offset: 16 }) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]) || check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 0x0, 0x0, 0x0, 0x0])) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56])) {
		return {
			ext: 'm4v',
			mime: 'video/x-m4v'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		var sliced = buf.subarray(4, 4 + 4096);
		var idPos = sliced.findIndex(function (el, i, arr) {
			return arr[i] === 0x42 && arr[i + 1] === 0x82;
		});

		if (idPos >= 0) {
			var docTypePos = idPos + 3;
			var findDocType = function findDocType(type) {
				return Array.from(type).every(function (c, i) {
					return sliced[docTypePos + i] === c.charCodeAt(0);
				});
			};

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) || check([0x66, 0x72, 0x65, 0x65], { offset: 4 }) || check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], { offset: 4 }) || check([0x6D, 0x64, 0x61, 0x74], { offset: 4 }) || // MJPEG
	check([0x77, 0x69, 0x64, 0x65], { offset: 4 })) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x41, 0x56, 0x49], { offset: 8 })) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (check([0x0, 0x0, 0x1, 0xBA])) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x49, 0x44, 0x33]) || check([0xFF, 0xFB])) {
		return {
			ext: 'mp3',
			mime: 'audio/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], { offset: 4 }) || check([0x4D, 0x34, 0x41, 0x20])) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], { offset: 28 })) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	if (check([0x4F, 0x67, 0x67, 0x53])) {
		return {
			ext: 'ogg',
			mime: 'audio/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x41, 0x56, 0x45], { offset: 8 })) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if ((buf[0] === 0x43 || buf[0] === 0x46) && check([0x57, 0x53], { offset: 1 })) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x46]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (check([0x77, 0x4F, 0x46, 0x32]) && (check([0x00, 0x01, 0x00, 0x00], { offset: 4 }) || check([0x4F, 0x54, 0x54, 0x4F], { offset: 4 }))) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (check([0x4C, 0x50], { offset: 34 }) && (check([0x00, 0x00, 0x01], { offset: 8 }) || check([0x01, 0x00, 0x02], { offset: 8 }) || check([0x02, 0x00, 0x02], { offset: 8 }))) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (check([0x4D, 0x53, 0x43, 0x46]) || check([0x49, 0x53, 0x63, 0x28])) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (check([0x1F, 0xA0]) || check([0x1F, 0x9D])) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], { offset: 4 }) && (check([0x47], { offset: 192 }) || check([0x47], { offset: 196 }))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	return null;
};

},{}],21:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],22:[function(require,module,exports){
'use strict';

var Uppy = require('/home/travis/build/transloadit/uppy/src/core/Core');
var FileInput = require('/home/travis/build/transloadit/uppy/src/plugins/FileInput');
var XHRUpload = require('/home/travis/build/transloadit/uppy/src/plugins/XHRUpload');
var ProgressBar = require('/home/travis/build/transloadit/uppy/src/plugins/ProgressBar');

var uppy = new Uppy({ debug: true, autoProceed: true });
uppy.use(FileInput, { target: '.UppyForm', replaceTargetContent: true });
uppy.use(XHRUpload, {
  endpoint: '//api2.transloadit.com',
  formData: true,
  fieldName: 'files[]'
});
uppy.use(ProgressBar, {
  target: 'body',
  fixed: true,
  hideAfterFinish: false
});
uppy.run();

console.log('Uppy with Formtag and XHRUpload is loaded');

},{"/home/travis/build/transloadit/uppy/src/core/Core":11,"/home/travis/build/transloadit/uppy/src/plugins/FileInput":16,"/home/travis/build/transloadit/uppy/src/plugins/ProgressBar":17,"/home/travis/build/transloadit/uppy/src/plugins/XHRUpload":18}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvY3VpZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9jdWlkL2xpYi9maW5nZXJwcmludC5icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2N1aWQvbGliL3BhZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9taW1lLW1hdGNoL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL25hbWVzcGFjZS1lbWl0dGVyL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wcmV0dGllci1ieXRlcy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aWxkY2FyZC9pbmRleC5qcyIsIi4uL3NyYy9jb3JlL0NvcmUuanMiLCIuLi9zcmMvY29yZS9QbHVnaW4uanMiLCIuLi9zcmMvY29yZS9UcmFuc2xhdG9yLmpzIiwiLi4vc3JjL2NvcmUvVXBweVNvY2tldC5qcyIsIi4uL3NyYy9jb3JlL1V0aWxzLmpzIiwiLi4vc3JjL3BsdWdpbnMvRmlsZUlucHV0LmpzIiwiLi4vc3JjL3BsdWdpbnMvUHJvZ3Jlc3NCYXIuanMiLCIuLi9zcmMvcGx1Z2lucy9YSFJVcGxvYWQuanMiLCIuLi9zcmMvc3RvcmUvRGVmYXVsdFN0b3JlLmpzIiwiLi4vc3JjL3ZlbmRvci9maWxlLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2V4YW1wbGVzL3hocnVwbG9hZC9hcHAuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hMQSxJQUFNLE9BQU8sUUFBUSxvQkFBUixDQUFiO0FBQ0EsSUFBTSxZQUFZLFFBQVEsNEJBQVIsQ0FBbEI7QUFDQSxJQUFNLFlBQVksUUFBUSw0QkFBUixDQUFsQjtBQUNBLElBQU0sY0FBYyxRQUFRLDhCQUFSLENBQXBCOztBQUVBLElBQU0sT0FBTyxJQUFJLElBQUosQ0FBUyxFQUFFLE9BQU8sSUFBVCxFQUFlLGFBQWEsSUFBNUIsRUFBVCxDQUFiO0FBQ0EsS0FBSyxHQUFMLENBQVMsU0FBVCxFQUFvQixFQUFFLFFBQVEsV0FBVixFQUF1QixzQkFBc0IsSUFBN0MsRUFBcEI7QUFDQSxLQUFLLEdBQUwsQ0FBUyxTQUFULEVBQW9CO0FBQ2xCLFlBQVUsd0JBRFE7QUFFbEIsWUFBVSxJQUZRO0FBR2xCLGFBQVc7QUFITyxDQUFwQjtBQUtBLEtBQUssR0FBTCxDQUFTLFdBQVQsRUFBc0I7QUFDcEIsVUFBUSxNQURZO0FBRXBCLFNBQU8sSUFGYTtBQUdwQixtQkFBaUI7QUFIRyxDQUF0QjtBQUtBLEtBQUssR0FBTDs7QUFFQSxRQUFRLEdBQVIsQ0FBWSwyQ0FBWiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIGN1aWQuanNcbiAqIENvbGxpc2lvbi1yZXNpc3RhbnQgVUlEIGdlbmVyYXRvciBmb3IgYnJvd3NlcnMgYW5kIG5vZGUuXG4gKiBTZXF1ZW50aWFsIGZvciBmYXN0IGRiIGxvb2t1cHMgYW5kIHJlY2VuY3kgc29ydGluZy5cbiAqIFNhZmUgZm9yIGVsZW1lbnQgSURzIGFuZCBzZXJ2ZXItc2lkZSBsb29rdXBzLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIENMQ1RSXG4gKlxuICogQ29weXJpZ2h0IChjKSBFcmljIEVsbGlvdHQgMjAxMlxuICogTUlUIExpY2Vuc2VcbiAqL1xuXG52YXIgZmluZ2VycHJpbnQgPSByZXF1aXJlKCcuL2xpYi9maW5nZXJwcmludC5qcycpO1xudmFyIHBhZCA9IHJlcXVpcmUoJy4vbGliL3BhZC5qcycpO1xuXG52YXIgYyA9IDAsXG4gIGJsb2NrU2l6ZSA9IDQsXG4gIGJhc2UgPSAzNixcbiAgZGlzY3JldGVWYWx1ZXMgPSBNYXRoLnBvdyhiYXNlLCBibG9ja1NpemUpO1xuXG5mdW5jdGlvbiByYW5kb21CbG9jayAoKSB7XG4gIHJldHVybiBwYWQoKE1hdGgucmFuZG9tKCkgKlxuICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xufVxuXG5mdW5jdGlvbiBzYWZlQ291bnRlciAoKSB7XG4gIGMgPSBjIDwgZGlzY3JldGVWYWx1ZXMgPyBjIDogMDtcbiAgYysrOyAvLyB0aGlzIGlzIG5vdCBzdWJsaW1pbmFsXG4gIHJldHVybiBjIC0gMTtcbn1cblxuZnVuY3Rpb24gY3VpZCAoKSB7XG4gIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gIC8vIGl0IEhUTUwgZWxlbWVudCBJRCBmcmllbmRseS5cbiAgdmFyIGxldHRlciA9ICdjJywgLy8gaGFyZC1jb2RlZCBhbGxvd3MgZm9yIHNlcXVlbnRpYWwgYWNjZXNzXG5cbiAgICAvLyB0aW1lc3RhbXBcbiAgICAvLyB3YXJuaW5nOiB0aGlzIGV4cG9zZXMgdGhlIGV4YWN0IGRhdGUgYW5kIHRpbWVcbiAgICAvLyB0aGF0IHRoZSB1aWQgd2FzIGNyZWF0ZWQuXG4gICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgIC8vIFByZXZlbnQgc2FtZS1tYWNoaW5lIGNvbGxpc2lvbnMuXG4gICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpLFxuXG4gICAgLy8gQSBmZXcgY2hhcnMgdG8gZ2VuZXJhdGUgZGlzdGluY3QgaWRzIGZvciBkaWZmZXJlbnRcbiAgICAvLyBjbGllbnRzIChzbyBkaWZmZXJlbnQgY29tcHV0ZXJzIGFyZSBmYXIgbGVzc1xuICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICBwcmludCA9IGZpbmdlcnByaW50KCksXG5cbiAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICByYW5kb20gPSByYW5kb21CbG9jaygpICsgcmFuZG9tQmxvY2soKTtcblxuICByZXR1cm4gbGV0dGVyICsgdGltZXN0YW1wICsgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xufVxuXG5jdWlkLnNsdWcgPSBmdW5jdGlvbiBzbHVnICgpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKS50b1N0cmluZygzNiksXG4gICAgY291bnRlciA9IHNhZmVDb3VudGVyKCkudG9TdHJpbmcoMzYpLnNsaWNlKC00KSxcbiAgICBwcmludCA9IGZpbmdlcnByaW50KCkuc2xpY2UoMCwgMSkgK1xuICAgICAgZmluZ2VycHJpbnQoKS5zbGljZSgtMSksXG4gICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKS5zbGljZSgtMik7XG5cbiAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICtcbiAgICBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG59O1xuXG5jdWlkLmZpbmdlcnByaW50ID0gZmluZ2VycHJpbnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gY3VpZDtcbiIsInZhciBwYWQgPSByZXF1aXJlKCcuL3BhZC5qcycpO1xuXG52YXIgZW52ID0gdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgPyB3aW5kb3cgOiBzZWxmO1xudmFyIGdsb2JhbENvdW50ID0gT2JqZWN0LmtleXMoZW52KTtcbnZhciBtaW1lVHlwZXNMZW5ndGggPSBuYXZpZ2F0b3IubWltZVR5cGVzID8gbmF2aWdhdG9yLm1pbWVUeXBlcy5sZW5ndGggOiAwO1xudmFyIGNsaWVudElkID0gcGFkKChtaW1lVHlwZXNMZW5ndGggK1xuICBuYXZpZ2F0b3IudXNlckFnZW50Lmxlbmd0aCkudG9TdHJpbmcoMzYpICtcbiAgZ2xvYmFsQ291bnQudG9TdHJpbmcoMzYpLCA0KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmaW5nZXJwcmludCAoKSB7XG4gIHJldHVybiBjbGllbnRJZDtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhZCAobnVtLCBzaXplKSB7XG4gIHZhciBzID0gJzAwMDAwMDAwMCcgKyBudW07XG4gIHJldHVybiBzLnN1YnN0cihzLmxlbmd0aCAtIHNpemUpO1xufTtcbiIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9zdGVmYW5wZW5uZXIvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgdjQuMi4yKzk3NDc4ZWI2XG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuXHQoZ2xvYmFsLkVTNlByb21pc2UgPSBmYWN0b3J5KCkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKCkgeyAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB4O1xuICByZXR1cm4geCAhPT0gbnVsbCAmJiAodHlwZSA9PT0gJ29iamVjdCcgfHwgdHlwZSA9PT0gJ2Z1bmN0aW9uJyk7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG5cblxuXG52YXIgX2lzQXJyYXkgPSB2b2lkIDA7XG5pZiAoQXJyYXkuaXNBcnJheSkge1xuICBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG59IGVsc2Uge1xuICBfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcbn1cblxudmFyIGlzQXJyYXkgPSBfaXNBcnJheTtcblxudmFyIGxlbiA9IDA7XG52YXIgdmVydHhOZXh0ID0gdm9pZCAwO1xudmFyIGN1c3RvbVNjaGVkdWxlckZuID0gdm9pZCAwO1xuXG52YXIgYXNhcCA9IGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICBxdWV1ZVtsZW5dID0gY2FsbGJhY2s7XG4gIHF1ZXVlW2xlbiArIDFdID0gYXJnO1xuICBsZW4gKz0gMjtcbiAgaWYgKGxlbiA9PT0gMikge1xuICAgIC8vIElmIGxlbiBpcyAyLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICBpZiAoY3VzdG9tU2NoZWR1bGVyRm4pIHtcbiAgICAgIGN1c3RvbVNjaGVkdWxlckZuKGZsdXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gc2V0U2NoZWR1bGVyKHNjaGVkdWxlRm4pIHtcbiAgY3VzdG9tU2NoZWR1bGVyRm4gPSBzY2hlZHVsZUZuO1xufVxuXG5mdW5jdGlvbiBzZXRBc2FwKGFzYXBGbikge1xuICBhc2FwID0gYXNhcEZuO1xufVxuXG52YXIgYnJvd3NlcldpbmRvdyA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdW5kZWZpbmVkO1xudmFyIGJyb3dzZXJHbG9iYWwgPSBicm93c2VyV2luZG93IHx8IHt9O1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbnZhciBpc05vZGUgPSB0eXBlb2Ygc2VsZiA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbnZhciBpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbi8vIG5vZGVcbmZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICAvLyBub2RlIHZlcnNpb24gMC4xMC54IGRpc3BsYXlzIGEgZGVwcmVjYXRpb24gd2FybmluZyB3aGVuIG5leHRUaWNrIGlzIHVzZWQgcmVjdXJzaXZlbHlcbiAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvd2hlbi9pc3N1ZXMvNDEwIGZvciBkZXRhaWxzXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICB9O1xufVxuXG4vLyB2ZXJ0eFxuZnVuY3Rpb24gdXNlVmVydHhUaW1lcigpIHtcbiAgaWYgKHR5cGVvZiB2ZXJ0eE5leHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZlcnR4TmV4dChmbHVzaCk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB1c2VTZXRUaW1lb3V0KCk7XG59XG5cbmZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gIHZhciBpdGVyYXRpb25zID0gMDtcbiAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgbm9kZS5kYXRhID0gaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDI7XG4gIH07XG59XG5cbi8vIHdlYiB3b3JrZXJcbmZ1bmN0aW9uIHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAvLyBTdG9yZSBzZXRUaW1lb3V0IHJlZmVyZW5jZSBzbyBlczYtcHJvbWlzZSB3aWxsIGJlIHVuYWZmZWN0ZWQgYnlcbiAgLy8gb3RoZXIgY29kZSBtb2RpZnlpbmcgc2V0VGltZW91dCAobGlrZSBzaW5vbi51c2VGYWtlVGltZXJzKCkpXG4gIHZhciBnbG9iYWxTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZ2xvYmFsU2V0VGltZW91dChmbHVzaCwgMSk7XG4gIH07XG59XG5cbnZhciBxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcbmZ1bmN0aW9uIGZsdXNoKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gcXVldWVbaV07XG4gICAgdmFyIGFyZyA9IHF1ZXVlW2kgKyAxXTtcblxuICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICBxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICBxdWV1ZVtpICsgMV0gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBsZW4gPSAwO1xufVxuXG5mdW5jdGlvbiBhdHRlbXB0VmVydHgoKSB7XG4gIHRyeSB7XG4gICAgdmFyIHIgPSByZXF1aXJlO1xuICAgIHZhciB2ZXJ0eCA9IHIoJ3ZlcnR4Jyk7XG4gICAgdmVydHhOZXh0ID0gdmVydHgucnVuT25Mb29wIHx8IHZlcnR4LnJ1bk9uQ29udGV4dDtcbiAgICByZXR1cm4gdXNlVmVydHhUaW1lcigpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHVzZVNldFRpbWVvdXQoKTtcbiAgfVxufVxuXG52YXIgc2NoZWR1bGVGbHVzaCA9IHZvaWQgMDtcbi8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG5pZiAoaXNOb2RlKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xufSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xufSBlbHNlIGlmIChpc1dvcmtlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTWVzc2FnZUNoYW5uZWwoKTtcbn0gZWxzZSBpZiAoYnJvd3NlcldpbmRvdyA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSBhdHRlbXB0VmVydHgoKTtcbn0gZWxzZSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG59XG5cbmZ1bmN0aW9uIHRoZW4ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgdmFyIHBhcmVudCA9IHRoaXM7XG5cbiAgdmFyIGNoaWxkID0gbmV3IHRoaXMuY29uc3RydWN0b3Iobm9vcCk7XG5cbiAgaWYgKGNoaWxkW1BST01JU0VfSURdID09PSB1bmRlZmluZWQpIHtcbiAgICBtYWtlUHJvbWlzZShjaGlsZCk7XG4gIH1cblxuICB2YXIgX3N0YXRlID0gcGFyZW50Ll9zdGF0ZTtcblxuXG4gIGlmIChfc3RhdGUpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbX3N0YXRlIC0gMV07XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gaW52b2tlQ2FsbGJhY2soX3N0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHBhcmVudC5fcmVzdWx0KTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICB9XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG4vKipcbiAgYFByb21pc2UucmVzb2x2ZWAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZXNvbHZlZCB3aXRoIHRoZVxuICBwYXNzZWQgYHZhbHVlYC4gSXQgaXMgc2hvcnRoYW5kIGZvciB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlc29sdmUoMSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKDEpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gdmFsdWUgPT09IDFcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVzb2x2ZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSB2YWx1ZSB2YWx1ZSB0aGF0IHRoZSByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aFxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIGZ1bGZpbGxlZCB3aXRoIHRoZSBnaXZlblxuICBgdmFsdWVgXG4qL1xuZnVuY3Rpb24gcmVzb2x2ZSQxKG9iamVjdCkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gIGlmIChvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0LmNvbnN0cnVjdG9yID09PSBDb25zdHJ1Y3Rvcikge1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcbiAgcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxudmFyIFBST01JU0VfSUQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoMTYpO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxudmFyIFBFTkRJTkcgPSB2b2lkIDA7XG52YXIgRlVMRklMTEVEID0gMTtcbnZhciBSRUpFQ1RFRCA9IDI7XG5cbnZhciBHRVRfVEhFTl9FUlJPUiA9IG5ldyBFcnJvck9iamVjdCgpO1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIEdFVF9USEVOX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgcmV0dXJuIEdFVF9USEVOX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyeVRoZW4odGhlbiQkMSwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICB0cnkge1xuICAgIHRoZW4kJDEuY2FsbCh2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbiQkMSkge1xuICBhc2FwKGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgIHZhciBlcnJvciA9IHRyeVRoZW4odGhlbiQkMSwgdGhlbmFibGUsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgaWYgKHRoZW5hYmxlICE9PSB2YWx1ZSkge1xuICAgICAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIGlmIChzZWFsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICB9XG4gIH0sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICBpZiAodGhlbmFibGUuX3N0YXRlID09PSBGVUxGSUxMRUQpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2UgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIHJldHVybiByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpIHtcbiAgaWYgKG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IgPT09IHByb21pc2UuY29uc3RydWN0b3IgJiYgdGhlbiQkMSA9PT0gdGhlbiAmJiBtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yLnJlc29sdmUgPT09IHJlc29sdmUkMSkge1xuICAgIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICB9IGVsc2Uge1xuICAgIGlmICh0aGVuJCQxID09PSBHRVRfVEhFTl9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgIEdFVF9USEVOX0VSUk9SLmVycm9yID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRoZW4kJDEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odGhlbiQkMSkpIHtcbiAgICAgIGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuJCQxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZnVsZmlsbChwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICByZWplY3QocHJvbWlzZSwgc2VsZkZ1bGZpbGxtZW50KCkpO1xuICB9IGVsc2UgaWYgKG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSwgZ2V0VGhlbih2YWx1ZSkpO1xuICB9IGVsc2Uge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgfVxuXG4gIHB1Ymxpc2gocHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcHJvbWlzZS5fcmVzdWx0ID0gdmFsdWU7XG4gIHByb21pc2UuX3N0YXRlID0gRlVMRklMTEVEO1xuXG4gIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggIT09IDApIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHByb21pc2UpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHByb21pc2UuX3N0YXRlID0gUkVKRUNURUQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICBhc2FwKHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBzdWJzY3JpYmUocGFyZW50LCBjaGlsZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgdmFyIF9zdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gIHZhciBsZW5ndGggPSBfc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG5cbiAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICBfc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICBfc3Vic2NyaWJlcnNbbGVuZ3RoICsgRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBSRUpFQ1RFRF0gPSBvblJlamVjdGlvbjtcblxuICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICBhc2FwKHB1Ymxpc2gsIHBhcmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaChwcm9taXNlKSB7XG4gIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gIGlmIChzdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY2hpbGQgPSB2b2lkIDAsXG4gICAgICBjYWxsYmFjayA9IHZvaWQgMCxcbiAgICAgIGRldGFpbCA9IHByb21pc2UuX3Jlc3VsdDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgIGlmIChjaGlsZCkge1xuICAgICAgaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgIH1cbiAgfVxuXG4gIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG59XG5cbmZ1bmN0aW9uIEVycm9yT2JqZWN0KCkge1xuICB0aGlzLmVycm9yID0gbnVsbDtcbn1cblxudmFyIFRSWV9DQVRDSF9FUlJPUiA9IG5ldyBFcnJvck9iamVjdCgpO1xuXG5mdW5jdGlvbiB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICB2YXIgaGFzQ2FsbGJhY2sgPSBpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgIHZhbHVlID0gdm9pZCAwLFxuICAgICAgZXJyb3IgPSB2b2lkIDAsXG4gICAgICBzdWNjZWVkZWQgPSB2b2lkIDAsXG4gICAgICBmYWlsZWQgPSB2b2lkIDA7XG5cbiAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgdmFsdWUgPSB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgIGlmICh2YWx1ZSA9PT0gVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgIHZhbHVlLmVycm9yID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCBjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZGV0YWlsO1xuICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gIH1cblxuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICAvLyBub29wXG4gIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBGVUxGSUxMRUQpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgdHJ5IHtcbiAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSkge1xuICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIGUpO1xuICB9XG59XG5cbnZhciBpZCA9IDA7XG5mdW5jdGlvbiBuZXh0SWQoKSB7XG4gIHJldHVybiBpZCsrO1xufVxuXG5mdW5jdGlvbiBtYWtlUHJvbWlzZShwcm9taXNlKSB7XG4gIHByb21pc2VbUFJPTUlTRV9JRF0gPSBpZCsrO1xuICBwcm9taXNlLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICBwcm9taXNlLl9zdWJzY3JpYmVycyA9IFtdO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0aW9uRXJyb3IoKSB7XG4gIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0aW9uRXJyb3IoKSB7XG4gIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xufVxuXG52YXIgRW51bWVyYXRvciA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQpIHtcbiAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuXG4gICAgaWYgKCF0aGlzLnByb21pc2VbUFJPTUlTRV9JRF0pIHtcbiAgICAgIG1ha2VQcm9taXNlKHRoaXMucHJvbWlzZSk7XG4gICAgfVxuXG4gICAgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICB0aGlzLmxlbmd0aCA9IGlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcblxuICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICB0aGlzLl9lbnVtZXJhdGUoaW5wdXQpO1xuICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KHRoaXMucHJvbWlzZSwgdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgIH1cbiAgfVxuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbiBfZW51bWVyYXRlKGlucHV0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IHRoaXMuX3N0YXRlID09PSBQRU5ESU5HICYmIGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX2VhY2hFbnRyeSA9IGZ1bmN0aW9uIF9lYWNoRW50cnkoZW50cnksIGkpIHtcbiAgICB2YXIgYyA9IHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3I7XG4gICAgdmFyIHJlc29sdmUkJDEgPSBjLnJlc29sdmU7XG5cblxuICAgIGlmIChyZXNvbHZlJCQxID09PSByZXNvbHZlJDEpIHtcbiAgICAgIHZhciBfdGhlbiA9IGdldFRoZW4oZW50cnkpO1xuXG4gICAgICBpZiAoX3RoZW4gPT09IHRoZW4gJiYgZW50cnkuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgX3RoZW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IGVudHJ5O1xuICAgICAgfSBlbHNlIGlmIChjID09PSBQcm9taXNlJDEpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgYyhub29wKTtcbiAgICAgICAgaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBlbnRyeSwgX3RoZW4pO1xuICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQocHJvbWlzZSwgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQobmV3IGMoZnVuY3Rpb24gKHJlc29sdmUkJDEpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZSQkMShlbnRyeSk7XG4gICAgICAgIH0pLCBpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHJlc29sdmUkJDEoZW50cnkpLCBpKTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uIF9zZXR0bGVkQXQoc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG5cblxuICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gUEVORElORykge1xuICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG5cbiAgICAgIGlmIChzdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uIF93aWxsU2V0dGxlQXQocHJvbWlzZSwgaSkge1xuICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgIHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gZW51bWVyYXRvci5fc2V0dGxlZEF0KFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBFbnVtZXJhdG9yO1xufSgpO1xuXG4vKipcbiAgYFByb21pc2UuYWxsYCBhY2NlcHRzIGFuIGFycmF5IG9mIHByb21pc2VzLCBhbmQgcmV0dXJucyBhIG5ldyBwcm9taXNlIHdoaWNoXG4gIGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGFycmF5IG9mIGZ1bGZpbGxtZW50IHZhbHVlcyBmb3IgdGhlIHBhc3NlZCBwcm9taXNlcywgb3JcbiAgcmVqZWN0ZWQgd2l0aCB0aGUgcmVhc29uIG9mIHRoZSBmaXJzdCBwYXNzZWQgcHJvbWlzZSB0byBiZSByZWplY3RlZC4gSXQgY2FzdHMgYWxsXG4gIGVsZW1lbnRzIG9mIHRoZSBwYXNzZWQgaXRlcmFibGUgdG8gcHJvbWlzZXMgYXMgaXQgcnVucyB0aGlzIGFsZ29yaXRobS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVzb2x2ZSgyKTtcbiAgbGV0IHByb21pc2UzID0gcmVzb2x2ZSgzKTtcbiAgbGV0IHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICB9KTtcbiAgYGBgXG5cbiAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBhbGxgIGFyZSByZWplY3RlZCwgdGhlIGZpcnN0IHByb21pc2VcbiAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gIHJlamVjdGlvbiBoYW5kbGVyLiBGb3IgZXhhbXBsZTpcblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICBsZXQgcHJvbWlzZTMgPSByZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAvLyBlcnJvci5tZXNzYWdlID09PSBcIjJcIlxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCBhbGxcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FycmF5fSBlbnRyaWVzIGFycmF5IG9mIHByb21pc2VzXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGxhYmVsaW5nIHRoZSBwcm9taXNlLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgYHByb21pc2VzYCBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuXG4gIEBzdGF0aWNcbiovXG5mdW5jdGlvbiBhbGwoZW50cmllcykge1xuICByZXR1cm4gbmV3IEVudW1lcmF0b3IodGhpcywgZW50cmllcykucHJvbWlzZTtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJhY2VgIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaCBpcyBzZXR0bGVkIGluIHRoZSBzYW1lIHdheSBhcyB0aGVcbiAgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gc2V0dGxlLlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAyJyk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gcmVzdWx0ID09PSAncHJvbWlzZSAyJyBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAvLyB3YXMgcmVzb2x2ZWQuXG4gIH0pO1xuICBgYGBcblxuICBgUHJvbWlzZS5yYWNlYCBpcyBkZXRlcm1pbmlzdGljIGluIHRoYXQgb25seSB0aGUgc3RhdGUgb2YgdGhlIGZpcnN0XG4gIHNldHRsZWQgcHJvbWlzZSBtYXR0ZXJzLiBGb3IgZXhhbXBsZSwgZXZlbiBpZiBvdGhlciBwcm9taXNlcyBnaXZlbiB0byB0aGVcbiAgYHByb21pc2VzYCBhcnJheSBhcmd1bWVudCBhcmUgcmVzb2x2ZWQsIGJ1dCB0aGUgZmlyc3Qgc2V0dGxlZCBwcm9taXNlIGhhc1xuICBiZWNvbWUgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWRcbiAgcHJvbWlzZSB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAxJyk7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgbGV0IHByb21pc2UyID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdwcm9taXNlIDInKSk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnNcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBwcm9taXNlIDIgYmVjYW1lIHJlamVjdGVkIGJlZm9yZVxuICAgIC8vIHByb21pc2UgMSBiZWNhbWUgZnVsZmlsbGVkXG4gIH0pO1xuICBgYGBcblxuICBBbiBleGFtcGxlIHJlYWwtd29ybGQgdXNlIGNhc2UgaXMgaW1wbGVtZW50aW5nIHRpbWVvdXRzOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgUHJvbWlzZS5yYWNlKFthamF4KCdmb28uanNvbicpLCB0aW1lb3V0KDUwMDApXSlcbiAgYGBgXG5cbiAgQG1ldGhvZCByYWNlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgdG8gb2JzZXJ2ZVxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB3aGljaCBzZXR0bGVzIGluIHRoZSBzYW1lIHdheSBhcyB0aGUgZmlyc3QgcGFzc2VkXG4gIHByb21pc2UgdG8gc2V0dGxlLlxuKi9cbmZ1bmN0aW9uIHJhY2UoZW50cmllcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShlbnRyaWVzKSkge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKF8sIHJlamVjdCkge1xuICAgICAgcmV0dXJuIHJlamVjdChuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAgYFByb21pc2UucmVqZWN0YCByZXR1cm5zIGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWQgYHJlYXNvbmAuXG4gIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlamVjdFxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSByZWFzb24gdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGguXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHJlamVjdGVkIHdpdGggdGhlIGdpdmVuIGByZWFzb25gLlxuKi9cbmZ1bmN0aW9uIHJlamVjdCQxKHJlYXNvbikge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcbiAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBuZWVkc1Jlc29sdmVyKCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG59XG5cbmZ1bmN0aW9uIG5lZWRzTmV3KCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xufVxuXG4vKipcbiAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgVGVybWlub2xvZ3lcbiAgLS0tLS0tLS0tLS1cblxuICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICBCYXNpYyBVc2FnZTpcbiAgLS0tLS0tLS0tLS0tXG5cbiAgYGBganNcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAvLyBvbiBzdWNjZXNzXG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAvLyBvbiBmYWlsdXJlXG4gICAgcmVqZWN0KHJlYXNvbik7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgQWR2YW5jZWQgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLS0tLVxuXG4gIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgYGBganNcbiAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgIGxldCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgLy8gb24gcmVqZWN0aW9uXG4gIH0pO1xuICBgYGBcblxuICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gIGBgYGpzXG4gIFByb21pc2UuYWxsKFtcbiAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH0pO1xuICBgYGBcblxuICBAY2xhc3MgUHJvbWlzZVxuICBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlclxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEBjb25zdHJ1Y3RvclxuKi9cblxudmFyIFByb21pc2UkMSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICAgIHRoaXNbUFJPTUlTRV9JRF0gPSBuZXh0SWQoKTtcbiAgICB0aGlzLl9yZXN1bHQgPSB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgaWYgKG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICB0eXBlb2YgcmVzb2x2ZXIgIT09ICdmdW5jdGlvbicgJiYgbmVlZHNSZXNvbHZlcigpO1xuICAgICAgdGhpcyBpbnN0YW5jZW9mIFByb21pc2UgPyBpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcikgOiBuZWVkc05ldygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgfSk7XG4gIGBgYFxuICAgQ2hhaW5pbmdcbiAgLS0tLS0tLS1cbiAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICByZXR1cm4gdXNlci5uYW1lO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgfSk7XG4gICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICB9KTtcbiAgYGBgXG4gIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICB9KTtcbiAgYGBgXG4gICBBc3NpbWlsYXRpb25cbiAgLS0tLS0tLS0tLS0tXG4gICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgfSk7XG4gIGBgYFxuICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICB9KTtcbiAgYGBgXG4gICBTaW1wbGUgRXhhbXBsZVxuICAtLS0tLS0tLS0tLS0tLVxuICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICAgYGBgamF2YXNjcmlwdFxuICBsZXQgcmVzdWx0O1xuICAgdHJ5IHtcbiAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgLy8gc3VjY2Vzc1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAgIC8vIGZhaWx1cmVcbiAgfVxuICBgYGBcbiAgIEVycmJhY2sgRXhhbXBsZVxuICAgYGBganNcbiAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gc3VjY2Vzc1xuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIGZhaWx1cmVcbiAgfSk7XG4gIGBgYFxuICAgQWR2YW5jZWQgRXhhbXBsZVxuICAtLS0tLS0tLS0tLS0tLVxuICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICAgYGBgamF2YXNjcmlwdFxuICBsZXQgYXV0aG9yLCBib29rcztcbiAgIHRyeSB7XG4gICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgLy8gc3VjY2Vzc1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAgIC8vIGZhaWx1cmVcbiAgfVxuICBgYGBcbiAgIEVycmJhY2sgRXhhbXBsZVxuICAgYGBganNcbiAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcbiAgIH1cbiAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG4gICB9XG4gICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBmYWlsdXJlKGVycik7XG4gICAgICAvLyBmYWlsdXJlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgIH1cbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9XG4gIH0pO1xuICBgYGBcbiAgIFByb21pc2UgRXhhbXBsZTtcbiAgIGBgYGphdmFzY3JpcHRcbiAgZmluZEF1dGhvcigpLlxuICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgLy8gZm91bmQgYm9va3NcbiAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9KTtcbiAgYGBgXG4gICBAbWV0aG9kIHRoZW5cbiAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cbiAgLyoqXG4gIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cbiAgYGBganNcbiAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgfVxuICAvLyBzeW5jaHJvbm91c1xuICB0cnkge1xuICBmaW5kQXV0aG9yKCk7XG4gIH0gY2F0Y2gocmVhc29uKSB7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH1cbiAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICBAbWV0aG9kIGNhdGNoXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24gX2NhdGNoKG9uUmVqZWN0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gIH07XG5cbiAgLyoqXG4gICAgYGZpbmFsbHlgIHdpbGwgYmUgaW52b2tlZCByZWdhcmRsZXNzIG9mIHRoZSBwcm9taXNlJ3MgZmF0ZSBqdXN0IGFzIG5hdGl2ZVxuICAgIHRyeS9jYXRjaC9maW5hbGx5IGJlaGF2ZXNcbiAgXG4gICAgU3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkge1xuICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPiAwLjUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEF1dGhvcigpO1xuICAgIH1cbiAgXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmaW5kQXV0aG9yKCk7IC8vIHN1Y2NlZWQgb3IgZmFpbFxuICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gYWx3YXlzIHJ1bnNcbiAgICAgIC8vIGRvZXNuJ3QgYWZmZWN0IHRoZSByZXR1cm4gdmFsdWVcbiAgICB9XG4gICAgYGBgXG4gIFxuICAgIEFzeW5jaHJvbm91cyBleGFtcGxlOlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgcmV0dXJuIGZpbmRPdGhlckF1dGhlcigpO1xuICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24oKXtcbiAgICAgIC8vIGF1dGhvciB3YXMgZWl0aGVyIGZvdW5kLCBvciBub3RcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQG1ldGhvZCBmaW5hbGx5XG4gICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuZmluYWxseSA9IGZ1bmN0aW9uIF9maW5hbGx5KGNhbGxiYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IHByb21pc2UuY29uc3RydWN0b3I7XG5cbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGNvbnN0cnVjdG9yLnJlc29sdmUoY2FsbGJhY2soKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyByZWFzb247XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gUHJvbWlzZTtcbn0oKTtcblxuUHJvbWlzZSQxLnByb3RvdHlwZS50aGVuID0gdGhlbjtcblByb21pc2UkMS5hbGwgPSBhbGw7XG5Qcm9taXNlJDEucmFjZSA9IHJhY2U7XG5Qcm9taXNlJDEucmVzb2x2ZSA9IHJlc29sdmUkMTtcblByb21pc2UkMS5yZWplY3QgPSByZWplY3QkMTtcblByb21pc2UkMS5fc2V0U2NoZWR1bGVyID0gc2V0U2NoZWR1bGVyO1xuUHJvbWlzZSQxLl9zZXRBc2FwID0gc2V0QXNhcDtcblByb21pc2UkMS5fYXNhcCA9IGFzYXA7XG5cbi8qZ2xvYmFsIHNlbGYqL1xuZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgdmFyIGxvY2FsID0gdm9pZCAwO1xuXG4gICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gZ2xvYmFsO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BvbHlmaWxsIGZhaWxlZCBiZWNhdXNlIGdsb2JhbCBvYmplY3QgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gICAgaWYgKFApIHtcbiAgICAgICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwcm9taXNlVG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUC5yZXNvbHZlKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZVRvU3RyaW5nID09PSAnW29iamVjdCBQcm9taXNlXScgJiYgIVAuY2FzdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2UkMTtcbn1cblxuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZSQxLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlJDEuUHJvbWlzZSA9IFByb21pc2UkMTtcblxucmV0dXJuIFByb21pc2UkMTtcblxufSkpKTtcblxuXG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVzNi1wcm9taXNlLm1hcFxuIiwiLyoqXG4gKiBsb2Rhc2ggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzIDxodHRwczovL2pxdWVyeS5vcmcvPlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBOQU4gPSAwIC8gMDtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmFkIHNpZ25lZCBoZXhhZGVjaW1hbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCYWRIZXggPSAvXlstK10weFswLTlhLWZdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJpbmFyeSBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCaW5hcnkgPSAvXjBiWzAxXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvY3RhbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNPY3RhbCA9IC9eMG9bMC03XSskL2k7XG5cbi8qKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB3aXRob3V0IGEgZGVwZW5kZW5jeSBvbiBgcm9vdGAuICovXG52YXIgZnJlZVBhcnNlSW50ID0gcGFyc2VJbnQ7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG52YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5PYmplY3QgPT09IE9iamVjdCAmJiBnbG9iYWw7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbjtcblxuLyoqXG4gKiBHZXRzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2VcbiAqIHRoZSBVbml4IGVwb2NoICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi40LjBcbiAqIEBjYXRlZ29yeSBEYXRlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lc3RhbXAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcbiAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAqIH0sIF8ubm93KCkpO1xuICogLy8gPT4gTG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgaW52b2NhdGlvbi5cbiAqL1xudmFyIG5vdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcm9vdC5EYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcbiAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICogZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG8gaW1tZWRpYXRlbHkgaW52b2tlIHRoZW0uXG4gKiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGVcbiAqIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBUaGUgYGZ1bmNgIGlzIGludm9rZWRcbiAqIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24uIFN1YnNlcXVlbnRcbiAqIGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgXG4gKiBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF1cbiAqICBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4LlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcbiAqXG4gKiAvLyBJbnZva2UgYHNlbmRNYWlsYCB3aGVuIGNsaWNrZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxscy5cbiAqIGpRdWVyeShlbGVtZW50KS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICpcbiAqIC8vIEVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHMuXG4gKiB2YXIgZGVib3VuY2VkID0gXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7ICdtYXhXYWl0JzogMTAwMCB9KTtcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgZGVib3VuY2VkKTtcbiAqXG4gKiAvLyBDYW5jZWwgdGhlIHRyYWlsaW5nIGRlYm91bmNlZCBpbnZvY2F0aW9uLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3BvcHN0YXRlJywgZGVib3VuY2VkLmNhbmNlbCk7XG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxhc3RBcmdzLFxuICAgICAgbGFzdFRoaXMsXG4gICAgICBtYXhXYWl0LFxuICAgICAgcmVzdWx0LFxuICAgICAgdGltZXJJZCxcbiAgICAgIGxhc3RDYWxsVGltZSxcbiAgICAgIGxhc3RJbnZva2VUaW1lID0gMCxcbiAgICAgIGxlYWRpbmcgPSBmYWxzZSxcbiAgICAgIG1heGluZyA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHdhaXQgPSB0b051bWJlcih3YWl0KSB8fCAwO1xuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgbWF4aW5nID0gJ21heFdhaXQnIGluIG9wdGlvbnM7XG4gICAgbWF4V2FpdCA9IG1heGluZyA/IG5hdGl2ZU1heCh0b051bWJlcihvcHRpb25zLm1heFdhaXQpIHx8IDAsIHdhaXQpIDogbWF4V2FpdDtcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52b2tlRnVuYyh0aW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBsYXN0QXJncyxcbiAgICAgICAgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gbGVhZGluZ0VkZ2UodGltZSkge1xuICAgIC8vIFJlc2V0IGFueSBgbWF4V2FpdGAgdGltZXIuXG4gICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgIC8vIFN0YXJ0IHRoZSB0aW1lciBmb3IgdGhlIHRyYWlsaW5nIGVkZ2UuXG4gICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICAvLyBJbnZva2UgdGhlIGxlYWRpbmcgZWRnZS5cbiAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1haW5pbmdXYWl0KHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lLFxuICAgICAgICByZXN1bHQgPSB3YWl0IC0gdGltZVNpbmNlTGFzdENhbGw7XG5cbiAgICByZXR1cm4gbWF4aW5nID8gbmF0aXZlTWluKHJlc3VsdCwgbWF4V2FpdCAtIHRpbWVTaW5jZUxhc3RJbnZva2UpIDogcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkSW52b2tlKHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IGNhbGwsIGFjdGl2aXR5IGhhcyBzdG9wcGVkIGFuZCB3ZSdyZSBhdCB0aGVcbiAgICAvLyB0cmFpbGluZyBlZGdlLCB0aGUgc3lzdGVtIHRpbWUgaGFzIGdvbmUgYmFja3dhcmRzIGFuZCB3ZSdyZSB0cmVhdGluZ1xuICAgIC8vIGl0IGFzIHRoZSB0cmFpbGluZyBlZGdlLCBvciB3ZSd2ZSBoaXQgdGhlIGBtYXhXYWl0YCBsaW1pdC5cbiAgICByZXR1cm4gKGxhc3RDYWxsVGltZSA9PT0gdW5kZWZpbmVkIHx8ICh0aW1lU2luY2VMYXN0Q2FsbCA+PSB3YWl0KSB8fFxuICAgICAgKHRpbWVTaW5jZUxhc3RDYWxsIDwgMCkgfHwgKG1heGluZyAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVyRXhwaXJlZCgpIHtcbiAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgIGlmIChzaG91bGRJbnZva2UodGltZSkpIHtcbiAgICAgIHJldHVybiB0cmFpbGluZ0VkZ2UodGltZSk7XG4gICAgfVxuICAgIC8vIFJlc3RhcnQgdGhlIHRpbWVyLlxuICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFpbGluZ0VkZ2UodGltZSkge1xuICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAvLyBPbmx5IGludm9rZSBpZiB3ZSBoYXZlIGBsYXN0QXJnc2Agd2hpY2ggbWVhbnMgYGZ1bmNgIGhhcyBiZWVuXG4gICAgLy8gZGVib3VuY2VkIGF0IGxlYXN0IG9uY2UuXG4gICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICB9XG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgIGlmICh0aW1lcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICB9XG4gICAgbGFzdEludm9rZVRpbWUgPSAwO1xuICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgcmV0dXJuIHRpbWVySWQgPT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IHRyYWlsaW5nRWRnZShub3coKSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgdmFyIHRpbWUgPSBub3coKSxcbiAgICAgICAgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgIGxhc3RBcmdzID0gYXJndW1lbnRzO1xuICAgIGxhc3RUaGlzID0gdGhpcztcbiAgICBsYXN0Q2FsbFRpbWUgPSB0aW1lO1xuXG4gICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmdFZGdlKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgICBpZiAobWF4aW5nKSB7XG4gICAgICAgIC8vIEhhbmRsZSBpbnZvY2F0aW9ucyBpbiBhIHRpZ2h0IGxvb3AuXG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgZGVib3VuY2VkLmZsdXNoID0gZmx1c2g7XG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHRocm90dGxlZCBmdW5jdGlvbiB0aGF0IG9ubHkgaW52b2tlcyBgZnVuY2AgYXQgbW9zdCBvbmNlIHBlclxuICogZXZlcnkgYHdhaXRgIG1pbGxpc2Vjb25kcy4gVGhlIHRocm90dGxlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGBcbiAqIG1ldGhvZCB0byBjYW5jZWwgZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG9cbiAqIGltbWVkaWF0ZWx5IGludm9rZSB0aGVtLiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYFxuICogc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YFxuICogdGltZW91dC4gVGhlIGBmdW5jYCBpcyBpbnZva2VkIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZVxuICogdGhyb3R0bGVkIGZ1bmN0aW9uLiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gcmV0dXJuIHRoZVxuICogcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLnRocm90dGxlYCBhbmQgYF8uZGVib3VuY2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gdGhyb3R0bGUgaW52b2NhdGlvbnMgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXVxuICogIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCkpO1xuICpcbiAqIC8vIEludm9rZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzLlxuICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7ICd0cmFpbGluZyc6IGZhbHNlIH0pO1xuICogalF1ZXJ5KGVsZW1lbnQpLm9uKCdjbGljaycsIHRocm90dGxlZCk7XG4gKlxuICogLy8gQ2FuY2VsIHRoZSB0cmFpbGluZyB0aHJvdHRsZWQgaW52b2NhdGlvbi5cbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIHRocm90dGxlZC5jYW5jZWwpO1xuICovXG5mdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsZWFkaW5nID0gdHJ1ZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gJ2xlYWRpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICByZXR1cm4gZGVib3VuY2UoZnVuYywgd2FpdCwge1xuICAgICdsZWFkaW5nJzogbGVhZGluZyxcbiAgICAnbWF4V2FpdCc6IHdhaXQsXG4gICAgJ3RyYWlsaW5nJzogdHJhaWxpbmdcbiAgfSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlXG4gKiBbbGFuZ3VhZ2UgdHlwZV0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMpXG4gKiBvZiBgT2JqZWN0YC4gKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLiBBIHZhbHVlIGlzIG9iamVjdC1saWtlIGlmIGl0J3Mgbm90IGBudWxsYFxuICogYW5kIGhhcyBhIGB0eXBlb2ZgIHJlc3VsdCBvZiBcIm9iamVjdFwiLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHN5bWJvbCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzU3ltYm9sKFN5bWJvbC5pdGVyYXRvcik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1N5bWJvbCgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdzeW1ib2wnIHx8XG4gICAgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3ltYm9sVGFnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgbnVtYmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbnVtYmVyLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRvTnVtYmVyKDMuMik7XG4gKiAvLyA9PiAzLjJcbiAqXG4gKiBfLnRvTnVtYmVyKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gNWUtMzI0XG4gKlxuICogXy50b051bWJlcihJbmZpbml0eSk7XG4gKiAvLyA9PiBJbmZpbml0eVxuICpcbiAqIF8udG9OdW1iZXIoJzMuMicpO1xuICogLy8gPT4gMy4yXG4gKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBOQU47XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIHZhciBvdGhlciA9IHR5cGVvZiB2YWx1ZS52YWx1ZU9mID09ICdmdW5jdGlvbicgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbiAgICB2YWx1ZSA9IGlzT2JqZWN0KG90aGVyKSA/IChvdGhlciArICcnKSA6IG90aGVyO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09IDAgPyB2YWx1ZSA6ICt2YWx1ZTtcbiAgfVxuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UocmVUcmltLCAnJyk7XG4gIHZhciBpc0JpbmFyeSA9IHJlSXNCaW5hcnkudGVzdCh2YWx1ZSk7XG4gIHJldHVybiAoaXNCaW5hcnkgfHwgcmVJc09jdGFsLnRlc3QodmFsdWUpKVxuICAgID8gZnJlZVBhcnNlSW50KHZhbHVlLnNsaWNlKDIpLCBpc0JpbmFyeSA/IDIgOiA4KVxuICAgIDogKHJlSXNCYWRIZXgudGVzdCh2YWx1ZSkgPyBOQU4gOiArdmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwidmFyIHdpbGRjYXJkID0gcmVxdWlyZSgnd2lsZGNhcmQnKTtcbnZhciByZU1pbWVQYXJ0U3BsaXQgPSAvW1xcL1xcK1xcLl0vO1xuXG4vKipcbiAgIyBtaW1lLW1hdGNoXG5cbiAgQSBzaW1wbGUgZnVuY3Rpb24gdG8gY2hlY2tlciB3aGV0aGVyIGEgdGFyZ2V0IG1pbWUgdHlwZSBtYXRjaGVzIGEgbWltZS10eXBlXG4gIHBhdHRlcm4gKGUuZy4gaW1hZ2UvanBlZyBtYXRjaGVzIGltYWdlL2pwZWcgT1IgaW1hZ2UvKikuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIHBhdHRlcm4pIHtcbiAgZnVuY3Rpb24gdGVzdChwYXR0ZXJuKSB7XG4gICAgdmFyIHJlc3VsdCA9IHdpbGRjYXJkKHBhdHRlcm4sIHRhcmdldCwgcmVNaW1lUGFydFNwbGl0KTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IHdlIGhhdmUgYSB2YWxpZCBtaW1lIHR5cGUgKHNob3VsZCBoYXZlIHR3byBwYXJ0cylcbiAgICByZXR1cm4gcmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggPj0gMjtcbiAgfVxuXG4gIHJldHVybiBwYXR0ZXJuID8gdGVzdChwYXR0ZXJuLnNwbGl0KCc7JylbMF0pIDogdGVzdDtcbn07XG4iLCIvKipcbiogQ3JlYXRlIGFuIGV2ZW50IGVtaXR0ZXIgd2l0aCBuYW1lc3BhY2VzXG4qIEBuYW1lIGNyZWF0ZU5hbWVzcGFjZUVtaXR0ZXJcbiogQGV4YW1wbGVcbiogdmFyIGVtaXR0ZXIgPSByZXF1aXJlKCcuL2luZGV4JykoKVxuKlxuKiBlbWl0dGVyLm9uKCcqJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdhbGwgZXZlbnRzIGVtaXR0ZWQnLCB0aGlzLmV2ZW50KVxuKiB9KVxuKlxuKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge1xuKiAgIGNvbnNvbGUubG9nKCdleGFtcGxlIGV2ZW50IGVtaXR0ZWQnKVxuKiB9KVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlTmFtZXNwYWNlRW1pdHRlciAoKSB7XG4gIHZhciBlbWl0dGVyID0ge31cbiAgdmFyIF9mbnMgPSBlbWl0dGVyLl9mbnMgPSB7fVxuXG4gIC8qKlxuICAqIEVtaXQgYW4gZXZlbnQuIE9wdGlvbmFsbHkgbmFtZXNwYWNlIHRoZSBldmVudC4gSGFuZGxlcnMgYXJlIGZpcmVkIGluIHRoZSBvcmRlciBpbiB3aGljaCB0aGV5IHdlcmUgYWRkZWQgd2l0aCBleGFjdCBtYXRjaGVzIHRha2luZyBwcmVjZWRlbmNlLiBTZXBhcmF0ZSB0aGUgbmFtZXNwYWNlIGFuZCBldmVudCB3aXRoIGEgYDpgXG4gICogQG5hbWUgZW1pdFxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCDigJMgdGhlIG5hbWUgb2YgdGhlIGV2ZW50LCB3aXRoIG9wdGlvbmFsIG5hbWVzcGFjZVxuICAqIEBwYXJhbSB7Li4uKn0gZGF0YSDigJMgdXAgdG8gNiBhcmd1bWVudHMgdGhhdCBhcmUgcGFzc2VkIHRvIHRoZSBldmVudCBsaXN0ZW5lclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5lbWl0KCdleGFtcGxlJylcbiAgKiBlbWl0dGVyLmVtaXQoJ2RlbW86dGVzdCcpXG4gICogZW1pdHRlci5lbWl0KCdkYXRhJywgeyBleGFtcGxlOiB0cnVlfSwgJ2Egc3RyaW5nJywgMSlcbiAgKi9cbiAgZW1pdHRlci5lbWl0ID0gZnVuY3Rpb24gZW1pdCAoZXZlbnQsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpIHtcbiAgICB2YXIgdG9FbWl0ID0gZ2V0TGlzdGVuZXJzKGV2ZW50KVxuXG4gICAgaWYgKHRvRW1pdC5sZW5ndGgpIHtcbiAgICAgIGVtaXRBbGwoZXZlbnQsIHRvRW1pdCwgW2FyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzZdKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIENyZWF0ZSBlbiBldmVudCBsaXN0ZW5lci5cbiAgKiBAbmFtZSBvblxuICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICogQGV4YW1wbGVcbiAgKiBlbWl0dGVyLm9uKCdleGFtcGxlJywgZnVuY3Rpb24gKCkge30pXG4gICogZW1pdHRlci5vbignZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uID0gZnVuY3Rpb24gb24gKGV2ZW50LCBmbikge1xuICAgIGlmICghX2Zuc1tldmVudF0pIHtcbiAgICAgIF9mbnNbZXZlbnRdID0gW11cbiAgICB9XG5cbiAgICBfZm5zW2V2ZW50XS5wdXNoKGZuKVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlIGVuIGV2ZW50IGxpc3RlbmVyIHRoYXQgZmlyZXMgb25jZS5cbiAgKiBAbmFtZSBvbmNlXG4gICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgKiBAZXhhbXBsZVxuICAqIGVtaXR0ZXIub25jZSgnZXhhbXBsZScsIGZ1bmN0aW9uICgpIHt9KVxuICAqIGVtaXR0ZXIub25jZSgnZGVtbycsIGZ1bmN0aW9uICgpIHt9KVxuICAqL1xuICBlbWl0dGVyLm9uY2UgPSBmdW5jdGlvbiBvbmNlIChldmVudCwgZm4pIHtcbiAgICBmdW5jdGlvbiBvbmUgKCkge1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgZW1pdHRlci5vZmYoZXZlbnQsIG9uZSlcbiAgICB9XG4gICAgdGhpcy5vbihldmVudCwgb25lKVxuICB9XG5cbiAgLyoqXG4gICogU3RvcCBsaXN0ZW5pbmcgdG8gYW4gZXZlbnQuIFN0b3AgYWxsIGxpc3RlbmVycyBvbiBhbiBldmVudCBieSBvbmx5IHBhc3NpbmcgdGhlIGV2ZW50IG5hbWUuIFN0b3AgYSBzaW5nbGUgbGlzdGVuZXIgYnkgcGFzc2luZyB0aGF0IGV2ZW50IGhhbmRsZXIgYXMgYSBjYWxsYmFjay5cbiAgKiBZb3UgbXVzdCBiZSBleHBsaWNpdCBhYm91dCB3aGF0IHdpbGwgYmUgdW5zdWJzY3JpYmVkOiBgZW1pdHRlci5vZmYoJ2RlbW8nKWAgd2lsbCB1bnN1YnNjcmliZSBhbiBgZW1pdHRlci5vbignZGVtbycpYCBsaXN0ZW5lcixcbiAgKiBgZW1pdHRlci5vZmYoJ2RlbW86ZXhhbXBsZScpYCB3aWxsIHVuc3Vic2NyaWJlIGFuIGBlbWl0dGVyLm9uKCdkZW1vOmV4YW1wbGUnKWAgbGlzdGVuZXJcbiAgKiBAbmFtZSBvZmZcbiAgKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dIOKAkyB0aGUgc3BlY2lmaWMgaGFuZGxlclxuICAqIEBleGFtcGxlXG4gICogZW1pdHRlci5vZmYoJ2V4YW1wbGUnKVxuICAqIGVtaXR0ZXIub2ZmKCdkZW1vJywgZnVuY3Rpb24gKCkge30pXG4gICovXG4gIGVtaXR0ZXIub2ZmID0gZnVuY3Rpb24gb2ZmIChldmVudCwgZm4pIHtcbiAgICB2YXIga2VlcCA9IFtdXG5cbiAgICBpZiAoZXZlbnQgJiYgZm4pIHtcbiAgICAgIHZhciBmbnMgPSB0aGlzLl9mbnNbZXZlbnRdXG4gICAgICB2YXIgaSA9IDBcbiAgICAgIHZhciBsID0gZm5zLmxlbmd0aFxuXG4gICAgICBmb3IgKGk7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKGZuc1tpXSAhPT0gZm4pIHtcbiAgICAgICAgICBrZWVwLnB1c2goZm5zW2ldKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAga2VlcC5sZW5ndGggPyB0aGlzLl9mbnNbZXZlbnRdID0ga2VlcCA6IGRlbGV0ZSB0aGlzLl9mbnNbZXZlbnRdXG4gIH1cblxuICBmdW5jdGlvbiBnZXRMaXN0ZW5lcnMgKGUpIHtcbiAgICB2YXIgb3V0ID0gX2Zuc1tlXSA/IF9mbnNbZV0gOiBbXVxuICAgIHZhciBpZHggPSBlLmluZGV4T2YoJzonKVxuICAgIHZhciBhcmdzID0gKGlkeCA9PT0gLTEpID8gW2VdIDogW2Uuc3Vic3RyaW5nKDAsIGlkeCksIGUuc3Vic3RyaW5nKGlkeCArIDEpXVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhfZm5zKVxuICAgIHZhciBpID0gMFxuICAgIHZhciBsID0ga2V5cy5sZW5ndGhcblxuICAgIGZvciAoaTsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV1cbiAgICAgIGlmIChrZXkgPT09ICcqJykge1xuICAgICAgICBvdXQgPSBvdXQuY29uY2F0KF9mbnNba2V5XSlcbiAgICAgIH1cblxuICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIGFyZ3NbMF0gPT09IGtleSkge1xuICAgICAgICBvdXQgPSBvdXQuY29uY2F0KF9mbnNba2V5XSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0XG4gIH1cblxuICBmdW5jdGlvbiBlbWl0QWxsIChlLCBmbnMsIGFyZ3MpIHtcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbCA9IGZucy5sZW5ndGhcblxuICAgIGZvciAoaTsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKCFmbnNbaV0pIGJyZWFrXG4gICAgICBmbnNbaV0uZXZlbnQgPSBlXG4gICAgICBmbnNbaV0uYXBwbHkoZm5zW2ldLCBhcmdzKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbWl0dGVyXG59XG4iLCIhZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIFZOb2RlKCkge31cbiAgICBmdW5jdGlvbiBoKG5vZGVOYW1lLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBsYXN0U2ltcGxlLCBjaGlsZCwgc2ltcGxlLCBpLCBjaGlsZHJlbiA9IEVNUFRZX0NISUxEUkVOO1xuICAgICAgICBmb3IgKGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpLS0gPiAyOyApIHN0YWNrLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMgJiYgbnVsbCAhPSBhdHRyaWJ1dGVzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoIXN0YWNrLmxlbmd0aCkgc3RhY2sucHVzaChhdHRyaWJ1dGVzLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmNoaWxkcmVuO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIGlmICgoY2hpbGQgPSBzdGFjay5wb3AoKSkgJiYgdm9pZCAwICE9PSBjaGlsZC5wb3ApIGZvciAoaSA9IGNoaWxkLmxlbmd0aDsgaS0tOyApIHN0YWNrLnB1c2goY2hpbGRbaV0pOyBlbHNlIHtcbiAgICAgICAgICAgIGlmICgnYm9vbGVhbicgPT0gdHlwZW9mIGNoaWxkKSBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc2ltcGxlID0gJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygbm9kZU5hbWUpIGlmIChudWxsID09IGNoaWxkKSBjaGlsZCA9ICcnOyBlbHNlIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgY2hpbGQpIGNoaWxkID0gU3RyaW5nKGNoaWxkKTsgZWxzZSBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGNoaWxkKSBzaW1wbGUgPSAhMTtcbiAgICAgICAgICAgIGlmIChzaW1wbGUgJiYgbGFzdFNpbXBsZSkgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV0gKz0gY2hpbGQ7IGVsc2UgaWYgKGNoaWxkcmVuID09PSBFTVBUWV9DSElMRFJFTikgY2hpbGRyZW4gPSBbIGNoaWxkIF07IGVsc2UgY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgICAgICBsYXN0U2ltcGxlID0gc2ltcGxlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwID0gbmV3IFZOb2RlKCk7XG4gICAgICAgIHAubm9kZU5hbWUgPSBub2RlTmFtZTtcbiAgICAgICAgcC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgICBwLmF0dHJpYnV0ZXMgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBwLmtleSA9IG51bGwgPT0gYXR0cmlidXRlcyA/IHZvaWQgMCA6IGF0dHJpYnV0ZXMua2V5O1xuICAgICAgICBpZiAodm9pZCAwICE9PSBvcHRpb25zLnZub2RlKSBvcHRpb25zLnZub2RlKHApO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iaiwgcHJvcHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBwcm9wcykgb2JqW2ldID0gcHJvcHNbaV07XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsb25lRWxlbWVudCh2bm9kZSwgcHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIGgodm5vZGUubm9kZU5hbWUsIGV4dGVuZChleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpLCBwcm9wcyksIGFyZ3VtZW50cy5sZW5ndGggPiAyID8gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpIDogdm5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2QgJiYgKGNvbXBvbmVudC5fX2QgPSAhMCkgJiYgMSA9PSBpdGVtcy5wdXNoKGNvbXBvbmVudCkpIChvcHRpb25zLmRlYm91bmNlUmVuZGVyaW5nIHx8IGRlZmVyKShyZXJlbmRlcik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcmVuZGVyKCkge1xuICAgICAgICB2YXIgcCwgbGlzdCA9IGl0ZW1zO1xuICAgICAgICBpdGVtcyA9IFtdO1xuICAgICAgICB3aGlsZSAocCA9IGxpc3QucG9wKCkpIGlmIChwLl9fZCkgcmVuZGVyQ29tcG9uZW50KHApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1NhbWVOb2RlVHlwZShub2RlLCB2bm9kZSwgaHlkcmF0aW5nKSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZub2RlKSByZXR1cm4gdm9pZCAwICE9PSBub2RlLnNwbGl0VGV4dDtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZS5ub2RlTmFtZSkgcmV0dXJuICFub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciAmJiBpc05hbWVkTm9kZShub2RlLCB2bm9kZS5ub2RlTmFtZSk7IGVsc2UgcmV0dXJuIGh5ZHJhdGluZyB8fCBub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzTmFtZWROb2RlKG5vZGUsIG5vZGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBub2RlLl9fbiA9PT0gbm9kZU5hbWUgfHwgbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXROb2RlUHJvcHModm5vZGUpIHtcbiAgICAgICAgdmFyIHByb3BzID0gZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgcHJvcHMuY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgdmFyIGRlZmF1bHRQcm9wcyA9IHZub2RlLm5vZGVOYW1lLmRlZmF1bHRQcm9wcztcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gZGVmYXVsdFByb3BzKSBmb3IgKHZhciBpIGluIGRlZmF1bHRQcm9wcykgaWYgKHZvaWQgMCA9PT0gcHJvcHNbaV0pIHByb3BzW2ldID0gZGVmYXVsdFByb3BzW2ldO1xuICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZU5vZGUobm9kZU5hbWUsIGlzU3ZnKSB7XG4gICAgICAgIHZhciBub2RlID0gaXNTdmcgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbm9kZU5hbWUpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgICAgIG5vZGUuX19uID0gbm9kZU5hbWU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlKG5vZGUpIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICAgIGlmIChwYXJlbnROb2RlKSBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRBY2Nlc3Nvcihub2RlLCBuYW1lLCBvbGQsIHZhbHVlLCBpc1N2Zykge1xuICAgICAgICBpZiAoJ2NsYXNzTmFtZScgPT09IG5hbWUpIG5hbWUgPSAnY2xhc3MnO1xuICAgICAgICBpZiAoJ2tleScgPT09IG5hbWUpIDsgZWxzZSBpZiAoJ3JlZicgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChvbGQpIG9sZChudWxsKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgdmFsdWUobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2NsYXNzJyA9PT0gbmFtZSAmJiAhaXNTdmcpIG5vZGUuY2xhc3NOYW1lID0gdmFsdWUgfHwgJyc7IGVsc2UgaWYgKCdzdHlsZScgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09IHR5cGVvZiBvbGQpIG5vZGUuc3R5bGUuY3NzVGV4dCA9IHZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICdvYmplY3QnID09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2Ygb2xkKSBmb3IgKHZhciBpIGluIG9sZCkgaWYgKCEoaSBpbiB2YWx1ZSkpIG5vZGUuc3R5bGVbaV0gPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSBub2RlLnN0eWxlW2ldID0gJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlW2ldICYmICExID09PSBJU19OT05fRElNRU5TSU9OQUwudGVzdChpKSA/IHZhbHVlW2ldICsgJ3B4JyA6IHZhbHVlW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdkYW5nZXJvdXNseVNldElubmVySFRNTCcgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5fX2h0bWwgfHwgJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoJ28nID09IG5hbWVbMF0gJiYgJ24nID09IG5hbWVbMV0pIHtcbiAgICAgICAgICAgIHZhciB1c2VDYXB0dXJlID0gbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL0NhcHR1cmUkLywgJycpKTtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvbGQpIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIH0gZWxzZSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgZXZlbnRQcm94eSwgdXNlQ2FwdHVyZSk7XG4gICAgICAgICAgICAobm9kZS5fX2wgfHwgKG5vZGUuX19sID0ge30pKVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKCdsaXN0JyAhPT0gbmFtZSAmJiAndHlwZScgIT09IG5hbWUgJiYgIWlzU3ZnICYmIG5hbWUgaW4gbm9kZSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgbnVsbCA9PSB2YWx1ZSA/ICcnIDogdmFsdWUpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgITEgPT09IHZhbHVlKSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBucyA9IGlzU3ZnICYmIG5hbWUgIT09IChuYW1lID0gbmFtZS5yZXBsYWNlKC9eeGxpbmtcXDo/LywgJycpKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHZhbHVlIHx8ICExID09PSB2YWx1ZSkgaWYgKG5zKSBub2RlLnJlbW92ZUF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpKTsgZWxzZSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTsgZWxzZSBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgdmFsdWUpIGlmIChucykgbm9kZS5zZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIG5hbWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpOyBlbHNlIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBmdW5jdGlvbiBldmVudFByb3h5KGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19sW2UudHlwZV0ob3B0aW9ucy5ldmVudCAmJiBvcHRpb25zLmV2ZW50KGUpIHx8IGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmbHVzaE1vdW50cygpIHtcbiAgICAgICAgdmFyIGM7XG4gICAgICAgIHdoaWxlIChjID0gbW91bnRzLnBvcCgpKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlck1vdW50KSBvcHRpb25zLmFmdGVyTW91bnQoYyk7XG4gICAgICAgICAgICBpZiAoYy5jb21wb25lbnREaWRNb3VudCkgYy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIHBhcmVudCwgY29tcG9uZW50Um9vdCkge1xuICAgICAgICBpZiAoIWRpZmZMZXZlbCsrKSB7XG4gICAgICAgICAgICBpc1N2Z01vZGUgPSBudWxsICE9IHBhcmVudCAmJiB2b2lkIDAgIT09IHBhcmVudC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgICAgICBoeWRyYXRpbmcgPSBudWxsICE9IGRvbSAmJiAhKCdfX3ByZWFjdGF0dHJfJyBpbiBkb20pO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXQgPSBpZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgY29tcG9uZW50Um9vdCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcmV0LnBhcmVudE5vZGUgIT09IHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKHJldCk7XG4gICAgICAgIGlmICghLS1kaWZmTGV2ZWwpIHtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9ICExO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRSb290KSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIHZhciBvdXQgPSBkb20sIHByZXZTdmdNb2RlID0gaXNTdmdNb2RlO1xuICAgICAgICBpZiAobnVsbCA9PSB2bm9kZSB8fCAnYm9vbGVhbicgPT0gdHlwZW9mIHZub2RlKSB2bm9kZSA9ICcnO1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlIHx8ICdudW1iZXInID09IHR5cGVvZiB2bm9kZSkge1xuICAgICAgICAgICAgaWYgKGRvbSAmJiB2b2lkIDAgIT09IGRvbS5zcGxpdFRleHQgJiYgZG9tLnBhcmVudE5vZGUgJiYgKCFkb20uX2NvbXBvbmVudCB8fCBjb21wb25lbnRSb290KSkge1xuICAgICAgICAgICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9IHZub2RlKSBkb20ubm9kZVZhbHVlID0gdm5vZGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0Ll9fcHJlYWN0YXR0cl8gPSAhMDtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHZub2RlTmFtZSA9IHZub2RlLm5vZGVOYW1lO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygdm5vZGVOYW1lKSByZXR1cm4gYnVpbGRDb21wb25lbnRGcm9tVk5vZGUoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICBpc1N2Z01vZGUgPSAnc3ZnJyA9PT0gdm5vZGVOYW1lID8gITAgOiAnZm9yZWlnbk9iamVjdCcgPT09IHZub2RlTmFtZSA/ICExIDogaXNTdmdNb2RlO1xuICAgICAgICB2bm9kZU5hbWUgPSBTdHJpbmcodm5vZGVOYW1lKTtcbiAgICAgICAgaWYgKCFkb20gfHwgIWlzTmFtZWROb2RlKGRvbSwgdm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgb3V0ID0gY3JlYXRlTm9kZSh2bm9kZU5hbWUsIGlzU3ZnTW9kZSk7XG4gICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGRvbS5maXJzdENoaWxkKSBvdXQuYXBwZW5kQ2hpbGQoZG9tLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShkb20sICEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZmMgPSBvdXQuZmlyc3RDaGlsZCwgcHJvcHMgPSBvdXQuX19wcmVhY3RhdHRyXywgdmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmIChudWxsID09IHByb3BzKSB7XG4gICAgICAgICAgICBwcm9wcyA9IG91dC5fX3ByZWFjdGF0dHJfID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBhID0gb3V0LmF0dHJpYnV0ZXMsIGkgPSBhLmxlbmd0aDsgaS0tOyApIHByb3BzW2FbaV0ubmFtZV0gPSBhW2ldLnZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaHlkcmF0aW5nICYmIHZjaGlsZHJlbiAmJiAxID09PSB2Y2hpbGRyZW4ubGVuZ3RoICYmICdzdHJpbmcnID09IHR5cGVvZiB2Y2hpbGRyZW5bMF0gJiYgbnVsbCAhPSBmYyAmJiB2b2lkIDAgIT09IGZjLnNwbGl0VGV4dCAmJiBudWxsID09IGZjLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBpZiAoZmMubm9kZVZhbHVlICE9IHZjaGlsZHJlblswXSkgZmMubm9kZVZhbHVlID0gdmNoaWxkcmVuWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKHZjaGlsZHJlbiAmJiB2Y2hpbGRyZW4ubGVuZ3RoIHx8IG51bGwgIT0gZmMpIGlubmVyRGlmZk5vZGUob3V0LCB2Y2hpbGRyZW4sIGNvbnRleHQsIG1vdW50QWxsLCBoeWRyYXRpbmcgfHwgbnVsbCAhPSBwcm9wcy5kYW5nZXJvdXNseVNldElubmVySFRNTCk7XG4gICAgICAgIGRpZmZBdHRyaWJ1dGVzKG91dCwgdm5vZGUuYXR0cmlidXRlcywgcHJvcHMpO1xuICAgICAgICBpc1N2Z01vZGUgPSBwcmV2U3ZnTW9kZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5uZXJEaWZmTm9kZShkb20sIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGlzSHlkcmF0aW5nKSB7XG4gICAgICAgIHZhciBqLCBjLCBmLCB2Y2hpbGQsIGNoaWxkLCBvcmlnaW5hbENoaWxkcmVuID0gZG9tLmNoaWxkTm9kZXMsIGNoaWxkcmVuID0gW10sIGtleWVkID0ge30sIGtleWVkTGVuID0gMCwgbWluID0gMCwgbGVuID0gb3JpZ2luYWxDaGlsZHJlbi5sZW5ndGgsIGNoaWxkcmVuTGVuID0gMCwgdmxlbiA9IHZjaGlsZHJlbiA/IHZjaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAoMCAhPT0gbGVuKSBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgX2NoaWxkID0gb3JpZ2luYWxDaGlsZHJlbltpXSwgcHJvcHMgPSBfY2hpbGQuX19wcmVhY3RhdHRyXywga2V5ID0gdmxlbiAmJiBwcm9wcyA/IF9jaGlsZC5fY29tcG9uZW50ID8gX2NoaWxkLl9jb21wb25lbnQuX19rIDogcHJvcHMua2V5IDogbnVsbDtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGtleWVkTGVuKys7XG4gICAgICAgICAgICAgICAga2V5ZWRba2V5XSA9IF9jaGlsZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcHMgfHwgKHZvaWQgMCAhPT0gX2NoaWxkLnNwbGl0VGV4dCA/IGlzSHlkcmF0aW5nID8gX2NoaWxkLm5vZGVWYWx1ZS50cmltKCkgOiAhMCA6IGlzSHlkcmF0aW5nKSkgY2hpbGRyZW5bY2hpbGRyZW5MZW4rK10gPSBfY2hpbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgIT09IHZsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgdmxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2Y2hpbGQgPSB2Y2hpbGRyZW5baV07XG4gICAgICAgICAgICBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICB2YXIga2V5ID0gdmNoaWxkLmtleTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXllZExlbiAmJiB2b2lkIDAgIT09IGtleWVkW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBrZXllZFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgICAgICBrZXllZExlbi0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNoaWxkICYmIG1pbiA8IGNoaWxkcmVuTGVuKSBmb3IgKGogPSBtaW47IGogPCBjaGlsZHJlbkxlbjsgaisrKSBpZiAodm9pZCAwICE9PSBjaGlsZHJlbltqXSAmJiBpc1NhbWVOb2RlVHlwZShjID0gY2hpbGRyZW5bal0sIHZjaGlsZCwgaXNIeWRyYXRpbmcpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBjaGlsZHJlbkxlbiAtIDEpIGNoaWxkcmVuTGVuLS07XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IG1pbikgbWluKys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGlsZCA9IGlkaWZmKGNoaWxkLCB2Y2hpbGQsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGYgPSBvcmlnaW5hbENoaWxkcmVuW2ldO1xuICAgICAgICAgICAgaWYgKGNoaWxkICYmIGNoaWxkICE9PSBkb20gJiYgY2hpbGQgIT09IGYpIGlmIChudWxsID09IGYpIGRvbS5hcHBlbmRDaGlsZChjaGlsZCk7IGVsc2UgaWYgKGNoaWxkID09PSBmLm5leHRTaWJsaW5nKSByZW1vdmVOb2RlKGYpOyBlbHNlIGRvbS5pbnNlcnRCZWZvcmUoY2hpbGQsIGYpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrZXllZExlbikgZm9yICh2YXIgaSBpbiBrZXllZCkgaWYgKHZvaWQgMCAhPT0ga2V5ZWRbaV0pIHJlY29sbGVjdE5vZGVUcmVlKGtleWVkW2ldLCAhMSk7XG4gICAgICAgIHdoaWxlIChtaW4gPD0gY2hpbGRyZW5MZW4pIGlmICh2b2lkIDAgIT09IChjaGlsZCA9IGNoaWxkcmVuW2NoaWxkcmVuTGVuLS1dKSkgcmVjb2xsZWN0Tm9kZVRyZWUoY2hpbGQsICExKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVjb2xsZWN0Tm9kZVRyZWUobm9kZSwgdW5tb3VudE9ubHkpIHtcbiAgICAgICAgdmFyIGNvbXBvbmVudCA9IG5vZGUuX2NvbXBvbmVudDtcbiAgICAgICAgaWYgKGNvbXBvbmVudCkgdW5tb3VudENvbXBvbmVudChjb21wb25lbnQpOyBlbHNlIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IG5vZGUuX19wcmVhY3RhdHRyXyAmJiBub2RlLl9fcHJlYWN0YXR0cl8ucmVmKSBub2RlLl9fcHJlYWN0YXR0cl8ucmVmKG51bGwpO1xuICAgICAgICAgICAgaWYgKCExID09PSB1bm1vdW50T25seSB8fCBudWxsID09IG5vZGUuX19wcmVhY3RhdHRyXykgcmVtb3ZlTm9kZShub2RlKTtcbiAgICAgICAgICAgIHJlbW92ZUNoaWxkcmVuKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZUNoaWxkcmVuKG5vZGUpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUubGFzdENoaWxkO1xuICAgICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSBub2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG5vZGUsICEwKTtcbiAgICAgICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmZBdHRyaWJ1dGVzKGRvbSwgYXR0cnMsIG9sZCkge1xuICAgICAgICB2YXIgbmFtZTtcbiAgICAgICAgZm9yIChuYW1lIGluIG9sZCkgaWYgKCghYXR0cnMgfHwgbnVsbCA9PSBhdHRyc1tuYW1lXSkgJiYgbnVsbCAhPSBvbGRbbmFtZV0pIHNldEFjY2Vzc29yKGRvbSwgbmFtZSwgb2xkW25hbWVdLCBvbGRbbmFtZV0gPSB2b2lkIDAsIGlzU3ZnTW9kZSk7XG4gICAgICAgIGZvciAobmFtZSBpbiBhdHRycykgaWYgKCEoJ2NoaWxkcmVuJyA9PT0gbmFtZSB8fCAnaW5uZXJIVE1MJyA9PT0gbmFtZSB8fCBuYW1lIGluIG9sZCAmJiBhdHRyc1tuYW1lXSA9PT0gKCd2YWx1ZScgPT09IG5hbWUgfHwgJ2NoZWNrZWQnID09PSBuYW1lID8gZG9tW25hbWVdIDogb2xkW25hbWVdKSkpIHNldEFjY2Vzc29yKGRvbSwgbmFtZSwgb2xkW25hbWVdLCBvbGRbbmFtZV0gPSBhdHRyc1tuYW1lXSwgaXNTdmdNb2RlKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY29sbGVjdENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBjb21wb25lbnQuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgKGNvbXBvbmVudHNbbmFtZV0gfHwgKGNvbXBvbmVudHNbbmFtZV0gPSBbXSkpLnB1c2goY29tcG9uZW50KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50KEN0b3IsIHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBpbnN0LCBsaXN0ID0gY29tcG9uZW50c1tDdG9yLm5hbWVdO1xuICAgICAgICBpZiAoQ3Rvci5wcm90b3R5cGUgJiYgQ3Rvci5wcm90b3R5cGUucmVuZGVyKSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEN0b3IocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgQ29tcG9uZW50LmNhbGwoaW5zdCwgcHJvcHMsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBDb21wb25lbnQocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgaW5zdC5jb25zdHJ1Y3RvciA9IEN0b3I7XG4gICAgICAgICAgICBpbnN0LnJlbmRlciA9IGRvUmVuZGVyO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsaXN0KSBmb3IgKHZhciBpID0gbGlzdC5sZW5ndGg7IGktLTsgKSBpZiAobGlzdFtpXS5jb25zdHJ1Y3RvciA9PT0gQ3Rvcikge1xuICAgICAgICAgICAgaW5zdC5fX2IgPSBsaXN0W2ldLl9fYjtcbiAgICAgICAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRvUmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldENvbXBvbmVudFByb3BzKGNvbXBvbmVudCwgcHJvcHMsIG9wdHMsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Ll9feCkge1xuICAgICAgICAgICAgY29tcG9uZW50Ll9feCA9ICEwO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IgPSBwcm9wcy5yZWYpIGRlbGV0ZSBwcm9wcy5yZWY7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fayA9IHByb3BzLmtleSkgZGVsZXRlIHByb3BzLmtleTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50LmJhc2UgfHwgbW91bnRBbGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxNb3VudCkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxNb3VudCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcykgY29tcG9uZW50LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMocHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gY29tcG9uZW50LmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2MpIGNvbXBvbmVudC5fX2MgPSBjb21wb25lbnQuY29udGV4dDtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3ApIGNvbXBvbmVudC5fX3AgPSBjb21wb25lbnQucHJvcHM7XG4gICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMTtcbiAgICAgICAgICAgIGlmICgwICE9PSBvcHRzKSBpZiAoMSA9PT0gb3B0cyB8fCAhMSAhPT0gb3B0aW9ucy5zeW5jQ29tcG9uZW50VXBkYXRlcyB8fCAhY29tcG9uZW50LmJhc2UpIHJlbmRlckNvbXBvbmVudChjb21wb25lbnQsIDEsIG1vdW50QWxsKTsgZWxzZSBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihjb21wb25lbnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlckNvbXBvbmVudChjb21wb25lbnQsIG9wdHMsIG1vdW50QWxsLCBpc0NoaWxkKSB7XG4gICAgICAgIGlmICghY29tcG9uZW50Ll9feCkge1xuICAgICAgICAgICAgdmFyIHJlbmRlcmVkLCBpbnN0LCBjYmFzZSwgcHJvcHMgPSBjb21wb25lbnQucHJvcHMsIHN0YXRlID0gY29tcG9uZW50LnN0YXRlLCBjb250ZXh0ID0gY29tcG9uZW50LmNvbnRleHQsIHByZXZpb3VzUHJvcHMgPSBjb21wb25lbnQuX19wIHx8IHByb3BzLCBwcmV2aW91c1N0YXRlID0gY29tcG9uZW50Ll9fcyB8fCBzdGF0ZSwgcHJldmlvdXNDb250ZXh0ID0gY29tcG9uZW50Ll9fYyB8fCBjb250ZXh0LCBpc1VwZGF0ZSA9IGNvbXBvbmVudC5iYXNlLCBuZXh0QmFzZSA9IGNvbXBvbmVudC5fX2IsIGluaXRpYWxCYXNlID0gaXNVcGRhdGUgfHwgbmV4dEJhc2UsIGluaXRpYWxDaGlsZENvbXBvbmVudCA9IGNvbXBvbmVudC5fY29tcG9uZW50LCBza2lwID0gITE7XG4gICAgICAgICAgICBpZiAoaXNVcGRhdGUpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcmV2aW91c1Byb3BzO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGF0ZSA9IHByZXZpb3VzU3RhdGU7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBwcmV2aW91c0NvbnRleHQ7XG4gICAgICAgICAgICAgICAgaWYgKDIgIT09IG9wdHMgJiYgY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZSAmJiAhMSA9PT0gY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpKSBza2lwID0gITA7IGVsc2UgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsVXBkYXRlKSBjb21wb25lbnQuY29tcG9uZW50V2lsbFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3AgPSBjb21wb25lbnQuX19zID0gY29tcG9uZW50Ll9fYyA9IGNvbXBvbmVudC5fX2IgPSBudWxsO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9fZCA9ICExO1xuICAgICAgICAgICAgaWYgKCFza2lwKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyZWQgPSBjb21wb25lbnQucmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5nZXRDaGlsZENvbnRleHQpIGNvbnRleHQgPSBleHRlbmQoZXh0ZW5kKHt9LCBjb250ZXh0KSwgY29tcG9uZW50LmdldENoaWxkQ29udGV4dCgpKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9Vbm1vdW50LCBiYXNlLCBjaGlsZENvbXBvbmVudCA9IHJlbmRlcmVkICYmIHJlbmRlcmVkLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBjaGlsZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGRQcm9wcyA9IGdldE5vZGVQcm9wcyhyZW5kZXJlZCk7XG4gICAgICAgICAgICAgICAgICAgIGluc3QgPSBpbml0aWFsQ2hpbGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0ICYmIGluc3QuY29uc3RydWN0b3IgPT09IGNoaWxkQ29tcG9uZW50ICYmIGNoaWxkUHJvcHMua2V5ID09IGluc3QuX19rKSBzZXRDb21wb25lbnRQcm9wcyhpbnN0LCBjaGlsZFByb3BzLCAxLCBjb250ZXh0LCAhMSk7IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9Vbm1vdW50ID0gaW5zdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5fY29tcG9uZW50ID0gaW5zdCA9IGNyZWF0ZUNvbXBvbmVudChjaGlsZENvbXBvbmVudCwgY2hpbGRQcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0Ll9fYiA9IGluc3QuX19iIHx8IG5leHRCYXNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdC5fX3UgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhpbnN0LCBjaGlsZFByb3BzLCAwLCBjb250ZXh0LCAhMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJDb21wb25lbnQoaW5zdCwgMSwgbW91bnRBbGwsICEwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBiYXNlID0gaW5zdC5iYXNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNiYXNlID0gaW5pdGlhbEJhc2U7XG4gICAgICAgICAgICAgICAgICAgIHRvVW5tb3VudCA9IGluaXRpYWxDaGlsZENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvVW5tb3VudCkgY2Jhc2UgPSBjb21wb25lbnQuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbml0aWFsQmFzZSB8fCAxID09PSBvcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2Jhc2UpIGNiYXNlLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZSA9IGRpZmYoY2Jhc2UsIHJlbmRlcmVkLCBjb250ZXh0LCBtb3VudEFsbCB8fCAhaXNVcGRhdGUsIGluaXRpYWxCYXNlICYmIGluaXRpYWxCYXNlLnBhcmVudE5vZGUsICEwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbEJhc2UgJiYgYmFzZSAhPT0gaW5pdGlhbEJhc2UgJiYgaW5zdCAhPT0gaW5pdGlhbENoaWxkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlUGFyZW50ID0gaW5pdGlhbEJhc2UucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2VQYXJlbnQgJiYgYmFzZSAhPT0gYmFzZVBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZVBhcmVudC5yZXBsYWNlQ2hpbGQoYmFzZSwgaW5pdGlhbEJhc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0b1VubW91bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsQmFzZS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShpbml0aWFsQmFzZSwgITEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0b1VubW91bnQpIHVubW91bnRDb21wb25lbnQodG9Vbm1vdW50KTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuYmFzZSA9IGJhc2U7XG4gICAgICAgICAgICAgICAgaWYgKGJhc2UgJiYgIWlzQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBvbmVudFJlZiA9IGNvbXBvbmVudCwgdCA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHQgPSB0Ll9fdSkgKGNvbXBvbmVudFJlZiA9IHQpLmJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgICAgICAgICBiYXNlLl9jb21wb25lbnQgPSBjb21wb25lbnRSZWY7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuX2NvbXBvbmVudENvbnN0cnVjdG9yID0gY29tcG9uZW50UmVmLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNVcGRhdGUgfHwgbW91bnRBbGwpIG1vdW50cy51bnNoaWZ0KGNvbXBvbmVudCk7IGVsc2UgaWYgKCFza2lwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUocHJldmlvdXNQcm9wcywgcHJldmlvdXNTdGF0ZSwgcHJldmlvdXNDb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlclVwZGF0ZSkgb3B0aW9ucy5hZnRlclVwZGF0ZShjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgIT0gY29tcG9uZW50Ll9faCkgd2hpbGUgKGNvbXBvbmVudC5fX2gubGVuZ3RoKSBjb21wb25lbnQuX19oLnBvcCgpLmNhbGwoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmICghZGlmZkxldmVsICYmICFpc0NoaWxkKSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJ1aWxkQ29tcG9uZW50RnJvbVZOb2RlKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIHZhciBjID0gZG9tICYmIGRvbS5fY29tcG9uZW50LCBvcmlnaW5hbENvbXBvbmVudCA9IGMsIG9sZERvbSA9IGRvbSwgaXNEaXJlY3RPd25lciA9IGMgJiYgZG9tLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWUsIGlzT3duZXIgPSBpc0RpcmVjdE93bmVyLCBwcm9wcyA9IGdldE5vZGVQcm9wcyh2bm9kZSk7XG4gICAgICAgIHdoaWxlIChjICYmICFpc093bmVyICYmIChjID0gYy5fX3UpKSBpc093bmVyID0gYy5jb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgICAgIGlmIChjICYmIGlzT3duZXIgJiYgKCFtb3VudEFsbCB8fCBjLl9jb21wb25lbnQpKSB7XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMywgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsQ29tcG9uZW50ICYmICFpc0RpcmVjdE93bmVyKSB7XG4gICAgICAgICAgICAgICAgdW5tb3VudENvbXBvbmVudChvcmlnaW5hbENvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgZG9tID0gb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMgPSBjcmVhdGVDb21wb25lbnQodm5vZGUubm9kZU5hbWUsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChkb20gJiYgIWMuX19iKSB7XG4gICAgICAgICAgICAgICAgYy5fX2IgPSBkb207XG4gICAgICAgICAgICAgICAgb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGMsIHByb3BzLCAxLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBkb20gPSBjLmJhc2U7XG4gICAgICAgICAgICBpZiAob2xkRG9tICYmIGRvbSAhPT0gb2xkRG9tKSB7XG4gICAgICAgICAgICAgICAgb2xkRG9tLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG9sZERvbSwgITEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmJlZm9yZVVubW91bnQpIG9wdGlvbnMuYmVmb3JlVW5tb3VudChjb21wb25lbnQpO1xuICAgICAgICB2YXIgYmFzZSA9IGNvbXBvbmVudC5iYXNlO1xuICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuICAgICAgICBjb21wb25lbnQuYmFzZSA9IG51bGw7XG4gICAgICAgIHZhciBpbm5lciA9IGNvbXBvbmVudC5fY29tcG9uZW50O1xuICAgICAgICBpZiAoaW5uZXIpIHVubW91bnRDb21wb25lbnQoaW5uZXIpOyBlbHNlIGlmIChiYXNlKSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5fX3ByZWFjdGF0dHJfICYmIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYpIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBjb21wb25lbnQuX19iID0gYmFzZTtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUoYmFzZSk7XG4gICAgICAgICAgICBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihiYXNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihudWxsKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX19kID0gITA7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhdGUgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlcih2bm9kZSwgcGFyZW50LCBtZXJnZSkge1xuICAgICAgICByZXR1cm4gZGlmZihtZXJnZSwgdm5vZGUsIHt9LCAhMSwgcGFyZW50LCAhMSk7XG4gICAgfVxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIEVNUFRZX0NISUxEUkVOID0gW107XG4gICAgdmFyIGRlZmVyID0gJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgUHJvbWlzZSA/IFByb21pc2UucmVzb2x2ZSgpLnRoZW4uYmluZChQcm9taXNlLnJlc29sdmUoKSkgOiBzZXRUaW1lb3V0O1xuICAgIHZhciBJU19OT05fRElNRU5TSU9OQUwgPSAvYWNpdHxleCg/OnN8Z3xufHB8JCl8cnBofG93c3xtbmN8bnR3fGluZVtjaF18em9vfF5vcmQvaTtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB2YXIgbW91bnRzID0gW107XG4gICAgdmFyIGRpZmZMZXZlbCA9IDA7XG4gICAgdmFyIGlzU3ZnTW9kZSA9ICExO1xuICAgIHZhciBoeWRyYXRpbmcgPSAhMTtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIGV4dGVuZChDb21wb25lbnQucHJvdG90eXBlLCB7XG4gICAgICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fX3MpIHRoaXMuX19zID0gZXh0ZW5kKHt9LCBzKTtcbiAgICAgICAgICAgIGV4dGVuZChzLCAnZnVuY3Rpb24nID09IHR5cGVvZiBzdGF0ZSA/IHN0YXRlKHMsIHRoaXMucHJvcHMpIDogc3RhdGUpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBlbnF1ZXVlUmVuZGVyKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgKHRoaXMuX19oID0gdGhpcy5fX2ggfHwgW10pLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KHRoaXMsIDIpO1xuICAgICAgICB9LFxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge31cbiAgICB9KTtcbiAgICB2YXIgcHJlYWN0ID0ge1xuICAgICAgICBoOiBoLFxuICAgICAgICBjcmVhdGVFbGVtZW50OiBoLFxuICAgICAgICBjbG9uZUVsZW1lbnQ6IGNsb25lRWxlbWVudCxcbiAgICAgICAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gICAgICAgIHJlbmRlcjogcmVuZGVyLFxuICAgICAgICByZXJlbmRlcjogcmVyZW5kZXIsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICB9O1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgbW9kdWxlKSBtb2R1bGUuZXhwb3J0cyA9IHByZWFjdDsgZWxzZSBzZWxmLnByZWFjdCA9IHByZWFjdDtcbn0oKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZWFjdC5qcy5tYXAiLCJtb2R1bGUuZXhwb3J0cyA9IHByZXR0aWVyQnl0ZXNcblxuZnVuY3Rpb24gcHJldHRpZXJCeXRlcyAobnVtKSB7XG4gIGlmICh0eXBlb2YgbnVtICE9PSAnbnVtYmVyJyB8fCBpc05hTihudW0pKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBudW1iZXIsIGdvdCAnICsgdHlwZW9mIG51bSlcbiAgfVxuXG4gIHZhciBuZWcgPSBudW0gPCAwXG4gIHZhciB1bml0cyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQicsICdQQicsICdFQicsICdaQicsICdZQiddXG5cbiAgaWYgKG5lZykge1xuICAgIG51bSA9IC1udW1cbiAgfVxuXG4gIGlmIChudW0gPCAxKSB7XG4gICAgcmV0dXJuIChuZWcgPyAnLScgOiAnJykgKyBudW0gKyAnIEInXG4gIH1cblxuICB2YXIgZXhwb25lbnQgPSBNYXRoLm1pbihNYXRoLmZsb29yKE1hdGgubG9nKG51bSkgLyBNYXRoLmxvZygxMDAwKSksIHVuaXRzLmxlbmd0aCAtIDEpXG4gIG51bSA9IE51bWJlcihudW0gLyBNYXRoLnBvdygxMDAwLCBleHBvbmVudCkpXG4gIHZhciB1bml0ID0gdW5pdHNbZXhwb25lbnRdXG5cbiAgaWYgKG51bSA+PSAxMCB8fCBudW0gJSAxID09PSAwKSB7XG4gICAgLy8gRG8gbm90IHNob3cgZGVjaW1hbHMgd2hlbiB0aGUgbnVtYmVyIGlzIHR3by1kaWdpdCwgb3IgaWYgdGhlIG51bWJlciBoYXMgbm9cbiAgICAvLyBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICByZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bS50b0ZpeGVkKDApICsgJyAnICsgdW5pdFxuICB9IGVsc2Uge1xuICAgIHJldHVybiAobmVnID8gJy0nIDogJycpICsgbnVtLnRvRml4ZWQoMSkgKyAnICcgKyB1bml0XG4gIH1cbn1cbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIHdpbGRjYXJkXG5cbiAgVmVyeSBzaW1wbGUgd2lsZGNhcmQgbWF0Y2hpbmcsIHdoaWNoIGlzIGRlc2lnbmVkIHRvIHByb3ZpZGUgdGhlIHNhbWVcbiAgZnVuY3Rpb25hbGl0eSB0aGF0IGlzIGZvdW5kIGluIHRoZVxuICBbZXZlXShodHRwczovL2dpdGh1Yi5jb20vYWRvYmUtd2VicGxhdGZvcm0vZXZlKSBldmVudGluZyBsaWJyYXJ5LlxuXG4gICMjIFVzYWdlXG5cbiAgSXQgd29ya3Mgd2l0aCBzdHJpbmdzOlxuXG4gIDw8PCBleGFtcGxlcy9zdHJpbmdzLmpzXG5cbiAgQXJyYXlzOlxuXG4gIDw8PCBleGFtcGxlcy9hcnJheXMuanNcblxuICBPYmplY3RzIChtYXRjaGluZyBhZ2FpbnN0IGtleXMpOlxuXG4gIDw8PCBleGFtcGxlcy9vYmplY3RzLmpzXG5cbiAgV2hpbGUgdGhlIGxpYnJhcnkgd29ya3MgaW4gTm9kZSwgaWYgeW91IGFyZSBhcmUgbG9va2luZyBmb3IgZmlsZS1iYXNlZFxuICB3aWxkY2FyZCBtYXRjaGluZyB0aGVuIHlvdSBzaG91bGQgaGF2ZSBhIGxvb2sgYXQ6XG5cbiAgPGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3Mvbm9kZS1nbG9iPlxuKiovXG5cbmZ1bmN0aW9uIFdpbGRjYXJkTWF0Y2hlcih0ZXh0LCBzZXBhcmF0b3IpIHtcbiAgdGhpcy50ZXh0ID0gdGV4dCA9IHRleHQgfHwgJyc7XG4gIHRoaXMuaGFzV2lsZCA9IH50ZXh0LmluZGV4T2YoJyonKTtcbiAgdGhpcy5zZXBhcmF0b3IgPSBzZXBhcmF0b3I7XG4gIHRoaXMucGFydHMgPSB0ZXh0LnNwbGl0KHNlcGFyYXRvcik7XG59XG5cbldpbGRjYXJkTWF0Y2hlci5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgbWF0Y2hlcyA9IHRydWU7XG4gIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XG4gIHZhciBpaTtcbiAgdmFyIHBhcnRzQ291bnQgPSBwYXJ0cy5sZW5ndGg7XG4gIHZhciB0ZXN0UGFydHM7XG5cbiAgaWYgKHR5cGVvZiBpbnB1dCA9PSAnc3RyaW5nJyB8fCBpbnB1dCBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgIGlmICghdGhpcy5oYXNXaWxkICYmIHRoaXMudGV4dCAhPSBpbnB1dCkge1xuICAgICAgbWF0Y2hlcyA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXN0UGFydHMgPSAoaW5wdXQgfHwgJycpLnNwbGl0KHRoaXMuc2VwYXJhdG9yKTtcbiAgICAgIGZvciAoaWkgPSAwOyBtYXRjaGVzICYmIGlpIDwgcGFydHNDb3VudDsgaWkrKykge1xuICAgICAgICBpZiAocGFydHNbaWldID09PSAnKicpICB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAoaWkgPCB0ZXN0UGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgbWF0Y2hlcyA9IHBhcnRzW2lpXSA9PT0gdGVzdFBhcnRzW2lpXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRjaGVzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgbWF0Y2hlcywgdGhlbiByZXR1cm4gdGhlIGNvbXBvbmVudCBwYXJ0c1xuICAgICAgbWF0Y2hlcyA9IG1hdGNoZXMgJiYgdGVzdFBhcnRzO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgaW5wdXQuc3BsaWNlID09ICdmdW5jdGlvbicpIHtcbiAgICBtYXRjaGVzID0gW107XG5cbiAgICBmb3IgKGlpID0gaW5wdXQubGVuZ3RoOyBpaS0tOyApIHtcbiAgICAgIGlmICh0aGlzLm1hdGNoKGlucHV0W2lpXSkpIHtcbiAgICAgICAgbWF0Y2hlc1ttYXRjaGVzLmxlbmd0aF0gPSBpbnB1dFtpaV07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PSAnb2JqZWN0Jykge1xuICAgIG1hdGNoZXMgPSB7fTtcblxuICAgIGZvciAodmFyIGtleSBpbiBpbnB1dCkge1xuICAgICAgaWYgKHRoaXMubWF0Y2goa2V5KSkge1xuICAgICAgICBtYXRjaGVzW2tleV0gPSBpbnB1dFtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXRjaGVzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0LCB0ZXN0LCBzZXBhcmF0b3IpIHtcbiAgdmFyIG1hdGNoZXIgPSBuZXcgV2lsZGNhcmRNYXRjaGVyKHRleHQsIHNlcGFyYXRvciB8fCAvW1xcL1xcLl0vKTtcbiAgaWYgKHR5cGVvZiB0ZXN0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIG1hdGNoZXIubWF0Y2godGVzdCk7XG4gIH1cblxuICByZXR1cm4gbWF0Y2hlcjtcbn07XG4iLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4uL2NvcmUvVXRpbHMnKVxuY29uc3QgVHJhbnNsYXRvciA9IHJlcXVpcmUoJy4uL2NvcmUvVHJhbnNsYXRvcicpXG5jb25zdCBlZSA9IHJlcXVpcmUoJ25hbWVzcGFjZS1lbWl0dGVyJylcbmNvbnN0IGN1aWQgPSByZXF1aXJlKCdjdWlkJylcbmNvbnN0IHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcbmNvbnN0IHByZXR0eUJ5dGVzID0gcmVxdWlyZSgncHJldHRpZXItYnl0ZXMnKVxuY29uc3QgbWF0Y2ggPSByZXF1aXJlKCdtaW1lLW1hdGNoJylcbmNvbnN0IERlZmF1bHRTdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlL0RlZmF1bHRTdG9yZScpXG5cbi8qKlxuICogVXBweSBDb3JlIG1vZHVsZS5cbiAqIE1hbmFnZXMgcGx1Z2lucywgc3RhdGUgdXBkYXRlcywgYWN0cyBhcyBhbiBldmVudCBidXMsXG4gKiBhZGRzL3JlbW92ZXMgZmlsZXMgYW5kIG1ldGFkYXRhLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRzIOKAlCBVcHB5IG9wdGlvbnNcbiAqL1xuY2xhc3MgVXBweSB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgY29uc3QgZGVmYXVsdExvY2FsZSA9IHtcbiAgICAgIHN0cmluZ3M6IHtcbiAgICAgICAgeW91Q2FuT25seVVwbG9hZFg6IHtcbiAgICAgICAgICAwOiAnWW91IGNhbiBvbmx5IHVwbG9hZCAle3NtYXJ0X2NvdW50fSBmaWxlJyxcbiAgICAgICAgICAxOiAnWW91IGNhbiBvbmx5IHVwbG9hZCAle3NtYXJ0X2NvdW50fSBmaWxlcydcbiAgICAgICAgfSxcbiAgICAgICAgeW91SGF2ZVRvQXRMZWFzdFNlbGVjdFg6IHtcbiAgICAgICAgICAwOiAnWW91IGhhdmUgdG8gc2VsZWN0IGF0IGxlYXN0ICV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgICAgICAgIDE6ICdZb3UgaGF2ZSB0byBzZWxlY3QgYXQgbGVhc3QgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gICAgICAgIH0sXG4gICAgICAgIGV4Y2VlZHNTaXplOiAnVGhpcyBmaWxlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkIHNpemUgb2YnLFxuICAgICAgICB5b3VDYW5Pbmx5VXBsb2FkRmlsZVR5cGVzOiAnWW91IGNhbiBvbmx5IHVwbG9hZDonLFxuICAgICAgICB1cHB5U2VydmVyRXJyb3I6ICdDb25uZWN0aW9uIHdpdGggVXBweSBTZXJ2ZXIgZmFpbGVkJ1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGlkOiAndXBweScsXG4gICAgICBhdXRvUHJvY2VlZDogdHJ1ZSxcbiAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgIHJlc3RyaWN0aW9uczoge1xuICAgICAgICBtYXhGaWxlU2l6ZTogZmFsc2UsXG4gICAgICAgIG1heE51bWJlck9mRmlsZXM6IGZhbHNlLFxuICAgICAgICBtaW5OdW1iZXJPZkZpbGVzOiBmYWxzZSxcbiAgICAgICAgYWxsb3dlZEZpbGVUeXBlczogZmFsc2VcbiAgICAgIH0sXG4gICAgICBtZXRhOiB7fSxcbiAgICAgIG9uQmVmb3JlRmlsZUFkZGVkOiAoY3VycmVudEZpbGUsIGZpbGVzKSA9PiBQcm9taXNlLnJlc29sdmUoKSxcbiAgICAgIG9uQmVmb3JlVXBsb2FkOiAoZmlsZXMpID0+IFByb21pc2UucmVzb2x2ZSgpLFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlLFxuICAgICAgc3RvcmU6IG5ldyBEZWZhdWx0U3RvcmUoKVxuICAgIH1cblxuICAgIC8vIE1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG5cbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGU6IHRoaXMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuXG4gICAgLy8gQ29udGFpbmVyIGZvciBkaWZmZXJlbnQgdHlwZXMgb2YgcGx1Z2luc1xuICAgIHRoaXMucGx1Z2lucyA9IHt9XG5cbiAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih7bG9jYWxlOiB0aGlzLm9wdHMubG9jYWxlfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuICAgIHRoaXMuZ2V0U3RhdGUgPSB0aGlzLmdldFN0YXRlLmJpbmQodGhpcylcbiAgICB0aGlzLmdldFBsdWdpbiA9IHRoaXMuZ2V0UGx1Z2luLmJpbmQodGhpcylcbiAgICB0aGlzLnNldEZpbGVNZXRhID0gdGhpcy5zZXRGaWxlTWV0YS5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZXRGaWxlU3RhdGUgPSB0aGlzLnNldEZpbGVTdGF0ZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5sb2cgPSB0aGlzLmxvZy5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbmZvID0gdGhpcy5pbmZvLmJpbmQodGhpcylcbiAgICB0aGlzLmhpZGVJbmZvID0gdGhpcy5oaWRlSW5mby5iaW5kKHRoaXMpXG4gICAgdGhpcy5hZGRGaWxlID0gdGhpcy5hZGRGaWxlLmJpbmQodGhpcylcbiAgICB0aGlzLnJlbW92ZUZpbGUgPSB0aGlzLnJlbW92ZUZpbGUuYmluZCh0aGlzKVxuICAgIHRoaXMucGF1c2VSZXN1bWUgPSB0aGlzLnBhdXNlUmVzdW1lLmJpbmQodGhpcylcbiAgICB0aGlzLl9jYWxjdWxhdGVQcm9ncmVzcyA9IHRoaXMuX2NhbGN1bGF0ZVByb2dyZXNzLmJpbmQodGhpcylcbiAgICB0aGlzLnVwZGF0ZU9ubGluZVN0YXR1cyA9IHRoaXMudXBkYXRlT25saW5lU3RhdHVzLmJpbmQodGhpcylcbiAgICB0aGlzLnJlc2V0UHJvZ3Jlc3MgPSB0aGlzLnJlc2V0UHJvZ3Jlc3MuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5wYXVzZUFsbCA9IHRoaXMucGF1c2VBbGwuYmluZCh0aGlzKVxuICAgIHRoaXMucmVzdW1lQWxsID0gdGhpcy5yZXN1bWVBbGwuYmluZCh0aGlzKVxuICAgIHRoaXMucmV0cnlBbGwgPSB0aGlzLnJldHJ5QWxsLmJpbmQodGhpcylcbiAgICB0aGlzLmNhbmNlbEFsbCA9IHRoaXMuY2FuY2VsQWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnJldHJ5VXBsb2FkID0gdGhpcy5yZXRyeVVwbG9hZC5iaW5kKHRoaXMpXG4gICAgdGhpcy51cGxvYWQgPSB0aGlzLnVwbG9hZC5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLmVtaXR0ZXIgPSBlZSgpXG4gICAgdGhpcy5vbiA9IHRoaXMub24uYmluZCh0aGlzKVxuICAgIHRoaXMub2ZmID0gdGhpcy5vZmYuYmluZCh0aGlzKVxuICAgIHRoaXMub25jZSA9IHRoaXMuZW1pdHRlci5vbmNlLmJpbmQodGhpcy5lbWl0dGVyKVxuICAgIHRoaXMuZW1pdCA9IHRoaXMuZW1pdHRlci5lbWl0LmJpbmQodGhpcy5lbWl0dGVyKVxuXG4gICAgdGhpcy5wcmVQcm9jZXNzb3JzID0gW11cbiAgICB0aGlzLnVwbG9hZGVycyA9IFtdXG4gICAgdGhpcy5wb3N0UHJvY2Vzc29ycyA9IFtdXG5cbiAgICB0aGlzLnN0b3JlID0gdGhpcy5vcHRzLnN0b3JlXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBwbHVnaW5zOiB7fSxcbiAgICAgIGZpbGVzOiB7fSxcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiB7fSxcbiAgICAgIGNhcGFiaWxpdGllczoge1xuICAgICAgICByZXN1bWFibGVVcGxvYWRzOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIHRvdGFsUHJvZ3Jlc3M6IDAsXG4gICAgICBtZXRhOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLm9wdHMubWV0YSksXG4gICAgICBpbmZvOiB7XG4gICAgICAgIGlzSGlkZGVuOiB0cnVlLFxuICAgICAgICB0eXBlOiAnaW5mbycsXG4gICAgICAgIG1lc3NhZ2U6ICcnXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMuX3N0b3JlVW5zdWJzY3JpYmUgPSB0aGlzLnN0b3JlLnN1YnNjcmliZSgocHJldlN0YXRlLCBuZXh0U3RhdGUsIHBhdGNoKSA9PiB7XG4gICAgICB0aGlzLmVtaXQoJ3N0YXRlLXVwZGF0ZScsIHByZXZTdGF0ZSwgbmV4dFN0YXRlLCBwYXRjaClcbiAgICAgIHRoaXMudXBkYXRlQWxsKG5leHRTdGF0ZSlcbiAgICB9KVxuXG4gICAgLy8gZm9yIGRlYnVnZ2luZyBhbmQgdGVzdGluZ1xuICAgIC8vIHRoaXMudXBkYXRlTnVtID0gMFxuICAgIGlmICh0aGlzLm9wdHMuZGVidWcpIHtcbiAgICAgIGdsb2JhbC51cHB5TG9nID0gJydcbiAgICAgIGdsb2JhbFt0aGlzLm9wdHMuaWRdID0gdGhpc1xuICAgIH1cbiAgfVxuXG4gIG9uIChldmVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLmVtaXR0ZXIub24oZXZlbnQsIGNhbGxiYWNrKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBvZmYgKGV2ZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdHRlci5vZmYoZXZlbnQsIGNhbGxiYWNrKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvbiBhbGwgcGx1Z2lucyBhbmQgcnVuIGB1cGRhdGVgIG9uIHRoZW0uXG4gICAqIENhbGxlZCBlYWNoIHRpbWUgc3RhdGUgY2hhbmdlcy5cbiAgICpcbiAgICovXG4gIHVwZGF0ZUFsbCAoc3RhdGUpIHtcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKHBsdWdpbiA9PiB7XG4gICAgICBwbHVnaW4udXBkYXRlKHN0YXRlKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBzdGF0ZVxuICAgKlxuICAgKiBAcGFyYW0ge3BhdGNofSBvYmplY3RcbiAgICovXG4gIHNldFN0YXRlIChwYXRjaCkge1xuICAgIHRoaXMuc3RvcmUuc2V0U3RhdGUocGF0Y2gpXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBjdXJyZW50IHN0YXRlLlxuICAgKi9cbiAgZ2V0U3RhdGUgKCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlLmdldFN0YXRlKClcbiAgfVxuXG4gIC8qKlxuICAqIEJhY2sgY29tcGF0IGZvciB3aGVuIHRoaXMuc3RhdGUgaXMgdXNlZCBpbnN0ZWFkIG9mIHRoaXMuZ2V0U3RhdGUoKS5cbiAgKi9cbiAgZ2V0IHN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpXG4gIH1cblxuICAvKipcbiAgKiBTaG9ydGhhbmQgdG8gc2V0IHN0YXRlIGZvciBhIHNwZWNpZmljIGZpbGUuXG4gICovXG4gIHNldEZpbGVTdGF0ZSAoZmlsZUlELCBzdGF0ZSkge1xuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcywge1xuICAgICAgICBbZmlsZUlEXTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzW2ZpbGVJRF0sIHN0YXRlKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgcmVzZXRQcm9ncmVzcyAoKSB7XG4gICAgY29uc3QgZGVmYXVsdFByb2dyZXNzID0ge1xuICAgICAgcGVyY2VudGFnZTogMCxcbiAgICAgIGJ5dGVzVXBsb2FkZWQ6IDAsXG4gICAgICB1cGxvYWRDb21wbGV0ZTogZmFsc2UsXG4gICAgICB1cGxvYWRTdGFydGVkOiBmYWxzZVxuICAgIH1cbiAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSB7fVxuICAgIE9iamVjdC5rZXlzKGZpbGVzKS5mb3JFYWNoKGZpbGVJRCA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGVJRF0pXG4gICAgICB1cGRhdGVkRmlsZS5wcm9ncmVzcyA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlLnByb2dyZXNzLCBkZWZhdWx0UHJvZ3Jlc3MpXG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IHVwZGF0ZWRGaWxlXG4gICAgfSlcblxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlcyxcbiAgICAgIHRvdGFsUHJvZ3Jlc3M6IDBcbiAgICB9KVxuXG4gICAgLy8gVE9ETyBEb2N1bWVudCBvbiB0aGUgd2Vic2l0ZVxuICAgIHRoaXMuZW1pdCgncmVzZXQtcHJvZ3Jlc3MnKVxuICB9XG5cbiAgYWRkUHJlUHJvY2Vzc29yIChmbikge1xuICAgIHRoaXMucHJlUHJvY2Vzc29ycy5wdXNoKGZuKVxuICB9XG5cbiAgcmVtb3ZlUHJlUHJvY2Vzc29yIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnByZVByb2Nlc3NvcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMucHJlUHJvY2Vzc29ycy5zcGxpY2UoaSwgMSlcbiAgICB9XG4gIH1cblxuICBhZGRQb3N0UHJvY2Vzc29yIChmbikge1xuICAgIHRoaXMucG9zdFByb2Nlc3NvcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVBvc3RQcm9jZXNzb3IgKGZuKSB7XG4gICAgY29uc3QgaSA9IHRoaXMucG9zdFByb2Nlc3NvcnMuaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMucG9zdFByb2Nlc3NvcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgYWRkVXBsb2FkZXIgKGZuKSB7XG4gICAgdGhpcy51cGxvYWRlcnMucHVzaChmbilcbiAgfVxuXG4gIHJlbW92ZVVwbG9hZGVyIChmbikge1xuICAgIGNvbnN0IGkgPSB0aGlzLnVwbG9hZGVycy5pbmRleE9mKGZuKVxuICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgdGhpcy51cGxvYWRlcnMuc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgc2V0TWV0YSAoZGF0YSkge1xuICAgIGNvbnN0IHVwZGF0ZWRNZXRhID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLm1ldGEsIGRhdGEpXG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuXG4gICAgT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5mb3JFYWNoKChmaWxlSUQpID0+IHtcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0ubWV0YSwgZGF0YSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMubG9nKCdBZGRpbmcgbWV0YWRhdGE6JylcbiAgICB0aGlzLmxvZyhkYXRhKVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBtZXRhOiB1cGRhdGVkTWV0YSxcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXNcbiAgICB9KVxuICB9XG5cbiAgc2V0RmlsZU1ldGEgKGZpbGVJRCwgZGF0YSkge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBpZiAoIXVwZGF0ZWRGaWxlc1tmaWxlSURdKSB7XG4gICAgICB0aGlzLmxvZygnV2FzIHRyeWluZyB0byBzZXQgbWV0YWRhdGEgZm9yIGEgZmlsZSB0aGF04oCZcyBub3Qgd2l0aCB1cyBhbnltb3JlOiAnLCBmaWxlSUQpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgbmV3TWV0YSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLm1ldGEsIGRhdGEpXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZUlEXSwge1xuICAgICAgbWV0YTogbmV3TWV0YVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgZmlsZSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSUQgVGhlIElEIG9mIHRoZSBmaWxlIG9iamVjdCB0byByZXR1cm4uXG4gICAqL1xuICBnZXRGaWxlIChmaWxlSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmZpbGVzW2ZpbGVJRF1cbiAgfVxuXG4gIC8qKlxuICAqIENoZWNrIGlmIG1pbk51bWJlck9mRmlsZXMgcmVzdHJpY3Rpb24gaXMgcmVhY2hlZCBiZWZvcmUgdXBsb2FkaW5nLlxuICAqXG4gICogQHJldHVybiB7Ym9vbGVhbn1cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfY2hlY2tNaW5OdW1iZXJPZkZpbGVzICgpIHtcbiAgICBjb25zdCB7bWluTnVtYmVyT2ZGaWxlc30gPSB0aGlzLm9wdHMucmVzdHJpY3Rpb25zXG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykubGVuZ3RoIDwgbWluTnVtYmVyT2ZGaWxlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bigneW91SGF2ZVRvQXRMZWFzdFNlbGVjdFgnLCB7IHNtYXJ0X2NvdW50OiBtaW5OdW1iZXJPZkZpbGVzIH0pfWApXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hlY2sgaWYgZmlsZSBwYXNzZXMgYSBzZXQgb2YgcmVzdHJpY3Rpb25zIHNldCBpbiBvcHRpb25zOiBtYXhGaWxlU2l6ZSxcbiAgKiBtYXhOdW1iZXJPZkZpbGVzIGFuZCBhbGxvd2VkRmlsZVR5cGVzLlxuICAqXG4gICogQHBhcmFtIHtvYmplY3R9IGZpbGUgb2JqZWN0IHRvIGNoZWNrXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2NoZWNrUmVzdHJpY3Rpb25zIChmaWxlKSB7XG4gICAgY29uc3Qge21heEZpbGVTaXplLCBtYXhOdW1iZXJPZkZpbGVzLCBhbGxvd2VkRmlsZVR5cGVzfSA9IHRoaXMub3B0cy5yZXN0cmljdGlvbnNcblxuICAgIGlmIChtYXhOdW1iZXJPZkZpbGVzKSB7XG4gICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5nZXRTdGF0ZSgpLmZpbGVzKS5sZW5ndGggKyAxID4gbWF4TnVtYmVyT2ZGaWxlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dGhpcy5pMThuKCd5b3VDYW5Pbmx5VXBsb2FkWCcsIHsgc21hcnRfY291bnQ6IG1heE51bWJlck9mRmlsZXMgfSl9YClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYWxsb3dlZEZpbGVUeXBlcykge1xuICAgICAgY29uc3QgaXNDb3JyZWN0RmlsZVR5cGUgPSBhbGxvd2VkRmlsZVR5cGVzLmZpbHRlcigodHlwZSkgPT4ge1xuICAgICAgICBpZiAoIWZpbGUudHlwZSkgcmV0dXJuIGZhbHNlXG4gICAgICAgIHJldHVybiBtYXRjaChmaWxlLnR5cGUsIHR5cGUpXG4gICAgICB9KS5sZW5ndGggPiAwXG5cbiAgICAgIGlmICghaXNDb3JyZWN0RmlsZVR5cGUpIHtcbiAgICAgICAgY29uc3QgYWxsb3dlZEZpbGVUeXBlc1N0cmluZyA9IGFsbG93ZWRGaWxlVHlwZXMuam9pbignLCAnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7dGhpcy5pMThuKCd5b3VDYW5Pbmx5VXBsb2FkRmlsZVR5cGVzJyl9ICR7YWxsb3dlZEZpbGVUeXBlc1N0cmluZ31gKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhGaWxlU2l6ZSkge1xuICAgICAgaWYgKGZpbGUuZGF0YS5zaXplID4gbWF4RmlsZVNpemUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3RoaXMuaTE4bignZXhjZWVkc1NpemUnKX0gJHtwcmV0dHlCeXRlcyhtYXhGaWxlU2l6ZSl9YClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBBZGQgYSBuZXcgZmlsZSB0byBgc3RhdGUuZmlsZXNgLiBUaGlzIHdpbGwgcnVuIGBvbkJlZm9yZUZpbGVBZGRlZGAsXG4gICogdHJ5IHRvIGd1ZXNzIGZpbGUgdHlwZSBpbiBhIGNsZXZlciB3YXksIGNoZWNrIGZpbGUgYWdhaW5zdCByZXN0cmljdGlvbnMsXG4gICogYW5kIHN0YXJ0IGFuIHVwbG9hZCBpZiBgYXV0b1Byb2NlZWQgPT09IHRydWVgLlxuICAqXG4gICogQHBhcmFtIHtvYmplY3R9IGZpbGUgb2JqZWN0IHRvIGFkZFxuICAqL1xuICBhZGRGaWxlIChmaWxlKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAvLyBXcmFwIHRoaXMgaW4gYSBQcm9taXNlIGAudGhlbigpYCBoYW5kbGVyIHNvIGVycm9ycyB3aWxsIHJlamVjdCB0aGUgUHJvbWlzZVxuICAgICAgLy8gaW5zdGVhZCBvZiB0aHJvd2luZy5cbiAgICAgIC50aGVuKCgpID0+IHRoaXMub3B0cy5vbkJlZm9yZUZpbGVBZGRlZChmaWxlLCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpKVxuICAgICAgLnRoZW4oKCkgPT4gVXRpbHMuZ2V0RmlsZVR5cGUoZmlsZSkpXG4gICAgICAudGhlbigoZmlsZVR5cGUpID0+IHtcbiAgICAgICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgICAgICBsZXQgZmlsZU5hbWVcbiAgICAgICAgaWYgKGZpbGUubmFtZSkge1xuICAgICAgICAgIGZpbGVOYW1lID0gZmlsZS5uYW1lXG4gICAgICAgIH0gZWxzZSBpZiAoZmlsZVR5cGUuc3BsaXQoJy8nKVswXSA9PT0gJ2ltYWdlJykge1xuICAgICAgICAgIGZpbGVOYW1lID0gZmlsZVR5cGUuc3BsaXQoJy8nKVswXSArICcuJyArIGZpbGVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmaWxlTmFtZSA9ICdub25hbWUnXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmlsZUV4dGVuc2lvbiA9IFV0aWxzLmdldEZpbGVOYW1lQW5kRXh0ZW5zaW9uKGZpbGVOYW1lKS5leHRlbnNpb25cbiAgICAgICAgY29uc3QgaXNSZW1vdGUgPSBmaWxlLmlzUmVtb3RlIHx8IGZhbHNlXG5cbiAgICAgICAgY29uc3QgZmlsZUlEID0gVXRpbHMuZ2VuZXJhdGVGaWxlSUQoZmlsZSlcblxuICAgICAgICBjb25zdCBuZXdGaWxlID0ge1xuICAgICAgICAgIHNvdXJjZTogZmlsZS5zb3VyY2UgfHwgJycsXG4gICAgICAgICAgaWQ6IGZpbGVJRCxcbiAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICBleHRlbnNpb246IGZpbGVFeHRlbnNpb24gfHwgJycsXG4gICAgICAgICAgbWV0YTogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLm1ldGEsIHtcbiAgICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgdHlwZTogZmlsZVR5cGVcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB0eXBlOiBmaWxlVHlwZSxcbiAgICAgICAgICBkYXRhOiBmaWxlLmRhdGEsXG4gICAgICAgICAgcHJvZ3Jlc3M6IHtcbiAgICAgICAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICAgICAgICBieXRlc1VwbG9hZGVkOiAwLFxuICAgICAgICAgICAgYnl0ZXNUb3RhbDogZmlsZS5kYXRhLnNpemUgfHwgMCxcbiAgICAgICAgICAgIHVwbG9hZENvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIHVwbG9hZFN0YXJ0ZWQ6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaXplOiBmaWxlLmRhdGEuc2l6ZSB8fCAwLFxuICAgICAgICAgIGlzUmVtb3RlOiBpc1JlbW90ZSxcbiAgICAgICAgICByZW1vdGU6IGZpbGUucmVtb3RlIHx8ICcnLFxuICAgICAgICAgIHByZXZpZXc6IGZpbGUucHJldmlld1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fY2hlY2tSZXN0cmljdGlvbnMobmV3RmlsZSlcblxuICAgICAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IG5ld0ZpbGVcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG5cbiAgICAgICAgdGhpcy5lbWl0KCdmaWxlLWFkZGVkJywgbmV3RmlsZSlcbiAgICAgICAgdGhpcy5sb2coYEFkZGVkIGZpbGU6ICR7ZmlsZU5hbWV9LCAke2ZpbGVJRH0sIG1pbWUgdHlwZTogJHtmaWxlVHlwZX1gKVxuXG4gICAgICAgIGlmICh0aGlzLm9wdHMuYXV0b1Byb2NlZWQgJiYgIXRoaXMuc2NoZWR1bGVkQXV0b1Byb2NlZWQpIHtcbiAgICAgICAgICB0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlZEF1dG9Qcm9jZWVkID0gbnVsbFxuICAgICAgICAgICAgdGhpcy51cGxvYWQoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlIHx8IGVycilcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSwgNClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0eXBlb2YgZXJyID09PSAnb2JqZWN0JyA/IGVyci5tZXNzYWdlIDogZXJyXG4gICAgICAgIHRoaXMubG9nKG1lc3NhZ2UpXG4gICAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA1MDAwKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QodHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKSlcbiAgICAgIH0pXG4gIH1cblxuICByZW1vdmVGaWxlIChmaWxlSUQpIHtcbiAgICBjb25zdCB7IGZpbGVzLCBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5zdGF0ZVxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzKVxuICAgIGNvbnN0IHJlbW92ZWRGaWxlID0gdXBkYXRlZEZpbGVzW2ZpbGVJRF1cbiAgICBkZWxldGUgdXBkYXRlZEZpbGVzW2ZpbGVJRF1cblxuICAgIC8vIFJlbW92ZSB0aGlzIGZpbGUgZnJvbSBpdHMgYGN1cnJlbnRVcGxvYWRgLlxuICAgIGNvbnN0IHVwZGF0ZWRVcGxvYWRzID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudFVwbG9hZHMpXG4gICAgY29uc3QgcmVtb3ZlVXBsb2FkcyA9IFtdXG4gICAgT2JqZWN0LmtleXModXBkYXRlZFVwbG9hZHMpLmZvckVhY2goKHVwbG9hZElEKSA9PiB7XG4gICAgICBjb25zdCBuZXdGaWxlSURzID0gY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLmZpbGVJRHMuZmlsdGVyKCh1cGxvYWRGaWxlSUQpID0+IHVwbG9hZEZpbGVJRCAhPT0gZmlsZUlEKVxuICAgICAgLy8gUmVtb3ZlIHRoZSB1cGxvYWQgaWYgbm8gZmlsZXMgYXJlIGFzc29jaWF0ZWQgd2l0aCBpdCBhbnltb3JlLlxuICAgICAgaWYgKG5ld0ZpbGVJRHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJlbW92ZVVwbG9hZHMucHVzaCh1cGxvYWRJRClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZWRVcGxvYWRzW3VwbG9hZElEXSA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSwge1xuICAgICAgICBmaWxlSURzOiBuZXdGaWxlSURzXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiB1cGRhdGVkVXBsb2FkcyxcbiAgICAgIGZpbGVzOiB1cGRhdGVkRmlsZXNcbiAgICB9KVxuXG4gICAgcmVtb3ZlVXBsb2Fkcy5mb3JFYWNoKCh1cGxvYWRJRCkgPT4ge1xuICAgICAgdGhpcy5fcmVtb3ZlVXBsb2FkKHVwbG9hZElEKVxuICAgIH0pXG5cbiAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB0aGlzLmVtaXQoJ2ZpbGUtcmVtb3ZlZCcsIGZpbGVJRClcblxuICAgIC8vIENsZWFuIHVwIG9iamVjdCBVUkxzLlxuICAgIGlmIChyZW1vdmVkRmlsZS5wcmV2aWV3ICYmIFV0aWxzLmlzT2JqZWN0VVJMKHJlbW92ZWRGaWxlLnByZXZpZXcpKSB7XG4gICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHJlbW92ZWRGaWxlLnByZXZpZXcpXG4gICAgfVxuXG4gICAgdGhpcy5sb2coYFJlbW92ZWQgZmlsZTogJHtmaWxlSUR9YClcbiAgfVxuXG4gIHBhdXNlUmVzdW1lIChmaWxlSUQpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG5cbiAgICBpZiAodXBkYXRlZEZpbGVzW2ZpbGVJRF0udXBsb2FkQ29tcGxldGUpIHJldHVyblxuXG4gICAgY29uc3Qgd2FzUGF1c2VkID0gdXBkYXRlZEZpbGVzW2ZpbGVJRF0uaXNQYXVzZWQgfHwgZmFsc2VcbiAgICBjb25zdCBpc1BhdXNlZCA9ICF3YXNQYXVzZWRcblxuICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gT2JqZWN0LmFzc2lnbih7fSwgdXBkYXRlZEZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgIGlzUGF1c2VkOiBpc1BhdXNlZFxuICAgIH0pXG5cbiAgICB1cGRhdGVkRmlsZXNbZmlsZUlEXSA9IHVwZGF0ZWRGaWxlXG4gICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG5cbiAgICB0aGlzLmVtaXQoJ3VwbG9hZC1wYXVzZScsIGZpbGVJRCwgaXNQYXVzZWQpXG5cbiAgICByZXR1cm4gaXNQYXVzZWRcbiAgfVxuXG4gIHBhdXNlQWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcyA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gIXVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRDb21wbGV0ZSAmJlxuICAgICAgICAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlXS5wcm9ncmVzcy51cGxvYWRTdGFydGVkXG4gICAgfSlcblxuICAgIGluUHJvZ3Jlc3NVcGRhdGVkRmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCB1cGRhdGVkRmlsZXNbZmlsZV0sIHtcbiAgICAgICAgaXNQYXVzZWQ6IHRydWVcbiAgICAgIH0pXG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZV0gPSB1cGRhdGVkRmlsZVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG5cbiAgICB0aGlzLmVtaXQoJ3BhdXNlLWFsbCcpXG4gIH1cblxuICByZXN1bWVBbGwgKCkge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBjb25zdCBpblByb2dyZXNzVXBkYXRlZEZpbGVzID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5maWx0ZXIoKGZpbGUpID0+IHtcbiAgICAgIHJldHVybiAhdXBkYXRlZEZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZENvbXBsZXRlICYmXG4gICAgICAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdLnByb2dyZXNzLnVwbG9hZFN0YXJ0ZWRcbiAgICB9KVxuXG4gICAgaW5Qcm9ncmVzc1VwZGF0ZWRGaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlXSwge1xuICAgICAgICBpc1BhdXNlZDogZmFsc2UsXG4gICAgICAgIGVycm9yOiBudWxsXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgdGhpcy5lbWl0KCdyZXN1bWUtYWxsJylcbiAgfVxuXG4gIHJldHJ5QWxsICgpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuZmlsZXMpXG4gICAgY29uc3QgZmlsZXNUb1JldHJ5ID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5maWx0ZXIoZmlsZSA9PiB7XG4gICAgICByZXR1cm4gdXBkYXRlZEZpbGVzW2ZpbGVdLmVycm9yXG4gICAgfSlcblxuICAgIGZpbGVzVG9SZXRyeS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlXSwge1xuICAgICAgICBpc1BhdXNlZDogZmFsc2UsXG4gICAgICAgIGVycm9yOiBudWxsXG4gICAgICB9KVxuICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdID0gdXBkYXRlZEZpbGVcbiAgICB9KVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlcyxcbiAgICAgIGVycm9yOiBudWxsXG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgncmV0cnktYWxsJywgZmlsZXNUb1JldHJ5KVxuXG4gICAgY29uc3QgdXBsb2FkSUQgPSB0aGlzLl9jcmVhdGVVcGxvYWQoZmlsZXNUb1JldHJ5KVxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICBjYW5jZWxBbGwgKCkge1xuICAgIHRoaXMuZW1pdCgnY2FuY2VsLWFsbCcpXG4gICAgdGhpcy5zZXRTdGF0ZSh7IGZpbGVzOiB7fSwgdG90YWxQcm9ncmVzczogMCB9KVxuICB9XG5cbiAgcmV0cnlVcGxvYWQgKGZpbGVJRCkge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICBjb25zdCB1cGRhdGVkRmlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHVwZGF0ZWRGaWxlc1tmaWxlSURdLFxuICAgICAgeyBlcnJvcjogbnVsbCwgaXNQYXVzZWQ6IGZhbHNlIH1cbiAgICApXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB1cGRhdGVkRmlsZVxuICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlc1xuICAgIH0pXG5cbiAgICB0aGlzLmVtaXQoJ3VwbG9hZC1yZXRyeScsIGZpbGVJRClcblxuICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKFsgZmlsZUlEIF0pXG4gICAgcmV0dXJuIHRoaXMuX3J1blVwbG9hZCh1cGxvYWRJRClcbiAgfVxuXG4gIHJlc2V0ICgpIHtcbiAgICB0aGlzLmNhbmNlbEFsbCgpXG4gIH1cblxuICBfY2FsY3VsYXRlUHJvZ3Jlc3MgKGRhdGEpIHtcbiAgICBjb25zdCBmaWxlSUQgPSBkYXRhLmlkXG5cbiAgICAvLyBza2lwIHByb2dyZXNzIGV2ZW50IGZvciBhIGZpbGUgdGhhdOKAmXMgYmVlbiByZW1vdmVkXG4gICAgaWYgKCF0aGlzLmdldEZpbGUoZmlsZUlEKSkge1xuICAgICAgdGhpcy5sb2coJ1RyeWluZyB0byBzZXQgcHJvZ3Jlc3MgZm9yIGEgZmlsZSB0aGF04oCZcyBiZWVuIHJlbW92ZWQ6ICcsIGZpbGVJRClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGVJRCwge1xuICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLnByb2dyZXNzLCB7XG4gICAgICAgIGJ5dGVzVXBsb2FkZWQ6IGRhdGEuYnl0ZXNVcGxvYWRlZCxcbiAgICAgICAgYnl0ZXNUb3RhbDogZGF0YS5ieXRlc1RvdGFsLFxuICAgICAgICBwZXJjZW50YWdlOiBNYXRoLmZsb29yKChkYXRhLmJ5dGVzVXBsb2FkZWQgLyBkYXRhLmJ5dGVzVG90YWwgKiAxMDApLnRvRml4ZWQoMikpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgfVxuXG4gIF9jYWxjdWxhdGVUb3RhbFByb2dyZXNzICgpIHtcbiAgICAvLyBjYWxjdWxhdGUgdG90YWwgcHJvZ3Jlc3MsIHVzaW5nIHRoZSBudW1iZXIgb2YgZmlsZXMgY3VycmVudGx5IHVwbG9hZGluZyxcbiAgICAvLyBtdWx0aXBsaWVkIGJ5IDEwMCBhbmQgdGhlIHN1bW0gb2YgaW5kaXZpZHVhbCBwcm9ncmVzcyBvZiBlYWNoIGZpbGVcbiAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcblxuICAgIGNvbnN0IGluUHJvZ3Jlc3MgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gZmlsZXNbZmlsZV0ucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICAgIH0pXG4gICAgY29uc3QgcHJvZ3Jlc3NNYXggPSBpblByb2dyZXNzLmxlbmd0aCAqIDEwMFxuICAgIGxldCBwcm9ncmVzc0FsbCA9IDBcbiAgICBpblByb2dyZXNzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIHByb2dyZXNzQWxsID0gcHJvZ3Jlc3NBbGwgKyBmaWxlc1tmaWxlXS5wcm9ncmVzcy5wZXJjZW50YWdlXG4gICAgfSlcblxuICAgIGNvbnN0IHRvdGFsUHJvZ3Jlc3MgPSBwcm9ncmVzc01heCA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKChwcm9ncmVzc0FsbCAqIDEwMCAvIHByb2dyZXNzTWF4KS50b0ZpeGVkKDIpKVxuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICB0b3RhbFByb2dyZXNzOiB0b3RhbFByb2dyZXNzXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgbGlzdGVuZXJzIGZvciBhbGwgZ2xvYmFsIGFjdGlvbnMsIGxpa2U6XG4gICAqIGBlcnJvcmAsIGBmaWxlLXJlbW92ZWRgLCBgdXBsb2FkLXByb2dyZXNzYFxuICAgKlxuICAgKi9cbiAgYWN0aW9ucyAoKSB7XG4gICAgLy8gY29uc3QgbG9nID0gdGhpcy5sb2dcbiAgICAvLyB0aGlzLm9uKCcqJywgZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICAvLyAgIGxvZyhgW0NvcmVdIEV2ZW50OiAke3RoaXMuZXZlbnR9YClcbiAgICAvLyAgIGxvZyhwYXlsb2FkKVxuICAgIC8vIH0pXG5cbiAgICAvLyBzdHJlc3MtdGVzdCByZS1yZW5kZXJpbmdcbiAgICAvLyBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgLy8gICB0aGlzLnNldFN0YXRlKHtibGE6ICdibGEnfSlcbiAgICAvLyB9LCAyMClcblxuICAgIHRoaXMub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICB0aGlzLnNldFN0YXRlKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigndXBsb2FkLWVycm9yJywgKGZpbGVJRCwgZXJyb3IpID0+IHtcbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGVJRCwgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KVxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pXG5cbiAgICAgIGNvbnN0IGZpbGVOYW1lID0gdGhpcy5nZXRTdGF0ZSgpLmZpbGVzW2ZpbGVJRF0ubmFtZVxuICAgICAgbGV0IG1lc3NhZ2UgPSBgRmFpbGVkIHRvIHVwbG9hZCAke2ZpbGVOYW1lfWBcbiAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgbWVzc2FnZSA9IHsgbWVzc2FnZTogbWVzc2FnZSwgZGV0YWlsczogZXJyb3IubWVzc2FnZSB9XG4gICAgICB9XG4gICAgICB0aGlzLmluZm8obWVzc2FnZSwgJ2Vycm9yJywgNTAwMClcbiAgICB9KVxuXG4gICAgdGhpcy5vbigndXBsb2FkJywgKCkgPT4ge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGVycm9yOiBudWxsIH0pXG4gICAgfSlcblxuICAgIC8vIHRoaXMub24oJ2ZpbGUtYWRkJywgKGRhdGEpID0+IHtcbiAgICAvLyAgIHRoaXMuYWRkRmlsZShkYXRhKVxuICAgIC8vIH0pXG5cbiAgICB0aGlzLm9uKCdmaWxlLXJlbW92ZScsIChmaWxlSUQpID0+IHtcbiAgICAgIHRoaXMucmVtb3ZlRmlsZShmaWxlSUQpXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1zdGFydGVkJywgKGZpbGVJRCwgdXBsb2FkKSA9PiB7XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5nZXRGaWxlKGZpbGVJRClcbiAgICAgIHRoaXMuc2V0RmlsZVN0YXRlKGZpbGVJRCwge1xuICAgICAgICBwcm9ncmVzczogT2JqZWN0LmFzc2lnbih7fSwgZmlsZS5wcm9ncmVzcywge1xuICAgICAgICAgIHVwbG9hZFN0YXJ0ZWQ6IERhdGUubm93KCksXG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgIHBlcmNlbnRhZ2U6IDAsXG4gICAgICAgICAgYnl0ZXNVcGxvYWRlZDogMCxcbiAgICAgICAgICBieXRlc1RvdGFsOiBmaWxlLnNpemVcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIHVwbG9hZCBwcm9ncmVzcyBldmVudHMgY2FuIG9jY3VyIGZyZXF1ZW50bHksIGVzcGVjaWFsbHkgd2hlbiB5b3UgaGF2ZSBhIGdvb2RcbiAgICAvLyBjb25uZWN0aW9uIHRvIHRoZSByZW1vdGUgc2VydmVyLiBUaGVyZWZvcmUsIHdlIGFyZSB0aHJvdHRlbGluZyB0aGVtIHRvXG4gICAgLy8gcHJldmVudCBhY2Nlc3NpdmUgZnVuY3Rpb24gY2FsbHMuXG4gICAgLy8gc2VlIGFsc286IGh0dHBzOi8vZ2l0aHViLmNvbS90dXMvdHVzLWpzLWNsaWVudC9jb21taXQvOTk0MGYyN2IyMzYxZmQ3ZTEwYmE1OGIwOWI2MGQ4MjQyMjE4M2JiYlxuICAgIGNvbnN0IF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcyA9IHRocm90dGxlKHRoaXMuX2NhbGN1bGF0ZVByb2dyZXNzLCAxMDAsIHsgbGVhZGluZzogdHJ1ZSwgdHJhaWxpbmc6IHRydWUgfSlcblxuICAgIHRoaXMub24oJ3VwbG9hZC1wcm9ncmVzcycsIF90aHJvdHRsZWRDYWxjdWxhdGVQcm9ncmVzcylcblxuICAgIHRoaXMub24oJ3VwbG9hZC1zdWNjZXNzJywgKGZpbGVJRCwgdXBsb2FkUmVzcCwgdXBsb2FkVVJMKSA9PiB7XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlSUQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLnByb2dyZXNzLCB7XG4gICAgICAgICAgdXBsb2FkQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgcGVyY2VudGFnZTogMTAwXG4gICAgICAgIH0pLFxuICAgICAgICB1cGxvYWRVUkw6IHVwbG9hZFVSTCxcbiAgICAgICAgaXNQYXVzZWQ6IGZhbHNlXG4gICAgICB9KVxuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncHJlcHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlSUQsIHByb2dyZXNzKSA9PiB7XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlSUQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLnByb2dyZXNzLCB7XG4gICAgICAgICAgcHJlcHJvY2VzczogcHJvZ3Jlc3NcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHRoaXMub24oJ3ByZXByb2Nlc3MtY29tcGxldGUnLCAoZmlsZUlEKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlcylcbiAgICAgIGZpbGVzW2ZpbGVJRF0gPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlSURdLCB7XG4gICAgICAgIHByb2dyZXNzOiBPYmplY3QuYXNzaWduKHt9LCBmaWxlc1tmaWxlSURdLnByb2dyZXNzKVxuICAgICAgfSlcbiAgICAgIGRlbGV0ZSBmaWxlc1tmaWxlSURdLnByb2dyZXNzLnByZXByb2Nlc3NcblxuICAgICAgdGhpcy5zZXRTdGF0ZSh7IGZpbGVzOiBmaWxlcyB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdwb3N0cHJvY2Vzcy1wcm9ncmVzcycsIChmaWxlSUQsIHByb2dyZXNzKSA9PiB7XG4gICAgICB0aGlzLnNldEZpbGVTdGF0ZShmaWxlSUQsIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5maWxlc1tmaWxlSURdLnByb2dyZXNzLCB7XG4gICAgICAgICAgcG9zdHByb2Nlc3M6IHByb2dyZXNzXG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLm9uKCdwb3N0cHJvY2Vzcy1jb21wbGV0ZScsIChmaWxlSUQpID0+IHtcbiAgICAgIGNvbnN0IGZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5nZXRTdGF0ZSgpLmZpbGVzKVxuICAgICAgZmlsZXNbZmlsZUlEXSA9IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGVJRF0sIHtcbiAgICAgICAgcHJvZ3Jlc3M6IE9iamVjdC5hc3NpZ24oe30sIGZpbGVzW2ZpbGVJRF0ucHJvZ3Jlc3MpXG4gICAgICB9KVxuICAgICAgZGVsZXRlIGZpbGVzW2ZpbGVJRF0ucHJvZ3Jlc3MucG9zdHByb2Nlc3NcbiAgICAgIC8vIFRPRE8gc2hvdWxkIHdlIHNldCBzb21lIGtpbmQgb2YgYGZ1bGx5Q29tcGxldGVgIHByb3BlcnR5IG9uIHRoZSBmaWxlIG9iamVjdFxuICAgICAgLy8gc28gaXQncyBlYXNpZXIgdG8gc2VlIHRoYXQgdGhlIGZpbGUgaXMgdXBsb2Fk4oCmZnVsbHkgY29tcGxldGXigKZyYXRoZXIgdGhhblxuICAgICAgLy8gd2hhdCB3ZSBoYXZlIHRvIGRvIG5vdyAoYHVwbG9hZENvbXBsZXRlICYmICFwb3N0cHJvY2Vzc2ApXG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoeyBmaWxlczogZmlsZXMgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5vbigncmVzdG9yZWQnLCAoKSA9PiB7XG4gICAgICAvLyBGaWxlcyBtYXkgaGF2ZSBjaGFuZ2VkLS1lbnN1cmUgcHJvZ3Jlc3MgaXMgc3RpbGwgYWNjdXJhdGUuXG4gICAgICB0aGlzLl9jYWxjdWxhdGVUb3RhbFByb2dyZXNzKClcbiAgICB9KVxuXG4gICAgLy8gc2hvdyBpbmZvcm1lciBpZiBvZmZsaW5lXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb25saW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvZmZsaW5lJywgKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSlcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy51cGRhdGVPbmxpbmVTdGF0dXMoKSwgMzAwMClcbiAgICB9XG4gIH1cblxuICB1cGRhdGVPbmxpbmVTdGF0dXMgKCkge1xuICAgIGNvbnN0IG9ubGluZSA9XG4gICAgICB0eXBlb2Ygd2luZG93Lm5hdmlnYXRvci5vbkxpbmUgIT09ICd1bmRlZmluZWQnXG4gICAgICAgID8gd2luZG93Lm5hdmlnYXRvci5vbkxpbmVcbiAgICAgICAgOiB0cnVlXG4gICAgaWYgKCFvbmxpbmUpIHtcbiAgICAgIHRoaXMuZW1pdCgnaXMtb2ZmbGluZScpXG4gICAgICB0aGlzLmluZm8oJ05vIGludGVybmV0IGNvbm5lY3Rpb24nLCAnZXJyb3InLCAwKVxuICAgICAgdGhpcy53YXNPZmZsaW5lID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVtaXQoJ2lzLW9ubGluZScpXG4gICAgICBpZiAodGhpcy53YXNPZmZsaW5lKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnYmFjay1vbmxpbmUnKVxuICAgICAgICB0aGlzLmluZm8oJ0Nvbm5lY3RlZCEnLCAnc3VjY2VzcycsIDMwMDApXG4gICAgICAgIHRoaXMud2FzT2ZmbGluZSA9IGZhbHNlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0SUQgKCkge1xuICAgIHJldHVybiB0aGlzLm9wdHMuaWRcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBwbHVnaW4gd2l0aCBDb3JlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NsYXNzfSBQbHVnaW4gb2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIFBsdWdpbiBsYXRlclxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHNlbGYgZm9yIGNoYWluaW5nXG4gICAqL1xuICB1c2UgKFBsdWdpbiwgb3B0cykge1xuICAgIGlmICh0eXBlb2YgUGx1Z2luICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBsZXQgbXNnID0gYEV4cGVjdGVkIGEgcGx1Z2luIGNsYXNzLCBidXQgZ290ICR7UGx1Z2luID09PSBudWxsID8gJ251bGwnIDogdHlwZW9mIFBsdWdpbn0uYCArXG4gICAgICAgICcgUGxlYXNlIHZlcmlmeSB0aGF0IHRoZSBwbHVnaW4gd2FzIGltcG9ydGVkIGFuZCBzcGVsbGVkIGNvcnJlY3RseS4nXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1zZylcbiAgICB9XG5cbiAgICAvLyBJbnN0YW50aWF0ZVxuICAgIGNvbnN0IHBsdWdpbiA9IG5ldyBQbHVnaW4odGhpcywgb3B0cylcbiAgICBjb25zdCBwbHVnaW5JZCA9IHBsdWdpbi5pZFxuICAgIHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gPSB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdIHx8IFtdXG5cbiAgICBpZiAoIXBsdWdpbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdXIgcGx1Z2luIG11c3QgaGF2ZSBhbiBpZCcpXG4gICAgfVxuXG4gICAgaWYgKCFwbHVnaW4udHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIHBsdWdpbiBtdXN0IGhhdmUgYSB0eXBlJylcbiAgICB9XG5cbiAgICBsZXQgZXhpc3RzUGx1Z2luQWxyZWFkeSA9IHRoaXMuZ2V0UGx1Z2luKHBsdWdpbklkKVxuICAgIGlmIChleGlzdHNQbHVnaW5BbHJlYWR5KSB7XG4gICAgICBsZXQgbXNnID0gYEFscmVhZHkgZm91bmQgYSBwbHVnaW4gbmFtZWQgJyR7ZXhpc3RzUGx1Z2luQWxyZWFkeS5pZH0nLlxuICAgICAgICBUcmllZCB0byB1c2U6ICcke3BsdWdpbklkfScuXG4gICAgICAgIFVwcHkgaXMgY3VycmVudGx5IGxpbWl0ZWQgdG8gcnVubmluZyBvbmUgb2YgZXZlcnkgcGx1Z2luLlxuICAgICAgICBTaGFyZSB5b3VyIHVzZSBjYXNlIHdpdGggdXMgb3ZlciBhdFxuICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vdHJhbnNsb2FkaXQvdXBweS9pc3N1ZXMvXG4gICAgICAgIGlmIHlvdSB3YW50IHVzIHRvIHJlY29uc2lkZXIuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuICAgIHBsdWdpbi5pbnN0YWxsKClcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogRmluZCBvbmUgUGx1Z2luIGJ5IG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSBzdHJpbmcgbmFtZSBkZXNjcmlwdGlvblxuICAgKi9cbiAgZ2V0UGx1Z2luIChuYW1lKSB7XG4gICAgbGV0IGZvdW5kUGx1Z2luID0gZmFsc2VcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICAgIGlmIChwbHVnaW5OYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGZvdW5kUGx1Z2luID0gcGx1Z2luXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvdW5kUGx1Z2luXG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSB0aHJvdWdoIGFsbCBgdXNlYGQgcGx1Z2lucy5cbiAgICpcbiAgICogQHBhcmFtIGZ1bmN0aW9uIG1ldGhvZCBkZXNjcmlwdGlvblxuICAgKi9cbiAgaXRlcmF0ZVBsdWdpbnMgKG1ldGhvZCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaChwbHVnaW5UeXBlID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKG1ldGhvZClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVuaW5zdGFsbCBhbmQgcmVtb3ZlIGEgcGx1Z2luLlxuICAgKlxuICAgKiBAcGFyYW0ge1BsdWdpbn0gaW5zdGFuY2UgVGhlIHBsdWdpbiBpbnN0YW5jZSB0byByZW1vdmUuXG4gICAqL1xuICByZW1vdmVQbHVnaW4gKGluc3RhbmNlKSB7XG4gICAgY29uc3QgbGlzdCA9IHRoaXMucGx1Z2luc1tpbnN0YW5jZS50eXBlXVxuXG4gICAgaWYgKGluc3RhbmNlLnVuaW5zdGFsbCkge1xuICAgICAgaW5zdGFuY2UudW5pbnN0YWxsKClcbiAgICB9XG5cbiAgICBjb25zdCBpbmRleCA9IGxpc3QuaW5kZXhPZihpbnN0YW5jZSlcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW5pbnN0YWxsIGFsbCBwbHVnaW5zIGFuZCBjbG9zZSBkb3duIHRoaXMgVXBweSBpbnN0YW5jZS5cbiAgICovXG4gIGNsb3NlICgpIHtcbiAgICB0aGlzLnJlc2V0KClcblxuICAgIHRoaXMuX3N0b3JlVW5zdWJzY3JpYmUoKVxuXG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucygocGx1Z2luKSA9PiB7XG4gICAgICBwbHVnaW4udW5pbnN0YWxsKClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICogU2V0IGluZm8gbWVzc2FnZSBpbiBgc3RhdGUuaW5mb2AsIHNvIHRoYXQgVUkgcGx1Z2lucyBsaWtlIGBJbmZvcm1lcmBcbiAgKiBjYW4gZGlzcGxheSB0aGUgbWVzc2FnZS5cbiAgKlxuICAqIEBwYXJhbSB7c3RyaW5nfSBtc2cgTWVzc2FnZSB0byBiZSBkaXNwbGF5ZWQgYnkgdGhlIGluZm9ybWVyXG4gICovXG5cbiAgaW5mbyAobWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgY29uc3QgaXNDb21wbGV4TWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0J1xuXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiB7XG4gICAgICAgIGlzSGlkZGVuOiBmYWxzZSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgbWVzc2FnZTogaXNDb21wbGV4TWVzc2FnZSA/IG1lc3NhZ2UubWVzc2FnZSA6IG1lc3NhZ2UsXG4gICAgICAgIGRldGFpbHM6IGlzQ29tcGxleE1lc3NhZ2UgPyBtZXNzYWdlLmRldGFpbHMgOiBudWxsXG4gICAgICB9XG4gICAgfSlcblxuICAgIHRoaXMuZW1pdCgnaW5mby12aXNpYmxlJylcblxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5pbmZvVGltZW91dElEKVxuICAgIGlmIChkdXJhdGlvbiA9PT0gMCkge1xuICAgICAgdGhpcy5pbmZvVGltZW91dElEID0gdW5kZWZpbmVkXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBoaWRlIHRoZSBpbmZvcm1lciBhZnRlciBgZHVyYXRpb25gIG1pbGxpc2Vjb25kc1xuICAgIHRoaXMuaW5mb1RpbWVvdXRJRCA9IHNldFRpbWVvdXQodGhpcy5oaWRlSW5mbywgZHVyYXRpb24pXG4gIH1cblxuICBoaWRlSW5mbyAoKSB7XG4gICAgY29uc3QgbmV3SW5mbyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5pbmZvLCB7XG4gICAgICBpc0hpZGRlbjogdHJ1ZVxuICAgIH0pXG4gICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICBpbmZvOiBuZXdJbmZvXG4gICAgfSlcbiAgICB0aGlzLmVtaXQoJ2luZm8taGlkZGVuJylcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIHN0dWZmIHRvIGNvbnNvbGUsIG9ubHkgaWYgYGRlYnVnYCBpcyBzZXQgdG8gdHJ1ZS4gU2lsZW50IGluIHByb2R1Y3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbXNnIHRvIGxvZ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBvcHRpb25hbCBgZXJyb3JgIG9yIGB3YXJuaW5nYFxuICAgKi9cbiAgbG9nIChtc2csIHR5cGUpIHtcbiAgICBpZiAoIXRoaXMub3B0cy5kZWJ1Zykge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgbGV0IG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV0gJHttc2d9YFxuXG4gICAgZ2xvYmFsLnVwcHlMb2cgPSBnbG9iYWwudXBweUxvZyArICdcXG4nICsgJ0RFQlVHIExPRzogJyArIG1zZ1xuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAnd2FybmluZycpIHtcbiAgICAgIGNvbnNvbGUud2FybihtZXNzYWdlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKG1zZyA9PT0gYCR7bXNnfWApIHtcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1lc3NhZ2UgPSBgW1VwcHldIFske1V0aWxzLmdldFRpbWVTdGFtcCgpfV1gXG4gICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICAgICAgY29uc29sZS5kaXIobXNnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBhY3Rpb25zLlxuICAgKlxuICAgKi9cbiAgcnVuICgpIHtcbiAgICB0aGlzLmxvZygnQ29yZSBpcyBydW4sIGluaXRpYWxpemluZyBhY3Rpb25zLi4uJylcbiAgICB0aGlzLmFjdGlvbnMoKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXN0b3JlIGFuIHVwbG9hZCBieSBpdHMgSUQuXG4gICAqL1xuICByZXN0b3JlICh1cGxvYWRJRCkge1xuICAgIHRoaXMubG9nKGBDb3JlOiBhdHRlbXB0aW5nIHRvIHJlc3RvcmUgdXBsb2FkIFwiJHt1cGxvYWRJRH1cImApXG5cbiAgICBpZiAoIXRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0pIHtcbiAgICAgIHRoaXMuX3JlbW92ZVVwbG9hZCh1cGxvYWRJRClcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ05vbmV4aXN0ZW50IHVwbG9hZCcpKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9ydW5VcGxvYWQodXBsb2FkSUQpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIHVwbG9hZCBmb3IgYSBidW5jaCBvZiBmaWxlcy5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBmaWxlSURzIEZpbGUgSURzIHRvIGluY2x1ZGUgaW4gdGhpcyB1cGxvYWQuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gSUQgb2YgdGhpcyB1cGxvYWQuXG4gICAqL1xuICBfY3JlYXRlVXBsb2FkIChmaWxlSURzKSB7XG4gICAgY29uc3QgdXBsb2FkSUQgPSBjdWlkKClcblxuICAgIHRoaXMuZW1pdCgndXBsb2FkJywge1xuICAgICAgaWQ6IHVwbG9hZElELFxuICAgICAgZmlsZUlEczogZmlsZUlEc1xuICAgIH0pXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHMsIHtcbiAgICAgICAgW3VwbG9hZElEXToge1xuICAgICAgICAgIGZpbGVJRHM6IGZpbGVJRHMsXG4gICAgICAgICAgc3RlcDogMCxcbiAgICAgICAgICByZXN1bHQ6IHt9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB1cGxvYWRJRFxuICB9XG5cbiAgX2dldFVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZSgpLmN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBkYXRhIHRvIGFuIHVwbG9hZCdzIHJlc3VsdCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJRCBUaGUgSUQgb2YgdGhlIHVwbG9hZC5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgRGF0YSBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgcmVzdWx0IG9iamVjdC5cbiAgICovXG4gIGFkZFJlc3VsdERhdGEgKHVwbG9hZElELCBkYXRhKSB7XG4gICAgY29uc3QgY3VycmVudFVwbG9hZHMgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkID0gT2JqZWN0LmFzc2lnbih7fSwgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdLCB7XG4gICAgICByZXN1bHQ6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXS5yZXN1bHQsIGRhdGEpXG4gICAgfSlcbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50VXBsb2Fkcywge1xuICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFuIHVwbG9hZCwgZWcuIGlmIGl0IGhhcyBiZWVuIGNhbmNlbGVkIG9yIGNvbXBsZXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVwbG9hZElEIFRoZSBJRCBvZiB0aGUgdXBsb2FkLlxuICAgKi9cbiAgX3JlbW92ZVVwbG9hZCAodXBsb2FkSUQpIHtcbiAgICBjb25zdCBjdXJyZW50VXBsb2FkcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZ2V0U3RhdGUoKS5jdXJyZW50VXBsb2FkcylcbiAgICBkZWxldGUgY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG5cbiAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgIGN1cnJlbnRVcGxvYWRzOiBjdXJyZW50VXBsb2Fkc1xuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUnVuIGFuIHVwbG9hZC4gVGhpcyBwaWNrcyB1cCB3aGVyZSBpdCBsZWZ0IG9mZiBpbiBjYXNlIHRoZSB1cGxvYWQgaXMgYmVpbmcgcmVzdG9yZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcnVuVXBsb2FkICh1cGxvYWRJRCkge1xuICAgIGNvbnN0IHVwbG9hZERhdGEgPSB0aGlzLmdldFN0YXRlKCkuY3VycmVudFVwbG9hZHNbdXBsb2FkSURdXG4gICAgY29uc3QgZmlsZUlEcyA9IHVwbG9hZERhdGEuZmlsZUlEc1xuICAgIGNvbnN0IHJlc3RvcmVTdGVwID0gdXBsb2FkRGF0YS5zdGVwXG5cbiAgICBjb25zdCBzdGVwcyA9IFtcbiAgICAgIC4uLnRoaXMucHJlUHJvY2Vzc29ycyxcbiAgICAgIC4uLnRoaXMudXBsb2FkZXJzLFxuICAgICAgLi4udGhpcy5wb3N0UHJvY2Vzc29yc1xuICAgIF1cbiAgICBsZXQgbGFzdFN0ZXAgPSBQcm9taXNlLnJlc29sdmUoKVxuICAgIHN0ZXBzLmZvckVhY2goKGZuLCBzdGVwKSA9PiB7XG4gICAgICAvLyBTa2lwIHRoaXMgc3RlcCBpZiB3ZSBhcmUgcmVzdG9yaW5nIGFuZCBoYXZlIGFscmVhZHkgY29tcGxldGVkIHRoaXMgc3RlcCBiZWZvcmUuXG4gICAgICBpZiAoc3RlcCA8IHJlc3RvcmVTdGVwKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsYXN0U3RlcCA9IGxhc3RTdGVwLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRVcGxvYWRzIH0gPSB0aGlzLmdldFN0YXRlKClcbiAgICAgICAgY29uc3QgY3VycmVudFVwbG9hZCA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzW3VwbG9hZElEXSwge1xuICAgICAgICAgIHN0ZXA6IHN0ZXBcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgY3VycmVudFVwbG9hZHM6IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRVcGxvYWRzLCB7XG4gICAgICAgICAgICBbdXBsb2FkSURdOiBjdXJyZW50VXBsb2FkXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICAgLy8gVE9ETyBnaXZlIHRoaXMgdGhlIGBjdXJyZW50VXBsb2FkYCBvYmplY3QgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIG1heWJlP1xuICAgICAgICAvLyBPdGhlcndpc2Ugd2hlbiBtb3JlIG1ldGFkYXRhIG1heSBiZSBhZGRlZCB0byB0aGUgdXBsb2FkIHRoaXMgd291bGQga2VlcCBnZXR0aW5nIG1vcmUgcGFyYW1ldGVyc1xuICAgICAgICByZXR1cm4gZm4oZmlsZUlEcywgdXBsb2FkSUQpXG4gICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIC8vIE5vdCByZXR1cm5pbmcgdGhlIGBjYXRjaGBlZCBwcm9taXNlLCBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gcmV0dXJuIGEgcmVqZWN0ZWRcbiAgICAvLyBwcm9taXNlIGZyb20gdGhpcyBtZXRob2QgaWYgdGhlIHVwbG9hZCBmYWlsZWQuXG4gICAgbGFzdFN0ZXAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycilcblxuICAgICAgdGhpcy5fcmVtb3ZlVXBsb2FkKHVwbG9hZElEKVxuICAgIH0pXG5cbiAgICByZXR1cm4gbGFzdFN0ZXAudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlcyA9IGZpbGVJRHMubWFwKChmaWxlSUQpID0+IHRoaXMuZ2V0RmlsZShmaWxlSUQpKVxuICAgICAgY29uc3Qgc3VjY2Vzc2Z1bCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiAhZmlsZS5lcnJvcilcbiAgICAgIGNvbnN0IGZhaWxlZCA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAmJiBmaWxlLmVycm9yKVxuICAgICAgdGhpcy5hZGRSZXN1bHREYXRhKHVwbG9hZElELCB7IHN1Y2Nlc3NmdWwsIGZhaWxlZCwgdXBsb2FkSUQgfSlcblxuICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICBjb25zdCByZXN1bHQgPSBjdXJyZW50VXBsb2Fkc1t1cGxvYWRJRF0ucmVzdWx0XG4gICAgICB0aGlzLmVtaXQoJ2NvbXBsZXRlJywgcmVzdWx0KVxuICAgICAgLy8gQ29tcGF0aWJpbGl0eSB3aXRoIHByZS0wLjIxXG4gICAgICB0aGlzLmVtaXQoJ3N1Y2Nlc3MnLCBmaWxlSURzKVxuXG4gICAgICB0aGlzLl9yZW1vdmVVcGxvYWQodXBsb2FkSUQpXG5cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9KVxuICB9XG5cbiAgICAvKipcbiAgICogU3RhcnQgYW4gdXBsb2FkIGZvciBhbGwgdGhlIGZpbGVzIHRoYXQgYXJlIG5vdCBjdXJyZW50bHkgYmVpbmcgdXBsb2FkZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICB1cGxvYWQgKCkge1xuICAgIGlmICghdGhpcy5wbHVnaW5zLnVwbG9hZGVyKSB7XG4gICAgICB0aGlzLmxvZygnTm8gdXBsb2FkZXIgdHlwZSBwbHVnaW5zIGFyZSB1c2VkJywgJ3dhcm5pbmcnKVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLm9uQmVmb3JlVXBsb2FkKHRoaXMuZ2V0U3RhdGUoKS5maWxlcykpXG4gICAgICAudGhlbigoKSA9PiB0aGlzLl9jaGVja01pbk51bWJlck9mRmlsZXMoKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50VXBsb2FkcyB9ID0gdGhpcy5nZXRTdGF0ZSgpXG4gICAgICAgIC8vIGdldCBhIGxpc3Qgb2YgZmlsZXMgdGhhdCBhcmUgY3VycmVudGx5IGFzc2lnbmVkIHRvIHVwbG9hZHNcbiAgICAgICAgY29uc3QgY3VycmVudGx5VXBsb2FkaW5nRmlsZXMgPSBPYmplY3Qua2V5cyhjdXJyZW50VXBsb2FkcykucmVkdWNlKChwcmV2LCBjdXJyKSA9PiBwcmV2LmNvbmNhdChjdXJyZW50VXBsb2Fkc1tjdXJyXS5maWxlSURzKSwgW10pXG5cbiAgICAgICAgY29uc3Qgd2FpdGluZ0ZpbGVJRHMgPSBbXVxuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLmdldFN0YXRlKCkuZmlsZXMpLmZvckVhY2goKGZpbGVJRCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmdldEZpbGUoZmlsZUlEKVxuICAgICAgICAgIC8vIGlmIHRoZSBmaWxlIGhhc24ndCBzdGFydGVkIHVwbG9hZGluZyBhbmQgaGFzbid0IGFscmVhZHkgYmVlbiBhc3NpZ25lZCB0byBhbiB1cGxvYWQuLlxuICAgICAgICAgIGlmICgoIWZpbGUucHJvZ3Jlc3MudXBsb2FkU3RhcnRlZCkgJiYgKGN1cnJlbnRseVVwbG9hZGluZ0ZpbGVzLmluZGV4T2YoZmlsZUlEKSA9PT0gLTEpKSB7XG4gICAgICAgICAgICB3YWl0aW5nRmlsZUlEcy5wdXNoKGZpbGUuaWQpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElEID0gdGhpcy5fY3JlYXRlVXBsb2FkKHdhaXRpbmdGaWxlSURzKVxuICAgICAgICByZXR1cm4gdGhpcy5fcnVuVXBsb2FkKHVwbG9hZElEKVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB0eXBlb2YgZXJyID09PSAnb2JqZWN0JyA/IGVyci5tZXNzYWdlIDogZXJyXG4gICAgICAgIHRoaXMubG9nKG1lc3NhZ2UpXG4gICAgICAgIHRoaXMuaW5mbyhtZXNzYWdlLCAnZXJyb3InLCA0MDAwKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QodHlwZW9mIGVyciA9PT0gJ29iamVjdCcgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKSlcbiAgICAgIH0pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IFVwcHkob3B0cylcbn1cbi8vIEV4cG9zZSBjbGFzcyBjb25zdHJ1Y3Rvci5cbm1vZHVsZS5leHBvcnRzLlVwcHkgPSBVcHB5XG4iLCJjb25zdCBwcmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKVxuY29uc3QgeyBmaW5kRE9NRWxlbWVudCB9ID0gcmVxdWlyZSgnLi4vY29yZS9VdGlscycpXG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHRoaXMudXBweSA9IHVwcHlcbiAgICB0aGlzLm9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5pbnN0YWxsID0gdGhpcy5pbnN0YWxsLmJpbmQodGhpcylcbiAgICB0aGlzLnVuaW5zdGFsbCA9IHRoaXMudW5pbnN0YWxsLmJpbmQodGhpcylcbiAgfVxuXG4gIGdldFBsdWdpblN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy51cHB5LnN0YXRlLnBsdWdpbnNbdGhpcy5pZF1cbiAgfVxuXG4gIHNldFBsdWdpblN0YXRlICh1cGRhdGUpIHtcbiAgICBjb25zdCBwbHVnaW5zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy51cHB5LnN0YXRlLnBsdWdpbnMpXG4gICAgcGx1Z2luc1t0aGlzLmlkXSA9IE9iamVjdC5hc3NpZ24oe30sIHBsdWdpbnNbdGhpcy5pZF0sIHVwZGF0ZSlcblxuICAgIHRoaXMudXBweS5zZXRTdGF0ZSh7XG4gICAgICBwbHVnaW5zOiBwbHVnaW5zXG4gICAgfSlcbiAgfVxuXG4gIHVwZGF0ZSAoc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuZWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAodGhpcy51cGRhdGVVSSkge1xuICAgICAgdGhpcy51cGRhdGVVSShzdGF0ZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgc3VwcGxpZWQgYHRhcmdldGAgaXMgYSBET00gZWxlbWVudCBvciBhbiBgb2JqZWN0YC5cbiAgICogSWYgaXTigJlzIGFuIG9iamVjdCDigJQgdGFyZ2V0IGlzIGEgcGx1Z2luLCBhbmQgd2Ugc2VhcmNoIGBwbHVnaW5zYFxuICAgKiBmb3IgYSBwbHVnaW4gd2l0aCBzYW1lIG5hbWUgYW5kIHJldHVybiBpdHMgdGFyZ2V0LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHRhcmdldFxuICAgKlxuICAgKi9cbiAgbW91bnQgKHRhcmdldCwgcGx1Z2luKSB7XG4gICAgY29uc3QgY2FsbGVyUGx1Z2luTmFtZSA9IHBsdWdpbi5pZFxuXG4gICAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGZpbmRET01FbGVtZW50KHRhcmdldClcblxuICAgIGlmICh0YXJnZXRFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZVVJID0gKHN0YXRlKSA9PiB7XG4gICAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHN0YXRlKSwgdGFyZ2V0RWxlbWVudCwgdGhpcy5lbClcbiAgICAgIH1cblxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvIGEgRE9NIGVsZW1lbnRgKVxuXG4gICAgICAvLyBjbGVhciBldmVyeXRoaW5nIGluc2lkZSB0aGUgdGFyZ2V0IGNvbnRhaW5lclxuICAgICAgaWYgKHRoaXMub3B0cy5yZXBsYWNlVGFyZ2V0Q29udGVudCkge1xuICAgICAgICB0YXJnZXRFbGVtZW50LmlubmVySFRNTCA9ICcnXG4gICAgICB9XG5cbiAgICAgIHRoaXMuZWwgPSBwcmVhY3QucmVuZGVyKHRoaXMucmVuZGVyKHRoaXMudXBweS5zdGF0ZSksIHRhcmdldEVsZW1lbnQpXG5cbiAgICAgIHJldHVybiB0aGlzLmVsXG4gICAgfVxuXG4gICAgbGV0IHRhcmdldFBsdWdpblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnb2JqZWN0JyAmJiB0YXJnZXQgaW5zdGFuY2VvZiBQbHVnaW4pIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiAqaW5zdGFuY2UqXG4gICAgICB0YXJnZXRQbHVnaW4gPSB0YXJnZXRcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIFRhcmdldGluZyBhIHBsdWdpbiB0eXBlXG4gICAgICBjb25zdCBUYXJnZXQgPSB0YXJnZXRcbiAgICAgIC8vIEZpbmQgdGhlIHRhcmdldCBwbHVnaW4gaW5zdGFuY2UuXG4gICAgICB0aGlzLnVwcHkuaXRlcmF0ZVBsdWdpbnMoKHBsdWdpbikgPT4ge1xuICAgICAgICBpZiAocGx1Z2luIGluc3RhbmNlb2YgVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0UGx1Z2luID0gcGx1Z2luXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRhcmdldFBsdWdpbikge1xuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luTmFtZSA9IHRhcmdldFBsdWdpbi5pZFxuICAgICAgdGhpcy51cHB5LmxvZyhgSW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9IHRvICR7dGFyZ2V0UGx1Z2luTmFtZX1gKVxuICAgICAgdGhpcy5lbCA9IHRhcmdldFBsdWdpbi5hZGRUYXJnZXQocGx1Z2luKVxuICAgICAgcmV0dXJuIHRoaXMuZWxcbiAgICB9XG5cbiAgICB0aGlzLnVwcHkubG9nKGBOb3QgaW5zdGFsbGluZyAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdGFyZ2V0IG9wdGlvbiBnaXZlbiB0byAke2NhbGxlclBsdWdpbk5hbWV9YClcbiAgfVxuXG4gIHJlbmRlciAoc3RhdGUpIHtcbiAgICB0aHJvdyAobmV3IEVycm9yKCdFeHRlbmQgdGhlIHJlbmRlciBtZXRob2QgdG8gYWRkIHlvdXIgcGx1Z2luIHRvIGEgRE9NIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGFkZFRhcmdldCAocGx1Z2luKSB7XG4gICAgdGhyb3cgKG5ldyBFcnJvcignRXh0ZW5kIHRoZSBhZGRUYXJnZXQgbWV0aG9kIHRvIGFkZCB5b3VyIHBsdWdpbiB0byBhbm90aGVyIHBsdWdpblxcJ3MgdGFyZ2V0JykpXG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAodGhpcy5lbCAmJiB0aGlzLmVsLnBhcmVudE5vZGUpIHtcbiAgICAgIHRoaXMuZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsKVxuICAgIH1cbiAgICAvLyB0aGlzLnRhcmdldCA9IG51bGxcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuXG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsIi8qKlxuICogVHJhbnNsYXRlcyBzdHJpbmdzIHdpdGggaW50ZXJwb2xhdGlvbiAmIHBsdXJhbGl6YXRpb24gc3VwcG9ydC5cbiAqIEV4dGVuc2libGUgd2l0aCBjdXN0b20gZGljdGlvbmFyaWVzIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFuc2xhdG9yIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIGxvY2FsZToge1xuICAgICAgICBzdHJpbmdzOiB7fSxcbiAgICAgICAgcGx1cmFsaXplOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgIGlmIChuID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gMVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucy5sb2NhbGUsIG9wdHMubG9jYWxlKVxuXG4gICAgLy8gY29uc29sZS5sb2codGhpcy5vcHRzLmxvY2FsZSlcblxuICAgIC8vIHRoaXMubG9jYWxlLnBsdXJhbGl6ZSA9IHRoaXMubG9jYWxlID8gdGhpcy5sb2NhbGUucGx1cmFsaXplIDogZGVmYXVsdFBsdXJhbGl6ZVxuICAgIC8vIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBlbl9VUy5zdHJpbmdzLCB0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3MpXG4gIH1cblxuLyoqXG4gKiBUYWtlcyBhIHN0cmluZyB3aXRoIHBsYWNlaG9sZGVyIHZhcmlhYmxlcyBsaWtlIGAle3NtYXJ0X2NvdW50fSBmaWxlIHNlbGVjdGVkYFxuICogYW5kIHJlcGxhY2VzIGl0IHdpdGggdmFsdWVzIGZyb20gb3B0aW9ucyBge3NtYXJ0X2NvdW50OiA1fWBcbiAqXG4gKiBAbGljZW5zZSBodHRwczovL2dpdGh1Yi5jb20vYWlyYm5iL3BvbHlnbG90LmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcy9ibG9iL21hc3Rlci9saWIvcG9seWdsb3QuanMjTDI5OVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwaHJhc2UgdGhhdCBuZWVkcyBpbnRlcnBvbGF0aW9uLCB3aXRoIHBsYWNlaG9sZGVyc1xuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgd2l0aCB2YWx1ZXMgdGhhdCB3aWxsIGJlIHVzZWQgdG8gcmVwbGFjZSBwbGFjZWhvbGRlcnNcbiAqIEByZXR1cm4ge3N0cmluZ30gaW50ZXJwb2xhdGVkXG4gKi9cbiAgaW50ZXJwb2xhdGUgKHBocmFzZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHJlcGxhY2UgPSBTdHJpbmcucHJvdG90eXBlLnJlcGxhY2VcbiAgICBjb25zdCBkb2xsYXJSZWdleCA9IC9cXCQvZ1xuICAgIGNvbnN0IGRvbGxhckJpbGxzWWFsbCA9ICckJCQkJ1xuXG4gICAgZm9yIChsZXQgYXJnIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChhcmcgIT09ICdfJyAmJiBvcHRpb25zLmhhc093blByb3BlcnR5KGFyZykpIHtcbiAgICAgICAgLy8gRW5zdXJlIHJlcGxhY2VtZW50IHZhbHVlIGlzIGVzY2FwZWQgdG8gcHJldmVudCBzcGVjaWFsICQtcHJlZml4ZWRcbiAgICAgICAgLy8gcmVnZXggcmVwbGFjZSB0b2tlbnMuIHRoZSBcIiQkJCRcIiBpcyBuZWVkZWQgYmVjYXVzZSBlYWNoIFwiJFwiIG5lZWRzIHRvXG4gICAgICAgIC8vIGJlIGVzY2FwZWQgd2l0aCBcIiRcIiBpdHNlbGYsIGFuZCB3ZSBuZWVkIHR3byBpbiB0aGUgcmVzdWx0aW5nIG91dHB1dC5cbiAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gb3B0aW9uc1thcmddXG4gICAgICAgIGlmICh0eXBlb2YgcmVwbGFjZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmVwbGFjZW1lbnQgPSByZXBsYWNlLmNhbGwob3B0aW9uc1thcmddLCBkb2xsYXJSZWdleCwgZG9sbGFyQmlsbHNZYWxsKVxuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGNyZWF0ZSBhIG5ldyBgUmVnRXhwYCBlYWNoIHRpbWUgaW5zdGVhZCBvZiB1c2luZyBhIG1vcmUtZWZmaWNpZW50XG4gICAgICAgIC8vIHN0cmluZyByZXBsYWNlIHNvIHRoYXQgdGhlIHNhbWUgYXJndW1lbnQgY2FuIGJlIHJlcGxhY2VkIG11bHRpcGxlIHRpbWVzXG4gICAgICAgIC8vIGluIHRoZSBzYW1lIHBocmFzZS5cbiAgICAgICAgcGhyYXNlID0gcmVwbGFjZS5jYWxsKHBocmFzZSwgbmV3IFJlZ0V4cCgnJVxcXFx7JyArIGFyZyArICdcXFxcfScsICdnJyksIHJlcGxhY2VtZW50KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGhyYXNlXG4gIH1cblxuLyoqXG4gKiBQdWJsaWMgdHJhbnNsYXRlIG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIGxhdGVyIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzIGluIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSB0cmFuc2xhdGVkIChhbmQgaW50ZXJwb2xhdGVkKVxuICovXG4gIHRyYW5zbGF0ZSAoa2V5LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5zbWFydF9jb3VudCkge1xuICAgICAgdmFyIHBsdXJhbCA9IHRoaXMubG9jYWxlLnBsdXJhbGl6ZShvcHRpb25zLnNtYXJ0X2NvdW50KVxuICAgICAgcmV0dXJuIHRoaXMuaW50ZXJwb2xhdGUodGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzW2tleV1bcGx1cmFsXSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnRlcnBvbGF0ZSh0aGlzLm9wdHMubG9jYWxlLnN0cmluZ3Nba2V5XSwgb3B0aW9ucylcbiAgfVxufVxuIiwiY29uc3QgZWUgPSByZXF1aXJlKCduYW1lc3BhY2UtZW1pdHRlcicpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVXBweVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSBbXVxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQob3B0cy50YXJnZXQpXG4gICAgdGhpcy5lbWl0dGVyID0gZWUoKVxuXG4gICAgdGhpcy5zb2NrZXQub25vcGVuID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZVxuXG4gICAgICB3aGlsZSAodGhpcy5xdWV1ZWQubGVuZ3RoID4gMCAmJiB0aGlzLmlzT3Blbikge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMucXVldWVkWzBdXG4gICAgICAgIHRoaXMuc2VuZChmaXJzdC5hY3Rpb24sIGZpcnN0LnBheWxvYWQpXG4gICAgICAgIHRoaXMucXVldWVkID0gdGhpcy5xdWV1ZWQuc2xpY2UoMSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5vbmNsb3NlID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9oYW5kbGVNZXNzYWdlID0gdGhpcy5faGFuZGxlTWVzc2FnZS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlXG5cbiAgICB0aGlzLmNsb3NlID0gdGhpcy5jbG9zZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5lbWl0ID0gdGhpcy5lbWl0LmJpbmQodGhpcylcbiAgICB0aGlzLm9uID0gdGhpcy5vbi5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbmNlID0gdGhpcy5vbmNlLmJpbmQodGhpcylcbiAgICB0aGlzLnNlbmQgPSB0aGlzLnNlbmQuYmluZCh0aGlzKVxuICB9XG5cbiAgY2xvc2UgKCkge1xuICAgIHJldHVybiB0aGlzLnNvY2tldC5jbG9zZSgpXG4gIH1cblxuICBzZW5kIChhY3Rpb24sIHBheWxvYWQpIHtcbiAgICAvLyBhdHRhY2ggdXVpZFxuXG4gICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5xdWV1ZWQucHVzaCh7YWN0aW9uLCBwYXlsb2FkfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgYWN0aW9uLFxuICAgICAgcGF5bG9hZFxuICAgIH0pKVxuICB9XG5cbiAgb24gKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIGNvbnNvbGUubG9nKGFjdGlvbilcbiAgICB0aGlzLmVtaXR0ZXIub24oYWN0aW9uLCBoYW5kbGVyKVxuICB9XG5cbiAgZW1pdCAoYWN0aW9uLCBwYXlsb2FkKSB7XG4gICAgY29uc29sZS5sb2coYWN0aW9uKVxuICAgIHRoaXMuZW1pdHRlci5lbWl0KGFjdGlvbiwgcGF5bG9hZClcbiAgfVxuXG4gIG9uY2UgKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbmNlKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSlcbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgICB0aGlzLmVtaXQobWVzc2FnZS5hY3Rpb24sIG1lc3NhZ2UucGF5bG9hZClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9XG4gIH1cbn1cbiIsImNvbnN0IHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcbi8vIHdlIGlubGluZSBmaWxlLXR5cGUgbW9kdWxlLCBhcyBvcHBvc2VkIHRvIHVzaW5nIHRoZSBOUE0gdmVyc2lvbixcbi8vIGJlY2F1c2Ugb2YgdGhpcyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2ZpbGUtdHlwZS9pc3N1ZXMvNzhcbi8vIGFuZCBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL2NvcHktdGV4dC10by1jbGlwYm9hcmQvaXNzdWVzLzVcbmNvbnN0IGZpbGVUeXBlID0gcmVxdWlyZSgnLi4vdmVuZG9yL2ZpbGUtdHlwZScpXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHNtYWxsIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgaGVscCB3aXRoIGRvbSBtYW5pcHVsYXRpb24sIGFkZGluZyBsaXN0ZW5lcnMsXG4gKiBwcm9taXNlcyBhbmQgb3RoZXIgZ29vZCB0aGluZ3MuXG4gKlxuICogQG1vZHVsZSBVdGlsc1xuICovXG5cbmZ1bmN0aW9uIGlzVG91Y2hEZXZpY2UgKCkge1xuICByZXR1cm4gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8IC8vIHdvcmtzIG9uIG1vc3QgYnJvd3NlcnNcbiAgICAgICAgICBuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgICAvLyB3b3JrcyBvbiBJRTEwLzExIGFuZCBTdXJmYWNlXG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlU3RyaW5nIChzdHIsIGxlbmd0aCkge1xuICBpZiAoc3RyLmxlbmd0aCA+IGxlbmd0aCkge1xuICAgIHJldHVybiBzdHIuc3Vic3RyKDAsIGxlbmd0aCAvIDIpICsgJy4uLicgKyBzdHIuc3Vic3RyKHN0ci5sZW5ndGggLSBsZW5ndGggLyA0LCBzdHIubGVuZ3RoKVxuICB9XG4gIHJldHVybiBzdHJcblxuICAvLyBtb3JlIHByZWNpc2UgdmVyc2lvbiBpZiBuZWVkZWRcbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODMxNTgzXG59XG5cbmZ1bmN0aW9uIHNlY29uZHNUb1RpbWUgKHJhd1NlY29uZHMpIHtcbiAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyAzNjAwKSAlIDI0XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHJhd1NlY29uZHMgLyA2MCkgJSA2MFxuICBjb25zdCBzZWNvbmRzID0gTWF0aC5mbG9vcihyYXdTZWNvbmRzICUgNjApXG5cbiAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGxpc3QgaW50byBhcnJheVxuKi9cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG5cbi8qKlxuICogUmV0dXJucyBhIHRpbWVzdGFtcCBpbiB0aGUgZm9ybWF0IG9mIGBob3VyczptaW51dGVzOnNlY29uZHNgXG4qL1xuZnVuY3Rpb24gZ2V0VGltZVN0YW1wICgpIHtcbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgpXG4gIHZhciBob3VycyA9IHBhZChkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKSlcbiAgdmFyIG1pbnV0ZXMgPSBwYWQoZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKSlcbiAgdmFyIHNlY29uZHMgPSBwYWQoZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKSlcbiAgcmV0dXJuIGhvdXJzICsgJzonICsgbWludXRlcyArICc6JyArIHNlY29uZHNcbn1cblxuLyoqXG4gKiBBZGRzIHplcm8gdG8gc3RyaW5ncyBzaG9ydGVyIHRoYW4gdHdvIGNoYXJhY3RlcnNcbiovXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICByZXR1cm4gc3RyLmxlbmd0aCAhPT0gMiA/IDAgKyBzdHIgOiBzdHJcbn1cblxuLyoqXG4gKiBUYWtlcyBhIGZpbGUgb2JqZWN0IGFuZCB0dXJucyBpdCBpbnRvIGZpbGVJRCwgYnkgY29udmVydGluZyBmaWxlLm5hbWUgdG8gbG93ZXJjYXNlLFxuICogcmVtb3ZpbmcgZXh0cmEgY2hhcmFjdGVycyBhbmQgYWRkaW5nIHR5cGUsIHNpemUgYW5kIGxhc3RNb2RpZmllZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHRoZSBmaWxlSURcbiAqXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZUlEIChmaWxlKSB7XG4gIC8vIGZpbHRlciBpcyBuZWVkZWQgdG8gbm90IGpvaW4gZW1wdHkgdmFsdWVzIHdpdGggYC1gXG4gIHJldHVybiBbXG4gICAgJ3VwcHknLFxuICAgIGZpbGUubmFtZSA/IGZpbGUubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teQS1aMC05XS9pZywgJycpIDogJycsXG4gICAgZmlsZS50eXBlLFxuICAgIGZpbGUuZGF0YS5zaXplLFxuICAgIGZpbGUuZGF0YS5sYXN0TW9kaWZpZWRcbiAgXS5maWx0ZXIodmFsID0+IHZhbCkuam9pbignLScpXG59XG5cbi8qKlxuICogUnVucyBhbiBhcnJheSBvZiBwcm9taXNlLXJldHVybmluZyBmdW5jdGlvbnMgaW4gc2VxdWVuY2UuXG4gKi9cbmZ1bmN0aW9uIHJ1blByb21pc2VTZXF1ZW5jZSAoZnVuY3Rpb25zLCAuLi5hcmdzKSB7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKClcbiAgZnVuY3Rpb25zLmZvckVhY2goKGZ1bmMpID0+IHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IGZ1bmMoLi4uYXJncykpXG4gIH0pXG4gIHJldHVybiBwcm9taXNlXG59XG5cbmZ1bmN0aW9uIGlzUHJldmlld1N1cHBvcnRlZCAoZmlsZVR5cGUpIHtcbiAgaWYgKCFmaWxlVHlwZSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGZpbGVUeXBlU3BlY2lmaWMgPSBmaWxlVHlwZS5zcGxpdCgnLycpWzFdXG4gIC8vIGxpc3Qgb2YgaW1hZ2VzIHRoYXQgYnJvd3NlcnMgY2FuIHByZXZpZXdcbiAgaWYgKC9eKGpwZWd8Z2lmfHBuZ3xzdmd8c3ZnXFwreG1sfGJtcCkkLy50ZXN0KGZpbGVUeXBlU3BlY2lmaWMpKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gZ2V0QXJyYXlCdWZmZXIgKGNodW5rKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAvLyBlLnRhcmdldC5yZXN1bHQgaXMgYW4gQXJyYXlCdWZmZXJcbiAgICAgIHJlc29sdmUoZS50YXJnZXQucmVzdWx0KVxuICAgIH0pXG4gICAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gICAgICByZWplY3QoZXJyKVxuICAgIH0pXG4gICAgLy8gZmlsZS10eXBlIG9ubHkgbmVlZHMgdGhlIGZpcnN0IDQxMDAgYnl0ZXNcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoY2h1bmspXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlIChmaWxlKSB7XG4gIGNvbnN0IGV4dGVuc2lvbnNUb01pbWUgPSB7XG4gICAgJ21kJzogJ3RleHQvbWFya2Rvd24nLFxuICAgICdtYXJrZG93bic6ICd0ZXh0L21hcmtkb3duJyxcbiAgICAnbXA0JzogJ3ZpZGVvL21wNCcsXG4gICAgJ21wMyc6ICdhdWRpby9tcDMnLFxuICAgICdzdmcnOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgJ2pwZyc6ICdpbWFnZS9qcGVnJyxcbiAgICAncG5nJzogJ2ltYWdlL3BuZycsXG4gICAgJ2dpZic6ICdpbWFnZS9naWYnXG4gIH1cblxuICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gZmlsZS5uYW1lID8gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24oZmlsZS5uYW1lKS5leHRlbnNpb24gOiBudWxsXG5cbiAgaWYgKGZpbGUuaXNSZW1vdGUpIHtcbiAgICAvLyBzb21lIHJlbW90ZSBwcm92aWRlcnMgZG8gbm90IHN1cHBvcnQgZmlsZSB0eXBlc1xuICAgIGNvbnN0IG1pbWUgPSBmaWxlLnR5cGUgPyBmaWxlLnR5cGUgOiBleHRlbnNpb25zVG9NaW1lW2ZpbGVFeHRlbnNpb25dXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShtaW1lKVxuICB9XG5cbiAgLy8gMS4gdHJ5IHRvIGRldGVybWluZSBmaWxlIHR5cGUgZnJvbSBtYWdpYyBieXRlcyB3aXRoIGZpbGUtdHlwZSBtb2R1bGVcbiAgLy8gdGhpcyBzaG91bGQgYmUgdGhlIG1vc3QgdHJ1c3R3b3J0aHkgd2F5XG4gIGNvbnN0IGNodW5rID0gZmlsZS5kYXRhLnNsaWNlKDAsIDQxMDApXG4gIHJldHVybiBnZXRBcnJheUJ1ZmZlcihjaHVuaylcbiAgICAudGhlbigoYnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0eXBlID0gZmlsZVR5cGUoYnVmZmVyKVxuICAgICAgaWYgKHR5cGUgJiYgdHlwZS5taW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlLm1pbWVcbiAgICAgIH1cblxuICAgICAgLy8gMi4gaWYgdGhhdOKAmXMgbm8gZ29vZCwgY2hlY2sgaWYgbWltZSB0eXBlIGlzIHNldCBpbiB0aGUgZmlsZSBvYmplY3RcbiAgICAgIGlmIChmaWxlLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIGZpbGUudHlwZVxuICAgICAgfVxuXG4gICAgICAvLyAzLiBpZiB0aGF04oCZcyBubyBnb29kLCBzZWUgaWYgd2UgY2FuIG1hcCBleHRlbnNpb24gdG8gYSBtaW1lIHR5cGVcbiAgICAgIGlmIChmaWxlRXh0ZW5zaW9uICYmIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl0pIHtcbiAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnNUb01pbWVbZmlsZUV4dGVuc2lvbl1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgYWxsIGZhaWxzLCB3ZWxsLCByZXR1cm4gZW1wdHlcbiAgICAgIHJldHVybiBudWxsXG4gICAgfSlcbiAgICAuY2F0Y2goKCkgPT4ge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9KVxufVxuXG4vLyBUT0RPIENoZWNrIHdoaWNoIHR5cGVzIGFyZSBhY3R1YWxseSBzdXBwb3J0ZWQgaW4gYnJvd3NlcnMuIENocm9tZSBsaWtlcyB3ZWJtXG4vLyBmcm9tIG15IHRlc3RpbmcsIGJ1dCB3ZSBtYXkgbmVlZCBtb3JlLlxuLy8gV2UgY291bGQgdXNlIGEgbGlicmFyeSBidXQgdGhleSB0ZW5kIHRvIGNvbnRhaW4gZG96ZW5zIG9mIEtCcyBvZiBtYXBwaW5ncyxcbi8vIG1vc3Qgb2Ygd2hpY2ggd2lsbCBnbyB1bnVzZWQsIHNvIG5vdCBzdXJlIGlmIHRoYXQncyB3b3J0aCBpdC5cbmNvbnN0IG1pbWVUb0V4dGVuc2lvbnMgPSB7XG4gICd2aWRlby9vZ2cnOiAnb2d2JyxcbiAgJ2F1ZGlvL29nZyc6ICdvZ2cnLFxuICAndmlkZW8vd2VibSc6ICd3ZWJtJyxcbiAgJ2F1ZGlvL3dlYm0nOiAnd2VibScsXG4gICd2aWRlby9tcDQnOiAnbXA0JyxcbiAgJ2F1ZGlvL21wMyc6ICdtcDMnXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVUeXBlRXh0ZW5zaW9uIChtaW1lVHlwZSkge1xuICByZXR1cm4gbWltZVRvRXh0ZW5zaW9uc1ttaW1lVHlwZV0gfHwgbnVsbFxufVxuXG4vKipcbiogVGFrZXMgYSBmdWxsIGZpbGVuYW1lIHN0cmluZyBhbmQgcmV0dXJucyBhbiBvYmplY3Qge25hbWUsIGV4dGVuc2lvbn1cbipcbiogQHBhcmFtIHtzdHJpbmd9IGZ1bGxGaWxlTmFtZVxuKiBAcmV0dXJuIHtvYmplY3R9IHtuYW1lLCBleHRlbnNpb259XG4qL1xuZnVuY3Rpb24gZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24gKGZ1bGxGaWxlTmFtZSkge1xuICB2YXIgcmUgPSAvKD86XFwuKFteLl0rKSk/JC9cbiAgdmFyIGZpbGVFeHQgPSByZS5leGVjKGZ1bGxGaWxlTmFtZSlbMV1cbiAgdmFyIGZpbGVOYW1lID0gZnVsbEZpbGVOYW1lLnJlcGxhY2UoJy4nICsgZmlsZUV4dCwgJycpXG4gIHJldHVybiB7XG4gICAgbmFtZTogZmlsZU5hbWUsXG4gICAgZXh0ZW5zaW9uOiBmaWxlRXh0XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIFVSTCBzdHJpbmcgaXMgYW4gb2JqZWN0IFVSTCBmcm9tIGBVUkwuY3JlYXRlT2JqZWN0VVJMYC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdFVSTCAodXJsKSB7XG4gIHJldHVybiB1cmwuaW5kZXhPZignYmxvYjonKSA9PT0gMFxufVxuXG5mdW5jdGlvbiBnZXRQcm9wb3J0aW9uYWxIZWlnaHQgKGltZywgd2lkdGgpIHtcbiAgY29uc3QgYXNwZWN0ID0gaW1nLndpZHRoIC8gaW1nLmhlaWdodFxuICByZXR1cm4gTWF0aC5yb3VuZCh3aWR0aCAvIGFzcGVjdClcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB0aHVtYm5haWwgZm9yIHRoZSBnaXZlbiBVcHB5IGZpbGUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7e2RhdGE6IEJsb2J9fSBmaWxlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRodW1ibmFpbCAoZmlsZSwgdGFyZ2V0V2lkdGgpIHtcbiAgY29uc3Qgb3JpZ2luYWxVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUuZGF0YSlcbiAgY29uc3Qgb25sb2FkID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKClcbiAgICBpbWFnZS5zcmMgPSBvcmlnaW5hbFVybFxuICAgIGltYWdlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZXNvbHZlKGltYWdlKVxuICAgIH1cbiAgICBpbWFnZS5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgLy8gVGhlIG9uZXJyb3IgZXZlbnQgaXMgdG90YWxseSB1c2VsZXNzIHVuZm9ydHVuYXRlbHksIGFzIGZhciBhcyBJIGtub3dcbiAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwob3JpZ2luYWxVcmwpXG4gICAgICByZWplY3QobmV3IEVycm9yKCdDb3VsZCBub3QgY3JlYXRlIHRodW1ibmFpbCcpKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gb25sb2FkLnRoZW4oKGltYWdlKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0SGVpZ2h0ID0gZ2V0UHJvcG9ydGlvbmFsSGVpZ2h0KGltYWdlLCB0YXJnZXRXaWR0aClcbiAgICBjb25zdCBjYW52YXMgPSByZXNpemVJbWFnZShpbWFnZSwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodClcbiAgICByZXR1cm4gY2FudmFzVG9CbG9iKGNhbnZhcywgJ2ltYWdlL3BuZycpXG4gIH0pLnRoZW4oKGJsb2IpID0+IHtcbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKVxuICB9KVxufVxuXG4vKipcbiAqIFJlc2l6ZSBhbiBpbWFnZSB0byB0aGUgdGFyZ2V0IGB3aWR0aGAgYW5kIGBoZWlnaHRgLlxuICpcbiAqIFJldHVybnMgYSBDYW52YXMgd2l0aCB0aGUgcmVzaXplZCBpbWFnZSBvbiBpdC5cbiAqL1xuZnVuY3Rpb24gcmVzaXplSW1hZ2UgKGltYWdlLCB0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0KSB7XG4gIGxldCBzb3VyY2VXaWR0aCA9IGltYWdlLndpZHRoXG4gIGxldCBzb3VyY2VIZWlnaHQgPSBpbWFnZS5oZWlnaHRcblxuICBpZiAodGFyZ2V0SGVpZ2h0IDwgaW1hZ2UuaGVpZ2h0IC8gMikge1xuICAgIGNvbnN0IHN0ZXBzID0gTWF0aC5mbG9vcihNYXRoLmxvZyhpbWFnZS53aWR0aCAvIHRhcmdldFdpZHRoKSAvIE1hdGgubG9nKDIpKVxuICAgIGNvbnN0IHN0ZXBTY2FsZWQgPSBkb3duU2NhbGVJblN0ZXBzKGltYWdlLCBzdGVwcylcbiAgICBpbWFnZSA9IHN0ZXBTY2FsZWQuaW1hZ2VcbiAgICBzb3VyY2VXaWR0aCA9IHN0ZXBTY2FsZWQuc291cmNlV2lkdGhcbiAgICBzb3VyY2VIZWlnaHQgPSBzdGVwU2NhbGVkLnNvdXJjZUhlaWdodFxuICB9XG5cbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgY2FudmFzLndpZHRoID0gdGFyZ2V0V2lkdGhcbiAgY2FudmFzLmhlaWdodCA9IHRhcmdldEhlaWdodFxuXG4gIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICBjb250ZXh0LmRyYXdJbWFnZShpbWFnZSxcbiAgICAwLCAwLCBzb3VyY2VXaWR0aCwgc291cmNlSGVpZ2h0LFxuICAgIDAsIDAsIHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpXG5cbiAgcmV0dXJuIGNhbnZhc1xufVxuXG4vKipcbiAqIERvd25zY2FsZSBhbiBpbWFnZSBieSA1MCUgYHN0ZXBzYCB0aW1lcy5cbiAqL1xuZnVuY3Rpb24gZG93blNjYWxlSW5TdGVwcyAoaW1hZ2UsIHN0ZXBzKSB7XG4gIGxldCBzb3VyY2UgPSBpbWFnZVxuICBsZXQgY3VycmVudFdpZHRoID0gc291cmNlLndpZHRoXG4gIGxldCBjdXJyZW50SGVpZ2h0ID0gc291cmNlLmhlaWdodFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHM7IGkgKz0gMSkge1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gICAgY2FudmFzLndpZHRoID0gY3VycmVudFdpZHRoIC8gMlxuICAgIGNhbnZhcy5oZWlnaHQgPSBjdXJyZW50SGVpZ2h0IC8gMlxuICAgIGNvbnRleHQuZHJhd0ltYWdlKHNvdXJjZSxcbiAgICAgIC8vIFRoZSBlbnRpcmUgc291cmNlIGltYWdlLiBXZSBwYXNzIHdpZHRoIGFuZCBoZWlnaHQgaGVyZSxcbiAgICAgIC8vIGJlY2F1c2Ugd2UgcmV1c2UgdGhpcyBjYW52YXMsIGFuZCBzaG91bGQgb25seSBzY2FsZSBkb3duXG4gICAgICAvLyB0aGUgcGFydCBvZiB0aGUgY2FudmFzIHRoYXQgY29udGFpbnMgdGhlIHByZXZpb3VzIHNjYWxlIHN0ZXAuXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGgsIGN1cnJlbnRIZWlnaHQsXG4gICAgICAvLyBEcmF3IHRvIDUwJSBzaXplXG4gICAgICAwLCAwLCBjdXJyZW50V2lkdGggLyAyLCBjdXJyZW50SGVpZ2h0IC8gMilcbiAgICBjdXJyZW50V2lkdGggLz0gMlxuICAgIGN1cnJlbnRIZWlnaHQgLz0gMlxuICAgIHNvdXJjZSA9IGNhbnZhc1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBpbWFnZTogc291cmNlLFxuICAgIHNvdXJjZVdpZHRoOiBjdXJyZW50V2lkdGgsXG4gICAgc291cmNlSGVpZ2h0OiBjdXJyZW50SGVpZ2h0XG4gIH1cbn1cblxuLyoqXG4gKiBTYXZlIGEgPGNhbnZhcz4gZWxlbWVudCdzIGNvbnRlbnQgdG8gYSBCbG9iIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fSBjYW52YXNcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNhbnZhc1RvQmxvYiAoY2FudmFzLCB0eXBlLCBxdWFsaXR5KSB7XG4gIGlmIChjYW52YXMudG9CbG9iKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICBjYW52YXMudG9CbG9iKHJlc29sdmUsIHR5cGUsIHF1YWxpdHkpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoY2FudmFzLnRvRGF0YVVSTCh0eXBlLCBxdWFsaXR5KSwge30pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0Jsb2IgKGRhdGFVUkksIG9wdHMsIHRvRmlsZSkge1xuICAvLyBnZXQgdGhlIGJhc2U2NCBkYXRhXG4gIHZhciBkYXRhID0gZGF0YVVSSS5zcGxpdCgnLCcpWzFdXG5cbiAgLy8gdXNlciBtYXkgcHJvdmlkZSBtaW1lIHR5cGUsIGlmIG5vdCBnZXQgaXQgZnJvbSBkYXRhIFVSSVxuICB2YXIgbWltZVR5cGUgPSBvcHRzLm1pbWVUeXBlIHx8IGRhdGFVUkkuc3BsaXQoJywnKVswXS5zcGxpdCgnOicpWzFdLnNwbGl0KCc7JylbMF1cblxuICAvLyBkZWZhdWx0IHRvIHBsYWluL3RleHQgaWYgZGF0YSBVUkkgaGFzIG5vIG1pbWVUeXBlXG4gIGlmIChtaW1lVHlwZSA9PSBudWxsKSB7XG4gICAgbWltZVR5cGUgPSAncGxhaW4vdGV4dCdcbiAgfVxuXG4gIHZhciBiaW5hcnkgPSBhdG9iKGRhdGEpXG4gIHZhciBhcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYmluYXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgYXJyYXkucHVzaChiaW5hcnkuY2hhckNvZGVBdChpKSlcbiAgfVxuXG4gIC8vIENvbnZlcnQgdG8gYSBGaWxlP1xuICBpZiAodG9GaWxlKSB7XG4gICAgcmV0dXJuIG5ldyBGaWxlKFtuZXcgVWludDhBcnJheShhcnJheSldLCBvcHRzLm5hbWUgfHwgJycsIHt0eXBlOiBtaW1lVHlwZX0pXG4gIH1cblxuICByZXR1cm4gbmV3IEJsb2IoW25ldyBVaW50OEFycmF5KGFycmF5KV0sIHt0eXBlOiBtaW1lVHlwZX0pXG59XG5cbmZ1bmN0aW9uIGRhdGFVUkl0b0ZpbGUgKGRhdGFVUkksIG9wdHMpIHtcbiAgcmV0dXJuIGRhdGFVUkl0b0Jsb2IoZGF0YVVSSSwgb3B0cywgdHJ1ZSlcbn1cblxuLyoqXG4gKiBDb3BpZXMgdGV4dCB0byBjbGlwYm9hcmQgYnkgY3JlYXRpbmcgYW4gYWxtb3N0IGludmlzaWJsZSB0ZXh0YXJlYSxcbiAqIGFkZGluZyB0ZXh0IHRoZXJlLCB0aGVuIHJ1bm5pbmcgZXhlY0NvbW1hbmQoJ2NvcHknKS5cbiAqIEZhbGxzIGJhY2sgdG8gcHJvbXB0KCkgd2hlbiB0aGUgZWFzeSB3YXkgZmFpbHMgKGhlbGxvLCBTYWZhcmkhKVxuICogRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDgxMDMyMlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0VG9Db3B5XG4gKiBAcGFyYW0ge1N0cmluZ30gZmFsbGJhY2tTdHJpbmdcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cbmZ1bmN0aW9uIGNvcHlUb0NsaXBib2FyZCAodGV4dFRvQ29weSwgZmFsbGJhY2tTdHJpbmcpIHtcbiAgZmFsbGJhY2tTdHJpbmcgPSBmYWxsYmFja1N0cmluZyB8fCAnQ29weSB0aGUgVVJMIGJlbG93J1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHRleHRBcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKVxuICAgIHRleHRBcmVhLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCB7XG4gICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICB3aWR0aDogJzJlbScsXG4gICAgICBoZWlnaHQ6ICcyZW0nLFxuICAgICAgcGFkZGluZzogMCxcbiAgICAgIGJvcmRlcjogJ25vbmUnLFxuICAgICAgb3V0bGluZTogJ25vbmUnLFxuICAgICAgYm94U2hhZG93OiAnbm9uZScsXG4gICAgICBiYWNrZ3JvdW5kOiAndHJhbnNwYXJlbnQnXG4gICAgfSlcblxuICAgIHRleHRBcmVhLnZhbHVlID0gdGV4dFRvQ29weVxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGV4dEFyZWEpXG4gICAgdGV4dEFyZWEuc2VsZWN0KClcblxuICAgIGNvbnN0IG1hZ2ljQ29weUZhaWxlZCA9ICgpID0+IHtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICB3aW5kb3cucHJvbXB0KGZhbGxiYWNrU3RyaW5nLCB0ZXh0VG9Db3B5KVxuICAgICAgcmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWwgPSBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpXG4gICAgICBpZiAoIXN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZCgnY29weSBjb21tYW5kIHVuYXZhaWxhYmxlJylcbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGV4dEFyZWEpXG4gICAgICByZXR1cm4gcmVzb2x2ZSgpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRleHRBcmVhKVxuICAgICAgcmV0dXJuIG1hZ2ljQ29weUZhaWxlZChlcnIpXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBnZXRTcGVlZCAoZmlsZVByb2dyZXNzKSB7XG4gIGlmICghZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWQpIHJldHVybiAwXG5cbiAgY29uc3QgdGltZUVsYXBzZWQgPSAobmV3IERhdGUoKSkgLSBmaWxlUHJvZ3Jlc3MudXBsb2FkU3RhcnRlZFxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGZpbGVQcm9ncmVzcy5ieXRlc1VwbG9hZGVkIC8gKHRpbWVFbGFwc2VkIC8gMTAwMClcbiAgcmV0dXJuIHVwbG9hZFNwZWVkXG59XG5cbmZ1bmN0aW9uIGdldEJ5dGVzUmVtYWluaW5nIChmaWxlUHJvZ3Jlc3MpIHtcbiAgcmV0dXJuIGZpbGVQcm9ncmVzcy5ieXRlc1RvdGFsIC0gZmlsZVByb2dyZXNzLmJ5dGVzVXBsb2FkZWRcbn1cblxuZnVuY3Rpb24gZ2V0RVRBIChmaWxlUHJvZ3Jlc3MpIHtcbiAgaWYgKCFmaWxlUHJvZ3Jlc3MuYnl0ZXNVcGxvYWRlZCkgcmV0dXJuIDBcblxuICBjb25zdCB1cGxvYWRTcGVlZCA9IGdldFNwZWVkKGZpbGVQcm9ncmVzcylcbiAgY29uc3QgYnl0ZXNSZW1haW5pbmcgPSBnZXRCeXRlc1JlbWFpbmluZyhmaWxlUHJvZ3Jlc3MpXG4gIGNvbnN0IHNlY29uZHNSZW1haW5pbmcgPSBNYXRoLnJvdW5kKGJ5dGVzUmVtYWluaW5nIC8gdXBsb2FkU3BlZWQgKiAxMCkgLyAxMFxuXG4gIHJldHVybiBzZWNvbmRzUmVtYWluaW5nXG59XG5cbmZ1bmN0aW9uIHByZXR0eUVUQSAoc2Vjb25kcykge1xuICBjb25zdCB0aW1lID0gc2Vjb25kc1RvVGltZShzZWNvbmRzKVxuXG4gIC8vIE9ubHkgZGlzcGxheSBob3VycyBhbmQgbWludXRlcyBpZiB0aGV5IGFyZSBncmVhdGVyIHRoYW4gMCBidXQgYWx3YXlzXG4gIC8vIGRpc3BsYXkgbWludXRlcyBpZiBob3VycyBpcyBiZWluZyBkaXNwbGF5ZWRcbiAgLy8gRGlzcGxheSBhIGxlYWRpbmcgemVybyBpZiB0aGUgdGhlcmUgaXMgYSBwcmVjZWRpbmcgdW5pdDogMW0gMDVzLCBidXQgNXNcbiAgY29uc3QgaG91cnNTdHIgPSB0aW1lLmhvdXJzID8gdGltZS5ob3VycyArICdoICcgOiAnJ1xuICBjb25zdCBtaW51dGVzVmFsID0gdGltZS5ob3VycyA/ICgnMCcgKyB0aW1lLm1pbnV0ZXMpLnN1YnN0cigtMikgOiB0aW1lLm1pbnV0ZXNcbiAgY29uc3QgbWludXRlc1N0ciA9IG1pbnV0ZXNWYWwgPyBtaW51dGVzVmFsICsgJ20gJyA6ICcnXG4gIGNvbnN0IHNlY29uZHNWYWwgPSBtaW51dGVzVmFsID8gKCcwJyArIHRpbWUuc2Vjb25kcykuc3Vic3RyKC0yKSA6IHRpbWUuc2Vjb25kc1xuICBjb25zdCBzZWNvbmRzU3RyID0gc2Vjb25kc1ZhbCArICdzJ1xuXG4gIHJldHVybiBgJHtob3Vyc1N0cn0ke21pbnV0ZXNTdHJ9JHtzZWNvbmRzU3RyfWBcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhbiBvYmplY3QgaXMgYSBET00gZWxlbWVudC4gRHVjay10eXBpbmcgYmFzZWQgb24gYG5vZGVUeXBlYC5cbiAqXG4gKiBAcGFyYW0geyp9IG9ialxuICovXG5mdW5jdGlvbiBpc0RPTUVsZW1lbnQgKG9iaikge1xuICByZXR1cm4gb2JqICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iai5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREVcbn1cblxuLyoqXG4gKiBGaW5kIGEgRE9NIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfHN0cmluZ30gZWxlbWVudFxuICogQHJldHVybiB7Tm9kZXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kRE9NRWxlbWVudCAoZWxlbWVudCkge1xuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbWVudClcbiAgfVxuXG4gIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ29iamVjdCcgJiYgaXNET01FbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgcmV0dXJuIGVsZW1lbnRcbiAgfVxufVxuXG4vKipcbiAqIEZpbmQgb25lIG9yIG1vcmUgRE9NIGVsZW1lbnRzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBlbGVtZW50XG4gKiBAcmV0dXJuIHtBcnJheXxudWxsfVxuICovXG5mdW5jdGlvbiBmaW5kQWxsRE9NRWxlbWVudHMgKGVsZW1lbnQpIHtcbiAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnQpKVxuICAgIHJldHVybiBlbGVtZW50cy5sZW5ndGggPiAwID8gZWxlbWVudHMgOiBudWxsXG4gIH1cblxuICBpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdvYmplY3QnICYmIGlzRE9NRWxlbWVudChlbGVtZW50KSkge1xuICAgIHJldHVybiBbZWxlbWVudF1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTb2NrZXRIb3N0ICh1cmwpIHtcbiAgLy8gZ2V0IHRoZSBob3N0IGRvbWFpblxuICB2YXIgcmVnZXggPSAvXig/Omh0dHBzPzpcXC9cXC98XFwvXFwvKT8oPzpbXkBcXG5dK0ApPyg/Ond3d1xcLik/KFteXFxuXSspL1xuICB2YXIgaG9zdCA9IHJlZ2V4LmV4ZWModXJsKVsxXVxuICB2YXIgc29ja2V0UHJvdG9jb2wgPSBsb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgPyAnd3NzJyA6ICd3cydcblxuICByZXR1cm4gYCR7c29ja2V0UHJvdG9jb2x9Oi8vJHtob3N0fWBcbn1cblxuZnVuY3Rpb24gX2VtaXRTb2NrZXRQcm9ncmVzcyAodXBsb2FkZXIsIHByb2dyZXNzRGF0YSwgZmlsZSkge1xuICBjb25zdCB7IHByb2dyZXNzLCBieXRlc1VwbG9hZGVkLCBieXRlc1RvdGFsIH0gPSBwcm9ncmVzc0RhdGFcbiAgaWYgKHByb2dyZXNzKSB7XG4gICAgdXBsb2FkZXIudXBweS5sb2coYFVwbG9hZCBwcm9ncmVzczogJHtwcm9ncmVzc31gKVxuICAgIHVwbG9hZGVyLnVwcHkuZW1pdCgndXBsb2FkLXByb2dyZXNzJywge1xuICAgICAgdXBsb2FkZXIsXG4gICAgICBpZDogZmlsZS5pZCxcbiAgICAgIGJ5dGVzVXBsb2FkZWQ6IGJ5dGVzVXBsb2FkZWQsXG4gICAgICBieXRlc1RvdGFsOiBieXRlc1RvdGFsXG4gICAgfSlcbiAgfVxufVxuXG5jb25zdCBlbWl0U29ja2V0UHJvZ3Jlc3MgPSB0aHJvdHRsZShfZW1pdFNvY2tldFByb2dyZXNzLCAzMDAsIHtsZWFkaW5nOiB0cnVlLCB0cmFpbGluZzogdHJ1ZX0pXG5cbmZ1bmN0aW9uIHNldHRsZSAocHJvbWlzZXMpIHtcbiAgY29uc3QgcmVzb2x1dGlvbnMgPSBbXVxuICBjb25zdCByZWplY3Rpb25zID0gW11cbiAgZnVuY3Rpb24gcmVzb2x2ZWQgKHZhbHVlKSB7XG4gICAgcmVzb2x1dGlvbnMucHVzaCh2YWx1ZSlcbiAgfVxuICBmdW5jdGlvbiByZWplY3RlZCAoZXJyb3IpIHtcbiAgICByZWplY3Rpb25zLnB1c2goZXJyb3IpXG4gIH1cblxuICBjb25zdCB3YWl0ID0gUHJvbWlzZS5hbGwoXG4gICAgcHJvbWlzZXMubWFwKChwcm9taXNlKSA9PiBwcm9taXNlLnRoZW4ocmVzb2x2ZWQsIHJlamVjdGVkKSlcbiAgKVxuXG4gIHJldHVybiB3YWl0LnRoZW4oKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzZnVsOiByZXNvbHV0aW9ucyxcbiAgICAgIGZhaWxlZDogcmVqZWN0aW9uc1xuICAgIH1cbiAgfSlcbn1cblxuLyoqXG4gKiBMaW1pdCB0aGUgYW1vdW50IG9mIHNpbXVsdGFuZW91c2x5IHBlbmRpbmcgUHJvbWlzZXMuXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBwYXNzZWQgYSBmdW5jdGlvbiBgZm5gLFxuICogd2lsbCBtYWtlIHN1cmUgdGhhdCBhdCBtb3N0IGBsaW1pdGAgY2FsbHMgdG8gYGZuYCBhcmUgcGVuZGluZy5cbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gbGltaXRcbiAqIEByZXR1cm4ge2Z1bmN0aW9uKCl9XG4gKi9cbmZ1bmN0aW9uIGxpbWl0UHJvbWlzZXMgKGxpbWl0KSB7XG4gIGxldCBwZW5kaW5nID0gMFxuICBjb25zdCBxdWV1ZSA9IFtdXG4gIHJldHVybiAoZm4pID0+IHtcbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgIGNvbnN0IGNhbGwgPSAoKSA9PiB7XG4gICAgICAgIHBlbmRpbmcrK1xuICAgICAgICBjb25zdCBwcm9taXNlID0gZm4oLi4uYXJncylcbiAgICAgICAgcHJvbWlzZS50aGVuKG9uZmluaXNoLCBvbmZpbmlzaClcbiAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgIH1cblxuICAgICAgaWYgKHBlbmRpbmcgPj0gbGltaXQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICBxdWV1ZS5wdXNoKCgpID0+IHtcbiAgICAgICAgICAgIGNhbGwoKS50aGVuKHJlc29sdmUsIHJlamVjdClcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgcmV0dXJuIGNhbGwoKVxuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBvbmZpbmlzaCAoKSB7XG4gICAgcGVuZGluZy0tXG4gICAgY29uc3QgbmV4dCA9IHF1ZXVlLnNoaWZ0KClcbiAgICBpZiAobmV4dCkgbmV4dCgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbmVyYXRlRmlsZUlELFxuICB0b0FycmF5LFxuICBnZXRUaW1lU3RhbXAsXG4gIHJ1blByb21pc2VTZXF1ZW5jZSxcbiAgaXNUb3VjaERldmljZSxcbiAgZ2V0RmlsZU5hbWVBbmRFeHRlbnNpb24sXG4gIHRydW5jYXRlU3RyaW5nLFxuICBnZXRGaWxlVHlwZUV4dGVuc2lvbixcbiAgZ2V0RmlsZVR5cGUsXG4gIGdldEFycmF5QnVmZmVyLFxuICBpc1ByZXZpZXdTdXBwb3J0ZWQsXG4gIGlzT2JqZWN0VVJMLFxuICBjcmVhdGVUaHVtYm5haWwsXG4gIHNlY29uZHNUb1RpbWUsXG4gIGRhdGFVUkl0b0Jsb2IsXG4gIGRhdGFVUkl0b0ZpbGUsXG4gIGNhbnZhc1RvQmxvYixcbiAgZ2V0U3BlZWQsXG4gIGdldEJ5dGVzUmVtYWluaW5nLFxuICBnZXRFVEEsXG4gIGNvcHlUb0NsaXBib2FyZCxcbiAgcHJldHR5RVRBLFxuICBmaW5kRE9NRWxlbWVudCxcbiAgZmluZEFsbERPTUVsZW1lbnRzLFxuICBnZXRTb2NrZXRIb3N0LFxuICBlbWl0U29ja2V0UHJvZ3Jlc3MsXG4gIHNldHRsZSxcbiAgbGltaXRQcm9taXNlc1xufVxuIiwiY29uc3QgUGx1Z2luID0gcmVxdWlyZSgnLi4vY29yZS9QbHVnaW4nKVxuY29uc3QgeyB0b0FycmF5IH0gPSByZXF1aXJlKCcuLi9jb3JlL1V0aWxzJylcbmNvbnN0IFRyYW5zbGF0b3IgPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zbGF0b3InKVxuY29uc3QgeyBoIH0gPSByZXF1aXJlKCdwcmVhY3QnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEZpbGVJbnB1dCBleHRlbmRzIFBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yICh1cHB5LCBvcHRzKSB7XG4gICAgc3VwZXIodXBweSwgb3B0cylcbiAgICB0aGlzLmlkID0gdGhpcy5vcHRzLmlkIHx8ICdGaWxlSW5wdXQnXG4gICAgdGhpcy50aXRsZSA9ICdGaWxlIElucHV0J1xuICAgIHRoaXMudHlwZSA9ICdhY3F1aXJlcidcblxuICAgIGNvbnN0IGRlZmF1bHRMb2NhbGUgPSB7XG4gICAgICBzdHJpbmdzOiB7XG4gICAgICAgIGNob29zZUZpbGVzOiAnQ2hvb3NlIGZpbGVzJ1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgdGFyZ2V0OiBudWxsLFxuICAgICAgYWxsb3dNdWx0aXBsZUZpbGVzOiB0cnVlLFxuICAgICAgcHJldHR5OiB0cnVlLFxuICAgICAgaW5wdXROYW1lOiAnZmlsZXNbXScsXG4gICAgICBsb2NhbGU6IGRlZmF1bHRMb2NhbGVcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuXG4gICAgdGhpcy5sb2NhbGUgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLCB0aGlzLm9wdHMubG9jYWxlKVxuICAgIHRoaXMubG9jYWxlLnN0cmluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0TG9jYWxlLnN0cmluZ3MsIHRoaXMub3B0cy5sb2NhbGUuc3RyaW5ncylcblxuICAgIC8vIGkxOG5cbiAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih7bG9jYWxlOiB0aGlzLmxvY2FsZX0pXG4gICAgdGhpcy5pMThuID0gdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZS5iaW5kKHRoaXMudHJhbnNsYXRvcilcblxuICAgIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKVxuICAgIHRoaXMuaGFuZGxlSW5wdXRDaGFuZ2UgPSB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlLmJpbmQodGhpcylcbiAgICB0aGlzLmhhbmRsZUNsaWNrID0gdGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMpXG4gIH1cblxuICBoYW5kbGVJbnB1dENoYW5nZSAoZXYpIHtcbiAgICB0aGlzLnVwcHkubG9nKCdbRmlsZUlucHV0XSBTb21ldGhpbmcgc2VsZWN0ZWQgdGhyb3VnaCBpbnB1dC4uLicpXG5cbiAgICBjb25zdCBmaWxlcyA9IHRvQXJyYXkoZXYudGFyZ2V0LmZpbGVzKVxuXG4gICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgdGhpcy51cHB5LmFkZEZpbGUoe1xuICAgICAgICBzb3VyY2U6IHRoaXMuaWQsXG4gICAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgICAgdHlwZTogZmlsZS50eXBlLFxuICAgICAgICBkYXRhOiBmaWxlXG4gICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgIC8vIElnbm9yZVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgaGFuZGxlQ2xpY2sgKGV2KSB7XG4gICAgdGhpcy5pbnB1dC5jbGljaygpXG4gIH1cblxuICByZW5kZXIgKHN0YXRlKSB7XG4gICAgY29uc3QgaGlkZGVuSW5wdXRTdHlsZSA9IHtcbiAgICAgIHdpZHRoOiAnMC4xcHgnLFxuICAgICAgaGVpZ2h0OiAnMC4xcHgnLFxuICAgICAgb3BhY2l0eTogMCxcbiAgICAgIG92ZXJmbG93OiAnaGlkZGVuJyxcbiAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgekluZGV4OiAtMVxuICAgIH1cblxuICAgIHJldHVybiA8ZGl2IGNsYXNzPVwidXBweSB1cHB5LUZpbGVJbnB1dC1jb250YWluZXJcIj5cbiAgICAgIDxpbnB1dCBjbGFzcz1cInVwcHktRmlsZUlucHV0LWlucHV0XCJcbiAgICAgICAgc3R5bGU9e3RoaXMub3B0cy5wcmV0dHkgJiYgaGlkZGVuSW5wdXRTdHlsZX1cbiAgICAgICAgdHlwZT1cImZpbGVcIlxuICAgICAgICBuYW1lPXt0aGlzLm9wdHMuaW5wdXROYW1lfVxuICAgICAgICBvbmNoYW5nZT17dGhpcy5oYW5kbGVJbnB1dENoYW5nZX1cbiAgICAgICAgbXVsdGlwbGU9e3RoaXMub3B0cy5hbGxvd011bHRpcGxlRmlsZXN9XG4gICAgICAgIHJlZj17KGlucHV0KSA9PiB7IHRoaXMuaW5wdXQgPSBpbnB1dCB9fSAvPlxuICAgICAge3RoaXMub3B0cy5wcmV0dHkgJiZcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVwcHktRmlsZUlucHV0LWJ0blwiIHR5cGU9XCJidXR0b25cIiBvbmNsaWNrPXt0aGlzLmhhbmRsZUNsaWNrfT5cbiAgICAgICAgICB7dGhpcy5pMThuKCdjaG9vc2VGaWxlcycpfVxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIH1cbiAgICA8L2Rpdj5cbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICB0aGlzLm1vdW50KHRhcmdldCwgdGhpcylcbiAgICB9XG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudW5tb3VudCgpXG4gIH1cbn1cbiIsImNvbnN0IFBsdWdpbiA9IHJlcXVpcmUoJy4uL2NvcmUvUGx1Z2luJylcbmNvbnN0IHsgaCB9ID0gcmVxdWlyZSgncHJlYWN0JylcblxuLyoqXG4gKiBQcm9ncmVzcyBiYXJcbiAqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUHJvZ3Jlc3NCYXIgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy5pZCA9IHRoaXMub3B0cy5pZCB8fCAnUHJvZ3Jlc3NCYXInXG4gICAgdGhpcy50aXRsZSA9ICdQcm9ncmVzcyBCYXInXG4gICAgdGhpcy50eXBlID0gJ3Byb2dyZXNzaW5kaWNhdG9yJ1xuXG4gICAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgdGFyZ2V0OiAnYm9keScsXG4gICAgICByZXBsYWNlVGFyZ2V0Q29udGVudDogZmFsc2UsXG4gICAgICBmaXhlZDogZmFsc2UsXG4gICAgICBoaWRlQWZ0ZXJGaW5pc2g6IHRydWVcbiAgICB9XG5cbiAgICAvLyBtZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuXG4gICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpXG4gIH1cblxuICByZW5kZXIgKHN0YXRlKSB7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBzdGF0ZS50b3RhbFByb2dyZXNzIHx8IDBcbiAgICBjb25zdCBpc0hpZGRlbiA9IHByb2dyZXNzID09PSAxMDAgJiYgdGhpcy5vcHRzLmhpZGVBZnRlckZpbmlzaFxuICAgIHJldHVybiA8ZGl2IGNsYXNzPVwidXBweSB1cHB5LVByb2dyZXNzQmFyXCIgc3R5bGU9e3sgcG9zaXRpb246IHRoaXMub3B0cy5maXhlZCA/ICdmaXhlZCcgOiAnaW5pdGlhbCcgfX0gYXJpYS1oaWRkZW49e2lzSGlkZGVufT5cbiAgICAgIDxkaXYgY2xhc3M9XCJ1cHB5LVByb2dyZXNzQmFyLWlubmVyXCIgc3R5bGU9e3sgd2lkdGg6IHByb2dyZXNzICsgJyUnIH19IC8+XG4gICAgICA8ZGl2IGNsYXNzPVwidXBweS1Qcm9ncmVzc0Jhci1wZXJjZW50YWdlXCI+e3Byb2dyZXNzfTwvZGl2PlxuICAgIDwvZGl2PlxuICB9XG5cbiAgaW5zdGFsbCAoKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5vcHRzLnRhcmdldFxuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIHRoaXMubW91bnQodGFyZ2V0LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIHVuaW5zdGFsbCAoKSB7XG4gICAgdGhpcy51bm1vdW50KClcbiAgfVxufVxuIiwiY29uc3QgUGx1Z2luID0gcmVxdWlyZSgnLi4vY29yZS9QbHVnaW4nKVxuY29uc3QgY3VpZCA9IHJlcXVpcmUoJ2N1aWQnKVxuY29uc3QgVHJhbnNsYXRvciA9IHJlcXVpcmUoJy4uL2NvcmUvVHJhbnNsYXRvcicpXG5jb25zdCBVcHB5U29ja2V0ID0gcmVxdWlyZSgnLi4vY29yZS9VcHB5U29ja2V0JylcbmNvbnN0IHtcbiAgZW1pdFNvY2tldFByb2dyZXNzLFxuICBnZXRTb2NrZXRIb3N0LFxuICBzZXR0bGUsXG4gIGxpbWl0UHJvbWlzZXNcbn0gPSByZXF1aXJlKCcuLi9jb3JlL1V0aWxzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBYSFJVcGxvYWQgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAodXBweSwgb3B0cykge1xuICAgIHN1cGVyKHVwcHksIG9wdHMpXG4gICAgdGhpcy50eXBlID0gJ3VwbG9hZGVyJ1xuICAgIHRoaXMuaWQgPSAnWEhSVXBsb2FkJ1xuICAgIHRoaXMudGl0bGUgPSAnWEhSVXBsb2FkJ1xuXG4gICAgY29uc3QgZGVmYXVsdExvY2FsZSA9IHtcbiAgICAgIHN0cmluZ3M6IHtcbiAgICAgICAgdGltZWRPdXQ6ICdVcGxvYWQgc3RhbGxlZCBmb3IgJXtzZWNvbmRzfSBzZWNvbmRzLCBhYm9ydGluZy4nXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICBmb3JtRGF0YTogdHJ1ZSxcbiAgICAgIGZpZWxkTmFtZTogJ2ZpbGVzW10nLFxuICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICBtZXRhRmllbGRzOiBudWxsLFxuICAgICAgcmVzcG9uc2VVcmxGaWVsZE5hbWU6ICd1cmwnLFxuICAgICAgYnVuZGxlOiBmYWxzZSxcbiAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgbG9jYWxlOiBkZWZhdWx0TG9jYWxlLFxuICAgICAgdGltZW91dDogMzAgKiAxMDAwLFxuICAgICAgbGltaXQ6IDAsXG4gICAgICAvKipcbiAgICAgICAqIEB0eXBlZGVmIHJlc3BPYmpcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSByZXNwb25zZVRleHRcbiAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzdGF0dXNcbiAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzdGF0dXNUZXh0XG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCBzdHJpbmc+fSBoZWFkZXJzXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlQ29udGVudCB0aGUgcmVzcG9uc2UgYm9keVxuICAgICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdCB8IHJlc3BPYmp9IHJlc3BvbnNlT2JqZWN0IHRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgICAqL1xuICAgICAgZ2V0UmVzcG9uc2VEYXRhIChyZXNwb25zZUNvbnRlbnQsIHJlc3BvbnNlT2JqZWN0KSB7XG4gICAgICAgIGxldCByZXNwb25zZSA9IHt9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHJlc3BvbnNlQ29udGVudClcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGhpcy51cHB5LmxvZyhlcnIsICdlcnJvcicpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzcG9uc2VcbiAgICAgIH0sXG4gICAgICAvKipcbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2VDb250ZW50IHRoZSByZXNwb25zZSBib2R5XG4gICAgICAgKiBAcGFyYW0ge1hNTEh0dHBSZXF1ZXN0IHwgcmVzcE9ian0gcmVzcG9uc2VPYmplY3QgdGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAgICovXG4gICAgICBnZXRSZXNwb25zZUVycm9yIChyZXNwb25zZUNvbnRlbnQsIHJlc3BvbnNlT2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ1VwbG9hZCBlcnJvcicpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcbiAgICB0aGlzLmxvY2FsZSA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUsIHRoaXMub3B0cy5sb2NhbGUpXG4gICAgdGhpcy5sb2NhbGUuc3RyaW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRMb2NhbGUuc3RyaW5ncywgdGhpcy5vcHRzLmxvY2FsZS5zdHJpbmdzKVxuXG4gICAgLy8gaTE4blxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHsgbG9jYWxlOiB0aGlzLmxvY2FsZSB9KVxuICAgIHRoaXMuaTE4biA9IHRoaXMudHJhbnNsYXRvci50cmFuc2xhdGUuYmluZCh0aGlzLnRyYW5zbGF0b3IpXG5cbiAgICB0aGlzLmhhbmRsZVVwbG9hZCA9IHRoaXMuaGFuZGxlVXBsb2FkLmJpbmQodGhpcylcblxuICAgIC8vIFNpbXVsdGFuZW91cyB1cGxvYWQgbGltaXRpbmcgaXMgc2hhcmVkIGFjcm9zcyBhbGwgdXBsb2FkcyB3aXRoIHRoaXMgcGx1Z2luLlxuICAgIGlmICh0eXBlb2YgdGhpcy5vcHRzLmxpbWl0ID09PSAnbnVtYmVyJyAmJiB0aGlzLm9wdHMubGltaXQgIT09IDApIHtcbiAgICAgIHRoaXMubGltaXRVcGxvYWRzID0gbGltaXRQcm9taXNlcyh0aGlzLm9wdHMubGltaXQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGltaXRVcGxvYWRzID0gKGZuKSA9PiBmblxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdHMuYnVuZGxlICYmICF0aGlzLm9wdHMuZm9ybURhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYG9wdHMuZm9ybURhdGFgIG11c3QgYmUgdHJ1ZSB3aGVuIGBvcHRzLmJ1bmRsZWAgaXMgZW5hYmxlZC4nKVxuICAgIH1cbiAgfVxuXG4gIGdldE9wdGlvbnMgKGZpbGUpIHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSxcbiAgICAgIHRoaXMub3B0cyxcbiAgICAgIHRoaXMudXBweS5zdGF0ZS54aHJVcGxvYWQgfHwge30sXG4gICAgICBmaWxlLnhoclVwbG9hZCB8fCB7fVxuICAgIClcbiAgICBvcHRzLmhlYWRlcnMgPSB7fVxuICAgIE9iamVjdC5hc3NpZ24ob3B0cy5oZWFkZXJzLCB0aGlzLm9wdHMuaGVhZGVycylcbiAgICBpZiAodGhpcy51cHB5LnN0YXRlLnhoclVwbG9hZCkge1xuICAgICAgT2JqZWN0LmFzc2lnbihvcHRzLmhlYWRlcnMsIHRoaXMudXBweS5zdGF0ZS54aHJVcGxvYWQuaGVhZGVycylcbiAgICB9XG4gICAgaWYgKGZpbGUueGhyVXBsb2FkKSB7XG4gICAgICBPYmplY3QuYXNzaWduKG9wdHMuaGVhZGVycywgZmlsZS54aHJVcGxvYWQuaGVhZGVycylcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0c1xuICB9XG5cbiAgLy8gSGVscGVyIHRvIGFib3J0IHVwbG9hZCByZXF1ZXN0cyBpZiB0aGVyZSBoYXMgbm90IGJlZW4gYW55IHByb2dyZXNzIGZvciBgdGltZW91dGAgbXMuXG4gIC8vIENyZWF0ZSBhbiBpbnN0YW5jZSB1c2luZyBgdGltZXIgPSBjcmVhdGVQcm9ncmVzc1RpbWVvdXQoMTAwMDAsIG9uVGltZW91dClgXG4gIC8vIENhbGwgYHRpbWVyLnByb2dyZXNzKClgIHRvIHNpZ25hbCB0aGF0IHRoZXJlIGhhcyBiZWVuIHByb2dyZXNzIG9mIGFueSBraW5kLlxuICAvLyBDYWxsIGB0aW1lci5kb25lKClgIHdoZW4gdGhlIHVwbG9hZCBoYXMgY29tcGxldGVkLlxuICBjcmVhdGVQcm9ncmVzc1RpbWVvdXQgKHRpbWVvdXQsIHRpbWVvdXRIYW5kbGVyKSB7XG4gICAgY29uc3QgdXBweSA9IHRoaXMudXBweVxuICAgIGNvbnN0IHNlbGYgPSB0aGlzXG4gICAgZnVuY3Rpb24gb25UaW1lZE91dCAoKSB7XG4gICAgICB1cHB5LmxvZyhgW1hIUlVwbG9hZF0gdGltZWQgb3V0YClcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKHNlbGYuaTE4bigndGltZWRPdXQnLCB7IHNlY29uZHM6IE1hdGguY2VpbCh0aW1lb3V0IC8gMTAwMCkgfSkpXG4gICAgICB0aW1lb3V0SGFuZGxlcihlcnJvcilcbiAgICB9XG5cbiAgICBsZXQgYWxpdmVUaW1lciA9IG51bGxcbiAgICBmdW5jdGlvbiBwcm9ncmVzcyAoKSB7XG4gICAgICBpZiAodGltZW91dCA+IDApIHtcbiAgICAgICAgZG9uZSgpXG4gICAgICAgIGFsaXZlVGltZXIgPSBzZXRUaW1lb3V0KG9uVGltZWRPdXQsIHRpbWVvdXQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZG9uZSAoKSB7XG4gICAgICBpZiAoYWxpdmVUaW1lcikge1xuICAgICAgICBjbGVhclRpbWVvdXQoYWxpdmVUaW1lcilcbiAgICAgICAgYWxpdmVUaW1lciA9IG51bGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvZ3Jlc3MsXG4gICAgICBkb25lXG4gICAgfVxuICB9XG5cbiAgY3JlYXRlRm9ybURhdGFVcGxvYWQgKGZpbGUsIG9wdHMpIHtcbiAgICBjb25zdCBmb3JtUG9zdCA9IG5ldyBGb3JtRGF0YSgpXG5cbiAgICBjb25zdCBtZXRhRmllbGRzID0gQXJyYXkuaXNBcnJheShvcHRzLm1ldGFGaWVsZHMpXG4gICAgICA/IG9wdHMubWV0YUZpZWxkc1xuICAgICAgLy8gU2VuZCBhbG9uZyBhbGwgZmllbGRzIGJ5IGRlZmF1bHQuXG4gICAgICA6IE9iamVjdC5rZXlzKGZpbGUubWV0YSlcbiAgICBtZXRhRmllbGRzLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIGZvcm1Qb3N0LmFwcGVuZChpdGVtLCBmaWxlLm1ldGFbaXRlbV0pXG4gICAgfSlcblxuICAgIGZvcm1Qb3N0LmFwcGVuZChvcHRzLmZpZWxkTmFtZSwgZmlsZS5kYXRhKVxuXG4gICAgcmV0dXJuIGZvcm1Qb3N0XG4gIH1cblxuICBjcmVhdGVCYXJlVXBsb2FkIChmaWxlLCBvcHRzKSB7XG4gICAgcmV0dXJuIGZpbGUuZGF0YVxuICB9XG5cbiAgdXBsb2FkIChmaWxlLCBjdXJyZW50LCB0b3RhbCkge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmdldE9wdGlvbnMoZmlsZSlcblxuICAgIHRoaXMudXBweS5sb2coYHVwbG9hZGluZyAke2N1cnJlbnR9IG9mICR7dG90YWx9YClcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IG9wdHMuZm9ybURhdGFcbiAgICAgICAgPyB0aGlzLmNyZWF0ZUZvcm1EYXRhVXBsb2FkKGZpbGUsIG9wdHMpXG4gICAgICAgIDogdGhpcy5jcmVhdGVCYXJlVXBsb2FkKGZpbGUsIG9wdHMpXG5cbiAgICAgIGNvbnN0IHRpbWVyID0gdGhpcy5jcmVhdGVQcm9ncmVzc1RpbWVvdXQob3B0cy50aW1lb3V0LCAoZXJyb3IpID0+IHtcbiAgICAgICAgeGhyLmFib3J0KClcbiAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1lcnJvcicsIGZpbGUuaWQsIGVycm9yKVxuICAgICAgICByZWplY3QoZXJyb3IpXG4gICAgICB9KVxuXG4gICAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgY29uc3QgaWQgPSBjdWlkKClcblxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdsb2Fkc3RhcnQnLCAoZXYpID0+IHtcbiAgICAgICAgdGhpcy51cHB5LmxvZyhgW1hIUlVwbG9hZF0gJHtpZH0gc3RhcnRlZGApXG4gICAgICAgIC8vIEJlZ2luIGNoZWNraW5nIGZvciB0aW1lb3V0cyB3aGVuIGxvYWRpbmcgc3RhcnRzLlxuICAgICAgICB0aW1lci5wcm9ncmVzcygpXG4gICAgICB9KVxuXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coYFtYSFJVcGxvYWRdICR7aWR9IHByb2dyZXNzOiAke2V2LmxvYWRlZH0gLyAke2V2LnRvdGFsfWApXG4gICAgICAgIHRpbWVyLnByb2dyZXNzKClcblxuICAgICAgICBpZiAoZXYubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICB1cGxvYWRlcjogdGhpcyxcbiAgICAgICAgICAgIGlkOiBmaWxlLmlkLFxuICAgICAgICAgICAgYnl0ZXNVcGxvYWRlZDogZXYubG9hZGVkLFxuICAgICAgICAgICAgYnl0ZXNUb3RhbDogZXYudG90YWxcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB4aHIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKGBbWEhSVXBsb2FkXSAke2lkfSBmaW5pc2hlZGApXG4gICAgICAgIHRpbWVyLmRvbmUoKVxuXG4gICAgICAgIGlmIChldi50YXJnZXQuc3RhdHVzID49IDIwMCAmJiBldi50YXJnZXQuc3RhdHVzIDwgMzAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzcCA9IG9wdHMuZ2V0UmVzcG9uc2VEYXRhKHhoci5yZXNwb25zZVRleHQsIHhocilcbiAgICAgICAgICBjb25zdCB1cGxvYWRVUkwgPSByZXNwW29wdHMucmVzcG9uc2VVcmxGaWVsZE5hbWVdXG5cbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlLmlkLCByZXNwLCB1cGxvYWRVUkwpXG5cbiAgICAgICAgICBpZiAodXBsb2FkVVJMKSB7XG4gICAgICAgICAgICB0aGlzLnVwcHkubG9nKGBEb3dubG9hZCAke2ZpbGUubmFtZX0gZnJvbSAke2ZpbGUudXBsb2FkVVJMfWApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoZmlsZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBlcnJvciA9IG9wdHMuZ2V0UmVzcG9uc2VFcnJvcih4aHIucmVzcG9uc2VUZXh0LCB4aHIpIHx8IG5ldyBFcnJvcignVXBsb2FkIGVycm9yJylcbiAgICAgICAgICBlcnJvci5yZXF1ZXN0ID0geGhyXG4gICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1lcnJvcicsIGZpbGUuaWQsIGVycm9yKVxuICAgICAgICAgIHJldHVybiByZWplY3QoZXJyb3IpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIChldikgPT4ge1xuICAgICAgICB0aGlzLnVwcHkubG9nKGBbWEhSVXBsb2FkXSAke2lkfSBlcnJvcmVkYClcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgY29uc3QgZXJyb3IgPSBvcHRzLmdldFJlc3BvbnNlRXJyb3IoeGhyLnJlc3BvbnNlVGV4dCwgeGhyKSB8fCBuZXcgRXJyb3IoJ1VwbG9hZCBlcnJvcicpXG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtZXJyb3InLCBmaWxlLmlkLCBlcnJvcilcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgIH0pXG5cbiAgICAgIHhoci5vcGVuKG9wdHMubWV0aG9kLnRvVXBwZXJDYXNlKCksIG9wdHMuZW5kcG9pbnQsIHRydWUpXG5cbiAgICAgIE9iamVjdC5rZXlzKG9wdHMuaGVhZGVycykuZm9yRWFjaCgoaGVhZGVyKSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgb3B0cy5oZWFkZXJzW2hlYWRlcl0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZChkYXRhKVxuXG4gICAgICB0aGlzLnVwcHkub24oJ3VwbG9hZC1jYW5jZWwnLCAoZmlsZUlEKSA9PiB7XG4gICAgICAgIGlmIChmaWxlSUQgPT09IGZpbGUuaWQpIHtcbiAgICAgICAgICB4aHIuYWJvcnQoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICB0aGlzLnVwcHkub24oJ2NhbmNlbC1hbGwnLCAoKSA9PiB7XG4gICAgICAgIC8vIGNvbnN0IGZpbGVzID0gdGhpcy51cHB5LmdldFN0YXRlKCkuZmlsZXNcbiAgICAgICAgLy8gaWYgKCFmaWxlc1tmaWxlLmlkXSkgcmV0dXJuXG4gICAgICAgIHhoci5hYm9ydCgpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICB1cGxvYWRSZW1vdGUgKGZpbGUsIGN1cnJlbnQsIHRvdGFsKSB7XG4gICAgY29uc3Qgb3B0cyA9IHRoaXMuZ2V0T3B0aW9ucyhmaWxlKVxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBmaWVsZHMgPSB7fVxuICAgICAgY29uc3QgbWV0YUZpZWxkcyA9IEFycmF5LmlzQXJyYXkob3B0cy5tZXRhRmllbGRzKVxuICAgICAgICA/IG9wdHMubWV0YUZpZWxkc1xuICAgICAgICAvLyBTZW5kIGFsb25nIGFsbCBmaWVsZHMgYnkgZGVmYXVsdC5cbiAgICAgICAgOiBPYmplY3Qua2V5cyhmaWxlLm1ldGEpXG5cbiAgICAgIG1ldGFGaWVsZHMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICBmaWVsZHNbbmFtZV0gPSBmaWxlLm1ldGFbbmFtZV1cbiAgICAgIH0pXG5cbiAgICAgIGZldGNoKGZpbGUucmVtb3RlLnVybCwge1xuICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgY3JlZGVudGlhbHM6ICdpbmNsdWRlJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShPYmplY3QuYXNzaWduKHt9LCBmaWxlLnJlbW90ZS5ib2R5LCB7XG4gICAgICAgICAgZW5kcG9pbnQ6IG9wdHMuZW5kcG9pbnQsXG4gICAgICAgICAgc2l6ZTogZmlsZS5kYXRhLnNpemUsXG4gICAgICAgICAgZmllbGRuYW1lOiBvcHRzLmZpZWxkTmFtZSxcbiAgICAgICAgICBtZXRhZGF0YTogZmllbGRzLFxuICAgICAgICAgIGhlYWRlcnM6IG9wdHMuaGVhZGVyc1xuICAgICAgICB9KSlcbiAgICAgIH0pXG4gICAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGlmIChyZXMuc3RhdHVzIDwgMjAwICYmIHJlcy5zdGF0dXMgPiAzMDApIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KHJlcy5zdGF0dXNUZXh0KVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzLmpzb24oKS50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgY29uc3QgdG9rZW4gPSBkYXRhLnRva2VuXG4gICAgICAgICAgY29uc3QgaG9zdCA9IGdldFNvY2tldEhvc3QoZmlsZS5yZW1vdGUuaG9zdClcbiAgICAgICAgICBjb25zdCBzb2NrZXQgPSBuZXcgVXBweVNvY2tldCh7IHRhcmdldDogYCR7aG9zdH0vYXBpLyR7dG9rZW59YCB9KVxuXG4gICAgICAgICAgc29ja2V0Lm9uKCdwcm9ncmVzcycsIChwcm9ncmVzc0RhdGEpID0+IGVtaXRTb2NrZXRQcm9ncmVzcyh0aGlzLCBwcm9ncmVzc0RhdGEsIGZpbGUpKVxuXG4gICAgICAgICAgc29ja2V0Lm9uKCdzdWNjZXNzJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBvcHRzLmdldFJlc3BvbnNlRGF0YShkYXRhLnJlc3BvbnNlLnJlc3BvbnNlVGV4dCwgZGF0YS5yZXNwb25zZSlcbiAgICAgICAgICAgIGNvbnN0IHVwbG9hZFVSTCA9IHJlc3Bbb3B0cy5yZXNwb25zZVVybEZpZWxkTmFtZV1cbiAgICAgICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3VjY2VzcycsIGZpbGUuaWQsIHJlc3AsIHVwbG9hZFVSTClcbiAgICAgICAgICAgIHNvY2tldC5jbG9zZSgpXG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIHNvY2tldC5vbignZXJyb3InLCAoZXJyRGF0YSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGVyckRhdGEucmVzcG9uc2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gcmVzcCA/IG9wdHMuZ2V0UmVzcG9uc2VFcnJvcihyZXNwLnJlc3BvbnNlVGV4dCwgcmVzcCkgOiBuZXcgRXJyb3IoZXJyRGF0YS5lcnJvcilcbiAgICAgICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtZXJyb3InLCBmaWxlLmlkLCBlcnJvcilcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXJyRGF0YS5lcnJvcikpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHVwbG9hZEJ1bmRsZSAoZmlsZXMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZW5kcG9pbnQgPSB0aGlzLm9wdHMuZW5kcG9pbnRcbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRoaXMub3B0cy5tZXRob2RcblxuICAgICAgY29uc3QgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKVxuICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSwgaSkgPT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gdGhpcy5nZXRPcHRpb25zKGZpbGUpXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZChvcHRzLmZpZWxkTmFtZSwgZmlsZS5kYXRhKVxuICAgICAgfSlcblxuICAgICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgY29uc3QgdGltZXIgPSB0aGlzLmNyZWF0ZVByb2dyZXNzVGltZW91dCh0aGlzLm9wdHMudGltZW91dCwgKGVycm9yKSA9PiB7XG4gICAgICAgIHhoci5hYm9ydCgpXG4gICAgICAgIGVtaXRFcnJvcihlcnJvcilcbiAgICAgICAgcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgY29uc3QgZW1pdEVycm9yID0gKGVycm9yKSA9PiB7XG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLWVycm9yJywgZmlsZS5pZCwgZXJyb3IpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZHN0YXJ0JywgKGV2KSA9PiB7XG4gICAgICAgIHRoaXMudXBweS5sb2coJ1tYSFJVcGxvYWRdIHN0YXJ0ZWQgdXBsb2FkaW5nIGJ1bmRsZScpXG4gICAgICAgIHRpbWVyLnByb2dyZXNzKClcbiAgICAgIH0pXG5cbiAgICAgIHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXYpID0+IHtcbiAgICAgICAgdGltZXIucHJvZ3Jlc3MoKVxuXG4gICAgICAgIGlmICghZXYubGVuZ3RoQ29tcHV0YWJsZSkgcmV0dXJuXG5cbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtcHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgICB1cGxvYWRlcjogdGhpcyxcbiAgICAgICAgICAgIGlkOiBmaWxlLmlkLFxuICAgICAgICAgICAgYnl0ZXNVcGxvYWRlZDogZXYubG9hZGVkLFxuICAgICAgICAgICAgYnl0ZXNUb3RhbDogZXYudG90YWxcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXYpID0+IHtcbiAgICAgICAgdGltZXIuZG9uZSgpXG5cbiAgICAgICAgaWYgKGV2LnRhcmdldC5zdGF0dXMgPj0gMjAwICYmIGV2LnRhcmdldC5zdGF0dXMgPCAzMDApIHtcbiAgICAgICAgICBjb25zdCByZXNwID0gdGhpcy5vcHRzLmdldFJlc3BvbnNlRGF0YSh4aHIucmVzcG9uc2VUZXh0LCB4aHIpXG4gICAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cHB5LmVtaXQoJ3VwbG9hZC1zdWNjZXNzJywgZmlsZS5pZCwgcmVzcClcbiAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiByZXNvbHZlKClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVycm9yID0gdGhpcy5vcHRzLmdldFJlc3BvbnNlRXJyb3IoeGhyLnJlc3BvbnNlVGV4dCwgeGhyKSB8fCBuZXcgRXJyb3IoJ1VwbG9hZCBlcnJvcicpXG4gICAgICAgIGVycm9yLnJlcXVlc3QgPSB4aHJcbiAgICAgICAgZW1pdEVycm9yKGVycm9yKVxuICAgICAgICByZXR1cm4gcmVqZWN0KGVycm9yKVxuICAgICAgfSlcblxuICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGV2KSA9PiB7XG4gICAgICAgIHRpbWVyLmRvbmUoKVxuXG4gICAgICAgIGNvbnN0IGVycm9yID0gdGhpcy5vcHRzLmdldFJlc3BvbnNlRXJyb3IoeGhyLnJlc3BvbnNlVGV4dCwgeGhyKSB8fCBuZXcgRXJyb3IoJ1VwbG9hZCBlcnJvcicpXG4gICAgICAgIGVtaXRFcnJvcihlcnJvcilcbiAgICAgICAgcmV0dXJuIHJlamVjdChlcnJvcilcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMudXBweS5vbignY2FuY2VsLWFsbCcsICgpID0+IHtcbiAgICAgICAgeGhyLmFib3J0KClcbiAgICAgIH0pXG5cbiAgICAgIHhoci5vcGVuKG1ldGhvZC50b1VwcGVyQ2FzZSgpLCBlbmRwb2ludCwgdHJ1ZSlcblxuICAgICAgT2JqZWN0LmtleXModGhpcy5vcHRzLmhlYWRlcnMpLmZvckVhY2goKGhlYWRlcikgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIHRoaXMub3B0cy5oZWFkZXJzW2hlYWRlcl0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZChmb3JtRGF0YSlcblxuICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN0YXJ0ZWQnLCBmaWxlLmlkKVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgdXBsb2FkRmlsZXMgKGZpbGVzKSB7XG4gICAgY29uc3QgYWN0aW9ucyA9IGZpbGVzLm1hcCgoZmlsZSwgaSkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHBhcnNlSW50KGksIDEwKSArIDFcbiAgICAgIGNvbnN0IHRvdGFsID0gZmlsZXMubGVuZ3RoXG5cbiAgICAgIGlmIChmaWxlLmVycm9yKSB7XG4gICAgICAgIHJldHVybiAoKSA9PiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZmlsZS5lcnJvcikpXG4gICAgICB9IGVsc2UgaWYgKGZpbGUuaXNSZW1vdGUpIHtcbiAgICAgICAgLy8gV2UgZW1pdCB1cGxvYWQtc3RhcnRlZCBoZXJlLCBzbyB0aGF0IGl0J3MgYWxzbyBlbWl0dGVkIGZvciBmaWxlc1xuICAgICAgICAvLyB0aGF0IGhhdmUgdG8gd2FpdCBkdWUgdG8gdGhlIGBsaW1pdGAgb3B0aW9uLlxuICAgICAgICB0aGlzLnVwcHkuZW1pdCgndXBsb2FkLXN0YXJ0ZWQnLCBmaWxlLmlkKVxuICAgICAgICByZXR1cm4gdGhpcy51cGxvYWRSZW1vdGUuYmluZCh0aGlzLCBmaWxlLCBjdXJyZW50LCB0b3RhbClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBweS5lbWl0KCd1cGxvYWQtc3RhcnRlZCcsIGZpbGUuaWQpXG4gICAgICAgIHJldHVybiB0aGlzLnVwbG9hZC5iaW5kKHRoaXMsIGZpbGUsIGN1cnJlbnQsIHRvdGFsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9taXNlcyA9IGFjdGlvbnMubWFwKChhY3Rpb24pID0+IHtcbiAgICAgIGNvbnN0IGxpbWl0ZWRBY3Rpb24gPSB0aGlzLmxpbWl0VXBsb2FkcyhhY3Rpb24pXG4gICAgICByZXR1cm4gbGltaXRlZEFjdGlvbigpXG4gICAgfSlcblxuICAgIHJldHVybiBzZXR0bGUocHJvbWlzZXMpXG4gIH1cblxuICBoYW5kbGVVcGxvYWQgKGZpbGVJRHMpIHtcbiAgICBpZiAoZmlsZUlEcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMudXBweS5sb2coJ1tYSFJVcGxvYWRdIE5vIGZpbGVzIHRvIHVwbG9hZCEnKVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgdGhpcy51cHB5LmxvZygnW1hIUlVwbG9hZF0gVXBsb2FkaW5nLi4uJylcbiAgICBjb25zdCBmaWxlcyA9IGZpbGVJRHMubWFwKChmaWxlSUQpID0+IHRoaXMudXBweS5nZXRGaWxlKGZpbGVJRCkpXG5cbiAgICBpZiAodGhpcy5vcHRzLmJ1bmRsZSkge1xuICAgICAgcmV0dXJuIHRoaXMudXBsb2FkQnVuZGxlKGZpbGVzKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwbG9hZEZpbGVzKGZpbGVzKS50aGVuKCgpID0+IG51bGwpXG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICB0aGlzLnVwcHkuYWRkVXBsb2FkZXIodGhpcy5oYW5kbGVVcGxvYWQpXG4gIH1cblxuICB1bmluc3RhbGwgKCkge1xuICAgIHRoaXMudXBweS5yZW1vdmVVcGxvYWRlcih0aGlzLmhhbmRsZVVwbG9hZClcbiAgfVxufVxuIiwiLyoqXG4gKiBEZWZhdWx0IHN0b3JlIHRoYXQga2VlcHMgc3RhdGUgaW4gYSBzaW1wbGUgb2JqZWN0LlxuICovXG5jbGFzcyBEZWZhdWx0U3RvcmUge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHt9XG4gICAgdGhpcy5jYWxsYmFja3MgPSBbXVxuICB9XG5cbiAgZ2V0U3RhdGUgKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlXG4gIH1cblxuICBzZXRTdGF0ZSAocGF0Y2gpIHtcbiAgICBjb25zdCBwcmV2U3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlKVxuICAgIGNvbnN0IG5leHRTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUsIHBhdGNoKVxuXG4gICAgdGhpcy5zdGF0ZSA9IG5leHRTdGF0ZVxuICAgIHRoaXMuX3B1Ymxpc2gocHJldlN0YXRlLCBuZXh0U3RhdGUsIHBhdGNoKVxuICB9XG5cbiAgc3Vic2NyaWJlIChsaXN0ZW5lcikge1xuICAgIHRoaXMuY2FsbGJhY2tzLnB1c2gobGlzdGVuZXIpXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIC8vIFJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAgICB0aGlzLmNhbGxiYWNrcy5zcGxpY2UoXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzLmluZGV4T2YobGlzdGVuZXIpLFxuICAgICAgICAxXG4gICAgICApXG4gICAgfVxuICB9XG5cbiAgX3B1Ymxpc2ggKC4uLmFyZ3MpIHtcbiAgICB0aGlzLmNhbGxiYWNrcy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuICAgICAgbGlzdGVuZXIoLi4uYXJncylcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVmYXVsdFN0b3JlICgpIHtcbiAgcmV0dXJuIG5ldyBEZWZhdWx0U3RvcmUoKVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlucHV0ID0+IHtcblx0Y29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkoaW5wdXQpO1xuXG5cdGlmICghKGJ1ZiAmJiBidWYubGVuZ3RoID4gMSkpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGNvbnN0IGNoZWNrID0gKGhlYWRlciwgb3B0cykgPT4ge1xuXHRcdG9wdHMgPSBPYmplY3QuYXNzaWduKHtcblx0XHRcdG9mZnNldDogMFxuXHRcdH0sIG9wdHMpO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBoZWFkZXIubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmIChoZWFkZXJbaV0gIT09IGJ1ZltpICsgb3B0cy5vZmZzZXRdKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXHRpZiAoY2hlY2soWzB4RkYsIDB4RDgsIDB4RkZdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdqcGcnLFxuXHRcdFx0bWltZTogJ2ltYWdlL2pwZWcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg4OSwgMHg1MCwgMHg0RSwgMHg0NywgMHgwRCwgMHgwQSwgMHgxQSwgMHgwQV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BuZycsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvcG5nJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDcsIDB4NDksIDB4NDZdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdnaWYnLFxuXHRcdFx0bWltZTogJ2ltYWdlL2dpZidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDU3LCAweDQ1LCAweDQyLCAweDUwXSwge29mZnNldDogOH0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3dlYnAnLFxuXHRcdFx0bWltZTogJ2ltYWdlL3dlYnAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0NiwgMHg0QywgMHg0OSwgMHg0Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2ZsaWYnLFxuXHRcdFx0bWltZTogJ2ltYWdlL2ZsaWYnXG5cdFx0fTtcblx0fVxuXG5cdC8vIE5lZWRzIHRvIGJlIGJlZm9yZSBgdGlmYCBjaGVja1xuXHRpZiAoXG5cdFx0KGNoZWNrKFsweDQ5LCAweDQ5LCAweDJBLCAweDBdKSB8fCBjaGVjayhbMHg0RCwgMHg0RCwgMHgwLCAweDJBXSkpICYmXG5cdFx0Y2hlY2soWzB4NDMsIDB4NTJdLCB7b2Zmc2V0OiA4fSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2NyMicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UveC1jYW5vbi1jcjInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg0OSwgMHg0OSwgMHgyQSwgMHgwXSkgfHxcblx0XHRjaGVjayhbMHg0RCwgMHg0RCwgMHgwLCAweDJBXSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3RpZicsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvdGlmZidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQyLCAweDREXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYm1wJyxcblx0XHRcdG1pbWU6ICdpbWFnZS9ibXAnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0OSwgMHg0OSwgMHhCQ10pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2p4cicsXG5cdFx0XHRtaW1lOiAnaW1hZ2Uvdm5kLm1zLXBob3RvJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MzgsIDB4NDIsIDB4NTAsIDB4NTNdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdwc2QnLFxuXHRcdFx0bWltZTogJ2ltYWdlL3ZuZC5hZG9iZS5waG90b3Nob3AnXG5cdFx0fTtcblx0fVxuXG5cdC8vIE5lZWRzIHRvIGJlIGJlZm9yZSB0aGUgYHppcGAgY2hlY2tcblx0aWYgKFxuXHRcdGNoZWNrKFsweDUwLCAweDRCLCAweDMsIDB4NF0pICYmXG5cdFx0Y2hlY2soWzB4NkQsIDB4NjksIDB4NkQsIDB4NjUsIDB4NzQsIDB4NzksIDB4NzAsIDB4NjUsIDB4NjEsIDB4NzAsIDB4NzAsIDB4NkMsIDB4NjksIDB4NjMsIDB4NjEsIDB4NzQsIDB4NjksIDB4NkYsIDB4NkUsIDB4MkYsIDB4NjUsIDB4NzAsIDB4NzUsIDB4NjIsIDB4MkIsIDB4N0EsIDB4NjksIDB4NzBdLCB7b2Zmc2V0OiAzMH0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdlcHViJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9lcHViK3ppcCdcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIGB6aXBgIGNoZWNrXG5cdC8vIEFzc3VtZXMgc2lnbmVkIGAueHBpYCBmcm9tIGFkZG9ucy5tb3ppbGxhLm9yZ1xuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTAsIDB4NEIsIDB4MywgMHg0XSkgJiZcblx0XHRjaGVjayhbMHg0RCwgMHg0NSwgMHg1NCwgMHg0MSwgMHgyRCwgMHg0OSwgMHg0RSwgMHg0NiwgMHgyRiwgMHg2RCwgMHg2RiwgMHg3QSwgMHg2OSwgMHg2QywgMHg2QywgMHg2MSwgMHgyRSwgMHg3MiwgMHg3MywgMHg2MV0sIHtvZmZzZXQ6IDMwfSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3hwaScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC14cGluc3RhbGwnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MCwgMHg0Ql0pICYmXG5cdFx0KGJ1ZlsyXSA9PT0gMHgzIHx8IGJ1ZlsyXSA9PT0gMHg1IHx8IGJ1ZlsyXSA9PT0gMHg3KSAmJlxuXHRcdChidWZbM10gPT09IDB4NCB8fCBidWZbM10gPT09IDB4NiB8fCBidWZbM10gPT09IDB4OClcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3ppcCcsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vemlwJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NzUsIDB4NzMsIDB4NzQsIDB4NjEsIDB4NzJdLCB7b2Zmc2V0OiAyNTd9KSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd0YXInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtdGFyJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NTIsIDB4NjEsIDB4NzIsIDB4MjEsIDB4MUEsIDB4N10pICYmXG5cdFx0KGJ1Zls2XSA9PT0gMHgwIHx8IGJ1Zls2XSA9PT0gMHgxKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAncmFyJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXJhci1jb21wcmVzc2VkJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MUYsIDB4OEIsIDB4OF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2d6Jyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9nemlwJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDIsIDB4NUEsIDB4NjhdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdiejInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYnppcDInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgzNywgMHg3QSwgMHhCQywgMHhBRiwgMHgyNywgMHgxQ10pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJzd6Jyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LTd6LWNvbXByZXNzZWQnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg3OCwgMHgwMV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2RtZycsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1hcHBsZS1kaXNraW1hZ2UnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwLCAweDAsIDB4MF0pICYmXG5cdFx0XHQoYnVmWzNdID09PSAweDE4IHx8IGJ1ZlszXSA9PT0gMHgyMCkgJiZcblx0XHRcdGNoZWNrKFsweDY2LCAweDc0LCAweDc5LCAweDcwXSwge29mZnNldDogNH0pXG5cdFx0KSB8fFxuXHRcdGNoZWNrKFsweDMzLCAweDY3LCAweDcwLCAweDM1XSkgfHxcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwLCAweDAsIDB4MCwgMHgxQywgMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg2RCwgMHg3MCwgMHgzNCwgMHgzMl0pICYmXG5cdFx0XHRjaGVjayhbMHg2RCwgMHg3MCwgMHgzNCwgMHgzMSwgMHg2RCwgMHg3MCwgMHgzNCwgMHgzMiwgMHg2OSwgMHg3MywgMHg2RiwgMHg2RF0sIHtvZmZzZXQ6IDE2fSlcblx0XHQpIHx8XG5cdFx0Y2hlY2soWzB4MCwgMHgwLCAweDAsIDB4MUMsIDB4NjYsIDB4NzQsIDB4NzksIDB4NzAsIDB4NjksIDB4NzMsIDB4NkYsIDB4NkRdKSB8fFxuXHRcdGNoZWNrKFsweDAsIDB4MCwgMHgwLCAweDFDLCAweDY2LCAweDc0LCAweDc5LCAweDcwLCAweDZELCAweDcwLCAweDM0LCAweDMyLCAweDAsIDB4MCwgMHgwLCAweDBdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbXA0Jyxcblx0XHRcdG1pbWU6ICd2aWRlby9tcDQnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgwLCAweDAsIDB4MCwgMHgxQywgMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg0RCwgMHgzNCwgMHg1Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ200dicsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1tNHYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RCwgMHg1NCwgMHg2OCwgMHg2NF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ21pZCcsXG5cdFx0XHRtaW1lOiAnYXVkaW8vbWlkaSdcblx0XHR9O1xuXHR9XG5cblx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL3RocmVhdHN0YWNrL2xpYm1hZ2ljL2Jsb2IvbWFzdGVyL21hZ2ljL01hZ2Rpci9tYXRyb3NrYVxuXHRpZiAoY2hlY2soWzB4MUEsIDB4NDUsIDB4REYsIDB4QTNdKSkge1xuXHRcdGNvbnN0IHNsaWNlZCA9IGJ1Zi5zdWJhcnJheSg0LCA0ICsgNDA5Nik7XG5cdFx0Y29uc3QgaWRQb3MgPSBzbGljZWQuZmluZEluZGV4KChlbCwgaSwgYXJyKSA9PiBhcnJbaV0gPT09IDB4NDIgJiYgYXJyW2kgKyAxXSA9PT0gMHg4Mik7XG5cblx0XHRpZiAoaWRQb3MgPj0gMCkge1xuXHRcdFx0Y29uc3QgZG9jVHlwZVBvcyA9IGlkUG9zICsgMztcblx0XHRcdGNvbnN0IGZpbmREb2NUeXBlID0gdHlwZSA9PiBBcnJheS5mcm9tKHR5cGUpLmV2ZXJ5KChjLCBpKSA9PiBzbGljZWRbZG9jVHlwZVBvcyArIGldID09PSBjLmNoYXJDb2RlQXQoMCkpO1xuXG5cdFx0XHRpZiAoZmluZERvY1R5cGUoJ21hdHJvc2thJykpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdta3YnLFxuXHRcdFx0XHRcdG1pbWU6ICd2aWRlby94LW1hdHJvc2thJ1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZmluZERvY1R5cGUoJ3dlYm0nKSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ3dlYm0nLFxuXHRcdFx0XHRcdG1pbWU6ICd2aWRlby93ZWJtJ1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChjaGVjayhbMHgwLCAweDAsIDB4MCwgMHgxNCwgMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg3MSwgMHg3NCwgMHgyMCwgMHgyMF0pIHx8XG5cdFx0Y2hlY2soWzB4NjYsIDB4NzIsIDB4NjUsIDB4NjVdLCB7b2Zmc2V0OiA0fSkgfHxcblx0XHRjaGVjayhbMHg2NiwgMHg3NCwgMHg3OSwgMHg3MCwgMHg3MSwgMHg3NCwgMHgyMCwgMHgyMF0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdGNoZWNrKFsweDZELCAweDY0LCAweDYxLCAweDc0XSwge29mZnNldDogNH0pIHx8IC8vIE1KUEVHXG5cdFx0Y2hlY2soWzB4NzcsIDB4NjksIDB4NjQsIDB4NjVdLCB7b2Zmc2V0OiA0fSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbW92Jyxcblx0XHRcdG1pbWU6ICd2aWRlby9xdWlja3RpbWUnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg1MiwgMHg0OSwgMHg0NiwgMHg0Nl0pICYmXG5cdFx0Y2hlY2soWzB4NDEsIDB4NTYsIDB4NDldLCB7b2Zmc2V0OiA4fSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2F2aScsXG5cdFx0XHRtaW1lOiAndmlkZW8veC1tc3ZpZGVvJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MzAsIDB4MjYsIDB4QjIsIDB4NzUsIDB4OEUsIDB4NjYsIDB4Q0YsIDB4MTEsIDB4QTYsIDB4RDldKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3bXYnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL3gtbXMtd212J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MCwgMHgwLCAweDEsIDB4QkFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtcGcnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL21wZWcnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg0OSwgMHg0NCwgMHgzM10pIHx8XG5cdFx0Y2hlY2soWzB4RkYsIDB4RkJdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbXAzJyxcblx0XHRcdG1pbWU6ICdhdWRpby9tcGVnJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NjYsIDB4NzQsIDB4NzksIDB4NzAsIDB4NEQsIDB4MzQsIDB4NDFdLCB7b2Zmc2V0OiA0fSkgfHxcblx0XHRjaGVjayhbMHg0RCwgMHgzNCwgMHg0MSwgMHgyMF0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtNGEnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL200YSdcblx0XHR9O1xuXHR9XG5cblx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIGBvZ2dgIGNoZWNrXG5cdGlmIChjaGVjayhbMHg0RiwgMHg3MCwgMHg3NSwgMHg3MywgMHg0OCwgMHg2NSwgMHg2MSwgMHg2NF0sIHtvZmZzZXQ6IDI4fSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnb3B1cycsXG5cdFx0XHRtaW1lOiAnYXVkaW8vb3B1cydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRGLCAweDY3LCAweDY3LCAweDUzXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnb2dnJyxcblx0XHRcdG1pbWU6ICdhdWRpby9vZ2cnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg2NiwgMHg0QywgMHg2MSwgMHg0M10pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2ZsYWMnLFxuXHRcdFx0bWltZTogJ2F1ZGlvL3gtZmxhYydcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDUyLCAweDQ5LCAweDQ2LCAweDQ2XSkgJiZcblx0XHRjaGVjayhbMHg1NywgMHg0MSwgMHg1NiwgMHg0NV0sIHtvZmZzZXQ6IDh9KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnd2F2Jyxcblx0XHRcdG1pbWU6ICdhdWRpby94LXdhdidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDIzLCAweDIxLCAweDQxLCAweDRELCAweDUyLCAweDBBXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnYW1yJyxcblx0XHRcdG1pbWU6ICdhdWRpby9hbXInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgyNSwgMHg1MCwgMHg0NCwgMHg0Nl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3BkZicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vcGRmJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEQsIDB4NUFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdleGUnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbXNkb3dubG9hZCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdChidWZbMF0gPT09IDB4NDMgfHwgYnVmWzBdID09PSAweDQ2KSAmJlxuXHRcdGNoZWNrKFsweDU3LCAweDUzXSwge29mZnNldDogMX0pXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdzd2YnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4N0IsIDB4NUMsIDB4NzIsIDB4NzQsIDB4NjZdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdydGYnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3J0Zidcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDAwLCAweDYxLCAweDczLCAweDZEXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnd2FzbScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vd2FzbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKFxuXHRcdGNoZWNrKFsweDc3LCAweDRGLCAweDQ2LCAweDQ2XSkgJiZcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwMCwgMHgwMSwgMHgwMCwgMHgwMF0sIHtvZmZzZXQ6IDR9KSB8fFxuXHRcdFx0Y2hlY2soWzB4NEYsIDB4NTQsIDB4NTQsIDB4NEZdLCB7b2Zmc2V0OiA0fSlcblx0XHQpXG5cdCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICd3b2ZmJyxcblx0XHRcdG1pbWU6ICdmb250L3dvZmYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg3NywgMHg0RiwgMHg0NiwgMHgzMl0pICYmXG5cdFx0KFxuXHRcdFx0Y2hlY2soWzB4MDAsIDB4MDEsIDB4MDAsIDB4MDBdLCB7b2Zmc2V0OiA0fSkgfHxcblx0XHRcdGNoZWNrKFsweDRGLCAweDU0LCAweDU0LCAweDRGXSwge29mZnNldDogNH0pXG5cdFx0KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnd29mZjInLFxuXHRcdFx0bWltZTogJ2ZvbnQvd29mZjInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHg0QywgMHg1MF0sIHtvZmZzZXQ6IDM0fSkgJiZcblx0XHQoXG5cdFx0XHRjaGVjayhbMHgwMCwgMHgwMCwgMHgwMV0sIHtvZmZzZXQ6IDh9KSB8fFxuXHRcdFx0Y2hlY2soWzB4MDEsIDB4MDAsIDB4MDJdLCB7b2Zmc2V0OiA4fSkgfHxcblx0XHRcdGNoZWNrKFsweDAyLCAweDAwLCAweDAyXSwge29mZnNldDogOH0pXG5cdFx0KVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnZW90Jyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgwMCwgMHgwMSwgMHgwMCwgMHgwMCwgMHgwMF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3R0ZicsXG5cdFx0XHRtaW1lOiAnZm9udC90dGYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0RiwgMHg1NCwgMHg1NCwgMHg0RiwgMHgwMF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ290ZicsXG5cdFx0XHRtaW1lOiAnZm9udC9vdGYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHgwMCwgMHgwMCwgMHgwMSwgMHgwMF0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2ljbycsXG5cdFx0XHRtaW1lOiAnaW1hZ2UveC1pY29uJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NDYsIDB4NEMsIDB4NTYsIDB4MDFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdmbHYnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL3gtZmx2J1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MjUsIDB4MjFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdwcycsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vcG9zdHNjcmlwdCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweEZELCAweDM3LCAweDdBLCAweDU4LCAweDVBLCAweDAwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAneHonLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gteHonXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg1MywgMHg1MSwgMHg0QywgMHg2OV0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3NxbGl0ZScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1zcWxpdGUzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4NEUsIDB4NDUsIDB4NTMsIDB4MUFdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICduZXMnLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbmludGVuZG8tbmVzLXJvbSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDQzLCAweDcyLCAweDMyLCAweDM0XSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnY3J4Jyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWdvb2dsZS1jaHJvbWUtZXh0ZW5zaW9uJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoXG5cdFx0Y2hlY2soWzB4NEQsIDB4NTMsIDB4NDMsIDB4NDZdKSB8fFxuXHRcdGNoZWNrKFsweDQ5LCAweDUzLCAweDYzLCAweDI4XSlcblx0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2NhYicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm1zLWNhYi1jb21wcmVzc2VkJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBOZWVkcyB0byBiZSBiZWZvcmUgYGFyYCBjaGVja1xuXHRpZiAoY2hlY2soWzB4MjEsIDB4M0MsIDB4NjEsIDB4NzIsIDB4NjMsIDB4NjgsIDB4M0UsIDB4MEEsIDB4NjQsIDB4NjUsIDB4NjIsIDB4NjksIDB4NjEsIDB4NkUsIDB4MkQsIDB4NjIsIDB4NjksIDB4NkUsIDB4NjEsIDB4NzIsIDB4NzldKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdkZWInLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtZGViJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAoY2hlY2soWzB4MjEsIDB4M0MsIDB4NjEsIDB4NzIsIDB4NjMsIDB4NjgsIDB4M0VdKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdhcicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC11bml4LWFyY2hpdmUnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHhFRCwgMHhBQiwgMHhFRSwgMHhEQl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ3JwbScsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1ycG0nXG5cdFx0fTtcblx0fVxuXG5cdGlmIChcblx0XHRjaGVjayhbMHgxRiwgMHhBMF0pIHx8XG5cdFx0Y2hlY2soWzB4MUYsIDB4OURdKVxuXHQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnWicsXG5cdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1jb21wcmVzcydcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDRDLCAweDVBLCAweDQ5LCAweDUwXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbHonLFxuXHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbHppcCdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweEQwLCAweENGLCAweDExLCAweEUwLCAweEExLCAweEIxLCAweDFBLCAweEUxXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbXNpJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LW1zaSdcblx0XHR9O1xuXHR9XG5cblx0aWYgKGNoZWNrKFsweDA2LCAweDBFLCAweDJCLCAweDM0LCAweDAyLCAweDA1LCAweDAxLCAweDAxLCAweDBELCAweDAxLCAweDAyLCAweDAxLCAweDAxLCAweDAyXSkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXh0OiAnbXhmJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9teGYnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0N10sIHtvZmZzZXQ6IDR9KSAmJiAoY2hlY2soWzB4NDddLCB7b2Zmc2V0OiAxOTJ9KSB8fCBjaGVjayhbMHg0N10sIHtvZmZzZXQ6IDE5Nn0pKSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRleHQ6ICdtdHMnLFxuXHRcdFx0bWltZTogJ3ZpZGVvL21wMnQnXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0MiwgMHg0QywgMHg0NSwgMHg0RSwgMHg0NCwgMHg0NSwgMHg1Ml0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2JsZW5kJyxcblx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWJsZW5kZXInXG5cdFx0fTtcblx0fVxuXG5cdGlmIChjaGVjayhbMHg0MiwgMHg1MCwgMHg0NywgMHhGQl0pKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGV4dDogJ2JwZycsXG5cdFx0XHRtaW1lOiAnaW1hZ2UvYnBnJ1xuXHRcdH07XG5cdH1cblxuXHRyZXR1cm4gbnVsbDtcbn07IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImNvbnN0IFVwcHkgPSByZXF1aXJlKCd1cHB5L2xpYi9jb3JlL0NvcmUnKVxuY29uc3QgRmlsZUlucHV0ID0gcmVxdWlyZSgndXBweS9saWIvcGx1Z2lucy9GaWxlSW5wdXQnKVxuY29uc3QgWEhSVXBsb2FkID0gcmVxdWlyZSgndXBweS9saWIvcGx1Z2lucy9YSFJVcGxvYWQnKVxuY29uc3QgUHJvZ3Jlc3NCYXIgPSByZXF1aXJlKCd1cHB5L2xpYi9wbHVnaW5zL1Byb2dyZXNzQmFyJylcblxuY29uc3QgdXBweSA9IG5ldyBVcHB5KHsgZGVidWc6IHRydWUsIGF1dG9Qcm9jZWVkOiB0cnVlIH0pXG51cHB5LnVzZShGaWxlSW5wdXQsIHsgdGFyZ2V0OiAnLlVwcHlGb3JtJywgcmVwbGFjZVRhcmdldENvbnRlbnQ6IHRydWUgfSlcbnVwcHkudXNlKFhIUlVwbG9hZCwge1xuICBlbmRwb2ludDogJy8vYXBpMi50cmFuc2xvYWRpdC5jb20nLFxuICBmb3JtRGF0YTogdHJ1ZSxcbiAgZmllbGROYW1lOiAnZmlsZXNbXSdcbn0pXG51cHB5LnVzZShQcm9ncmVzc0Jhciwge1xuICB0YXJnZXQ6ICdib2R5JyxcbiAgZml4ZWQ6IHRydWUsXG4gIGhpZGVBZnRlckZpbmlzaDogZmFsc2Vcbn0pXG51cHB5LnJ1bigpXG5cbmNvbnNvbGUubG9nKCdVcHB5IHdpdGggRm9ybXRhZyBhbmQgWEhSVXBsb2FkIGlzIGxvYWRlZCcpXG4iXX0=
