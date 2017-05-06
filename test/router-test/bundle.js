(function () {
'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var keys = createCommonjsModule(function (module, exports) {
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) { keys.push(key); }
  return keys;
}
});

var is_arguments = createCommonjsModule(function (module, exports) {
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
}
});

var index$2 = createCommonjsModule(function (module) {
var pSlice = Array.prototype.slice;



var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) { opts = {}; }
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
};

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') { return false; }
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') { return false; }
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    { return false; }
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) { return false; }
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (is_arguments(a)) {
    if (!is_arguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) { return false; }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) { return false; }
    }
    return true;
  }
  try {
    var ka = keys(a),
        kb = keys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    { return false; }
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      { return false; }
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) { return false; }
  }
  return typeof a === typeof b;
}
});

var functionQueue = [];
var nestDepth = 0;

function makeGroup(label) {
	nestDepth++;
	console.group(label);
}

function endGroup() {
	nestDepth--;
	console.groupEnd();
}

window.addEventListener('error', function() {
	while (nestDepth > 0) {
		endGroup();
	}
});

var makeNoop = function () { return function () {}; };

var globalStartTime = performance.now();
var passCount = 0;
var failCount = 0;
var pendingCount = 0;

function it(label, fn) {
	var isPlaceholder = typeof fn !== 'function';
	var labeledFn = isPlaceholder ? makeNoop() : fn;
	labeledFn.label = label;
	labeledFn.isPlaceholder = isPlaceholder;
	functionQueue.push(labeledFn);
}

function safeStringify(obj) {
	var cache = [];
	var returnValue = JSON.stringify(obj, function(key, value) {
		if (typeof value === 'object' && value !== null) {
			if (cache.indexOf(value) === -1) {
				cache.push(value);
				return value;
			}
			return '[CIRCULAR]';
		}
		return value;
	}, 2);
	cache = null;
	return returnValue;
}

function line(str) {
	return '\n\n' + str;
}

function assert(ref) {
	var condition = ref.condition;
	var label = ref.label;
	var source = ref.source;
	var type = ref.type;
	var value = ref.value;

	console.assert(
		condition,
		line('Expected:') +
		line(safeStringify(source)) +
		line('to ' + type + ':') +
		line(safeStringify(value)) +
		line('in "' + label + '"')
	);
}

function oneLineAssert(ref, hasValue) {
	var condition = ref.condition;
	var label = ref.label;
	var source = ref.source;
	var type = ref.type;
	var value = ref.value;

	var val = hasValue ? (value + ' ') : '';
	console.assert(
		condition,
		'Expected ' + source + ' to ' + type + ' ' + val + 'in "' + label + '"'
	);
}

function isSimple(x) {
	return (typeof x === 'boolean') || (typeof x === 'number') || (typeof x === 'string') || (x === null) || (x === undefined);
}

function logError(assertion) {
	failCount++;
	console.groupCollapsed(
		'%c[ ✗ ] %c' + assertion.label,
		'color: #e71600',
		'color: inherit; font-weight: 400'
	);
	if (Object.prototype.hasOwnProperty.call(assertion, 'value')) {
		if (isSimple(assertion.source) && isSimple(assertion.value)) {
			oneLineAssert(assertion, true);
		}
		else {
			assert(assertion);
		}
	}
	else {
		oneLineAssert(assertion, false);
	}
	if (assertion.error) {
		console.error(assertion.error);
	}
	console.groupEnd();
}

function logSuccess(label, time) {
	passCount++;
	console.log(
		'%c[ ✓ ] %c' + label + '%c' + (time ? (' [' + time + 'ms]') : ''),
		'color: #27ae60',
		'color: inherit',
		'color: #f39c12; font-style: italic'
	);
}

function callWithExpect(fn, cb) {

	var label = fn.label;
	if (!label) {
		fn();
		return;
	}

	if (fn.isPlaceholder) {
		pendingCount++;
		console.log(
			'%c[ i ] %c' + fn.label,
			'color: #3498db',
			'color: #3498db; font-weight: bold; font-style: italic'
		);
		return;
	}

	var assertions = [];
	function expect(source) {

		var negate = false;
		var deep = false;

		var handlers = {
			get to() {
				return handlers;
			},
			get not() {
				negate = !negate;
				return handlers;
			},
			get deep() {
				deep = true;
				return handlers;
			},
			equal: function equal(value) {
				var isEqual = false;
				if (deep) { isEqual = index$2(source, value, { strict: true }); }
				else { isEqual = value === source; }
				var condition = negate ? !(isEqual) : isEqual;
				var type = [
					negate ? 'not ' : '',
					deep ? 'deep ' : '',
					'equal'
				].join('');
				assertions.push({
					type: type,
					label: label,
					condition: condition,
					source: source,
					value: value
				});
			},
			explode: function explode() {
				if (typeof source !== 'function') {
					console.warn(
						'You are calling expect::explode without passing it a function in "' +
						label + '".\n\n' +
						'You passed:\n\n' +
						safeStringify(source) +
						'\n\n' +
						'Correct usage:\n\n' +
						'expect(function() { /* ... */ }).to.explode()'
					);
				}
				var threw = false;
				var error = null;
				try { source(); }
				catch (err) { threw = true; error = err; }
				var condition = negate ? !(threw) : threw;
				var type = [
					negate ? 'not ' : '',
					'throw'
				].join('');
				assertions.push({
					type: type,
					label: label,
					condition: condition,
					error: error,
					source: '[Function ' + (source.name || '(Anonymous function)') + ']'
				});
			}
		};

		return handlers;

	}

	function runAssertions(time) {
		var error = null;
		var i = 0;
		while (i < assertions.length) {
			if (!assertions[i].condition) {
				error = assertions[i];
				break;
			}
			i++;
		}
		if (error) { logError(error); }
		else { logSuccess(label, time); }
	}

	var isAsync = typeof cb === 'function';
	if (isAsync) {
		var calledDone = false;
		var start = performance.now();
		fn(expect, function done() {
			if (!calledDone) {
				calledDone = true;
				var end = performance.now();
				runAssertions((end - start).toFixed());
				cb();
			}
		});
		setTimeout(function() {
			if (!calledDone) {
				calledDone = true;
				logError({
					label: label + ' [' + test.timeout + 'ms timeout]',
					type: 'complete within ' + test.timeout + 'ms',
					condition: false,
					source: 'async assertion'
				});
				cb();
			}
		}, test.timeout);
	}
	else {
		fn(expect);
		runAssertions();
	}

}

function unwindQueue(queue) {

	if (queue.length === 0) {
		var time = performance.now() - globalStartTime;
		var timeStr = time > 9999 ? (time / 1000).toFixed(2) + 's' : time.toFixed() + 'ms';
		console.log(
			'%c%d passed%c [%s]',
			'color: #27ae60',
			passCount,
			'color: #f39c12; font-style: italic',
			timeStr
		);
		if (failCount > 0) {
			console.log('%c%d failed', 'color: #e71600', failCount);
		}
		if (pendingCount > 0) {
			console.log('%c%d pending', 'color: #3498db', pendingCount);
		}
		return;
	}

	var fn = queue.shift();
	var isAsync = fn.length === 2; // function(expect, done) { ... }
	if (isAsync) {
		callWithExpect(fn, function() {
			unwindQueue(queue);
		});
	}
	else {
		callWithExpect(fn);
		unwindQueue(queue);
	}
}

function test(label, fn) {
	functionQueue.push(makeGroup.bind(null, label));
	fn(it);
	functionQueue.push(endGroup);
	return function () { return setTimeout(function () { return unwindQueue(functionQueue); }, 0); };
}

test.timeout = 2000;

var index$1 = test;

var isInitialized = false;
var noop = function () {};

var app$1 = {
	state: {},
	actions: {},
	onUpdate: noop
};

function blixt(opts) {

	if (isInitialized) {
		throw Error('Blixt has already been initialized');
	}

	isInitialized = true;
	app$1.onUpdate = opts.onUpdate || app$1.onUpdate;
	var modules = opts.modules || {};
	Object.keys(modules).forEach(function(namespace) {
		app$1.state[namespace] = modules[namespace].state || {};
		app$1.actions[namespace] = modules[namespace].actions || {};
	});

	// return app.actions, so user can run app[namespace][action](args);
	return app$1.actions;

}


function forceUpdate() {
	app$1.onUpdate(app$1.state);
}

function getState() {
	var path = [], len = arguments.length;
	while ( len-- ) path[ len ] = arguments[ len ];

	return path.reduce(function (state, segment) { return state[segment]; }, app$1.state);
}


function getContext(state, boundActions) {
	return {
		state: state,
		actions: boundActions
	};
}

var isPromise = function (x) { return x && x.constructor && (typeof x.then === 'function'); };

function maybeUpdate(result) {
	if (result && result.update === false) { return; }
	forceUpdate();
}

function actions(actionsObj, fn) {
	if ( fn === void 0 ) fn = noop;

	return {
		bindTo: function bindTo(state) {
			fn(state);
			var boundActions = {};
			Object.keys(actionsObj).forEach(function(key) {
				var action = actionsObj[key];
				boundActions[key] = function() {
					var args = [], len = arguments.length;
					while ( len-- ) args[ len ] = arguments[ len ];

					var result = action.apply(action, [getContext(state, boundActions)].concat(args));
					if (isPromise(result)) {
						return result.then(function(value) {
							fn(state);
							maybeUpdate(value);
						});
					}
					fn(state);
					maybeUpdate(result);
					return result;
				};
			});
			return boundActions;
		}
	};
}

blixt.getState = getState;
blixt.forceUpdate = forceUpdate;
blixt.actions = actions;

var hasOwn = Object.prototype.hasOwnProperty;

// given ['', 'foo', 'bar', '', ''], return ['foo', 'bar']
function trim(arr) {
	var i = 0;
	var j = arr.length;
	while (i < j) {
		if (arr[i]) { break; }
		i++;
	}
	while (j > i) { // >= ?
		if (arr[j]) { break; }
		j--;
	}
	return arr.slice(i, j + 1);
}

var splitRoute = function (s) { return trim(s.split('/')); };


// merges two loops into a single loop:
// 1. getParams
// 		loops through urlSegments and creates
// 		an object of all params found
// 2. isMatch
//		determines if urlSegments correspond to
//		routeSegments, eg. this would be a match:
//		['foo', 'bar', '123'],
//		['foo', ':type', ':amount']
// Both can be done in the same loop. null is returned
// if not a match, an object of the params (which can
// be an empty object) is returned otherwise.

function getParamsIfMatch(routeSegments, urlSegments) {
	// can be less than if variadic, otherwise will be equal in length
	if (routeSegments.length > urlSegments.length) { return null; }
	var params = {};
	var isVariadic = false;
	for (var i = 0; i < routeSegments.length; i++) {
		var p = routeSegments[i].indexOf(':'); // parameterized part's index
		if (p > -1) {
			// matches /user_john/foo to /user_:username/foo
			// exits early here in cases like: /user/foo where unparameterized parts do not match
			if (routeSegments[i].slice(0, p) !== urlSegments[i].slice(0, p)) { return null; }
			isVariadic = routeSegments[i].slice(-3) === '...';
			if (isVariadic) {
				// cut off ":" and "..." from param name  = url from current segment onward
				params[routeSegments[i].slice(p + 1, -3)] = urlSegments.slice(i, urlSegments.length).join('/');
				break;
			}
			else {
				// p + 1 to not include ":"           = p (since actual url will not contain ":")
				params[routeSegments[i].slice(p + 1)] = urlSegments[i].slice(p);
				continue;
			}
		}
		if (routeSegments[i] !== urlSegments[i]) { return null; }
	}

	// whether it's variadic can only be known after the loop,
	// so if it was not and the lengths differ at this point
	// there was no match
	if (!isVariadic && routeSegments.length !== urlSegments.length) { return null; }
	return params;
}



function getMatch(routeMap, urlSegments) {
	for (var route in routeMap) {
		if (hasOwn.call(routeMap, route)) {
			var routeSegments = splitRoute(route);
			var params = getParamsIfMatch(routeSegments, urlSegments);
			if (params) { return { route: route, params: params }; }
		}
	}
	return { route: '*', params: {} };
}

function router(routes) {

	if (routes['*'] === undefined) {
		throw new Error('Blixt router requires catch-all * route');
	}

	var routeActions = {
		set: function set(ref, path) {
			var actions$$1 = ref.actions;

			window.history.pushState(null, '', path);
			actions$$1.resolveRoute();
			// return { update: false };
		},
		resolveRoute: function resolveRoute(ref) {
			var state = ref.state;

			var match = getMatch(routes, splitRoute(window.location.pathname));
			state.route = match.route;
			state.path = window.location.pathname;
			state.hash = window.location.hash;
			state.search = window.location.search;
			state.params = match.params;
			routes[match.route](state);
			// return { update: false };
		}
	};

	var state = {
		route: '',
		path: '',
		hash: '',
		search: '',
		params: {}
	};

	var actions$$1 = blixt.actions(routeActions).bindTo(state);

	actions$$1.resolveRoute();
	window.onpopstate = actions$$1.resolveRoute;
	
	return { state: state, actions: actions$$1 };

}

function TestRoute(route) {
	TestRoute.route = route;
	TestRoute.callCount = TestRoute.callCount + 1;
}
TestRoute.callCount = 0;

function CatchAll(route) {
	CatchAll.route = route;
	CatchAll.callCount = CatchAll.callCount + 1;
}
CatchAll.callCount = 0;


var app = blixt({
	modules: {
		route: router({
			'/': TestRoute,
			'/foo': TestRoute,
			'/foo/bar': TestRoute,
			'/foo/:baz': TestRoute,
			'/bar/:anything...': TestRoute,
			'/test/': TestRoute,
			'/test/123/:foo/test/:bar/:baz': TestRoute,
			'/user_:name/profile': TestRoute,
			'/user_:name/profile/:foo/:bar/123/:baz/:qux...': TestRoute,
			'*': CatchAll
		})
	}
});

window.app = app;

index$1('blixt router', function(it) {

	index$1('setup', function() {

		it('throws if not provided catch-all * route', function(expect) {
			expect(function() {
				router({ '/foo': function () {} });
			}).to.explode();
		});

		it('sets initial state', function(expect) {
			expect(blixt.getState('route')).to.deep.equal({
				route: '/',
				path: '/',
				hash: '',
				search: '',
				params: {}
			});
		});

	});

	index$1('set route', function() {

		it('changes route to non-matched route', function(expect) {
			var catchAllCount = CatchAll.callCount;
			expect(window.location.pathname).to.equal('/');
			app.route.set('/some-route');
			expect(window.location.pathname).to.equal('/some-route');
			expect(blixt.getState('route', 'route')).to.equal('*');
			expect(blixt.getState('route', 'path')).to.equal('/some-route');
			expect(CatchAll.callCount).to.equal(catchAllCount + 1);
			expect(CatchAll.route).to.deep.equal(blixt.getState('route'));
			app.route.set('/');
		});

		it('changes route to matched route', function(expect) {
			var callCount = TestRoute.callCount;
			app.route.set('/foo');
			expect(window.location.pathname).to.equal('/foo');
			expect(blixt.getState('route', 'route')).to.equal('/foo');
			expect(blixt.getState('route', 'path')).to.equal('/foo');
			expect(TestRoute.callCount).to.equal(callCount + 1);
			app.route.set('/');
		});

		it('changes route to matched route (non-zero parameterized index)', function(expect) {
			var callCount = TestRoute.callCount;
			app.route.set('/user_joe/profile');
			expect(window.location.pathname).to.equal('/user_joe/profile');
			expect(blixt.getState('route', 'route')).to.equal('/user_:name/profile');
			expect(blixt.getState('route', 'path')).to.equal('/user_joe/profile');
			expect(blixt.getState('route', 'params')).to.deep.equal({ name: 'joe' });
			expect(TestRoute.callCount).to.equal(callCount + 1);
			app.route.set('/');
		});

		it('changes route to matched route with hash', function(expect) {
			app.route.set('/foo#bar');
			expect(window.location.pathname).to.equal('/foo');
			expect(window.location.hash).to.equal('#bar');
			expect(blixt.getState('route', 'route')).to.equal('/foo');
			expect(blixt.getState('route', 'path')).to.equal('/foo');
			expect(blixt.getState('route', 'hash')).to.equal('#bar');
			app.route.set('/');
		});

		it('changes route to matched route with search', function(expect) {
			app.route.set('/foo?bar=baz');
			expect(window.location.pathname).to.equal('/foo');
			expect(window.location.hash).to.equal('');
			expect(blixt.getState('route', 'route')).to.equal('/foo');
			expect(blixt.getState('route', 'path')).to.equal('/foo');
			expect(blixt.getState('route', 'hash')).to.equal('');
			expect(blixt.getState('route', 'search')).to.equal('?bar=baz');
			app.route.set('/');
		});

		it('changes route to matched route with hash and search', function(expect) {
			app.route.set('/foo?bar=baz#qux');
			expect(window.location.pathname).to.equal('/foo');
			expect(window.location.hash).to.equal('#qux');
			expect(blixt.getState('route', 'route')).to.equal('/foo');
			expect(blixt.getState('route', 'path')).to.equal('/foo');
			expect(blixt.getState('route', 'hash')).to.equal('#qux');
			expect(blixt.getState('route', 'search')).to.equal('?bar=baz');
			app.route.set('/');
		});

		it('changes route to matched route with params', function(expect) {
			app.route.set('/foo/test123');
			expect(window.location.pathname).to.equal('/foo/test123');
			expect(blixt.getState('route', 'route')).to.equal('/foo/:baz');
			expect(blixt.getState('route', 'path')).to.equal('/foo/test123');
			expect(blixt.getState('route', 'params')).to.deep.equal({ baz: 'test123' });
			app.route.set('/');
		});

		it('changes route to matched route with many params', function(expect) {
			app.route.set('/test/123/asd/test/dfg/123');
			expect(blixt.getState('route', 'params')).to.deep.equal({
				foo: 'asd',
				bar: 'dfg',
				baz: '123'
			});
			app.route.set('/');
		});

		it('changes route to variadic route', function(expect) {
			app.route.set('/bar/https://test.com/some/url');
			expect(blixt.getState('route', 'params')).to.deep.equal({
				anything: 'https://test.com/some/url'
			});
			app.route.set('/');
		});

		it('changes route to complex route', function(expect) {
			// '/user_:name/profile/:foo/:bar/123/:baz/:qux...'
			app.route.set('/user_john/profile/abc/zyx/123/456/http://test.com');
			expect(blixt.getState('route', 'params')).to.deep.equal({
				name: 'john',
				foo: 'abc',
				bar: 'zyx',
				baz: '456',
				qux: 'http://test.com'
			});
			app.route.set('/');
		});

		it('changes route to root route', function(expect) {
			var rootCount = TestRoute.callCount;
			app.route.set('/');
			expect(window.location.pathname).to.equal('/');
			expect(blixt.getState('route', 'route')).to.equal('/');
			expect(blixt.getState('route', 'path')).to.equal('/');
			expect(TestRoute.callCount).to.equal(rootCount + 1);
			app.route.set('/');
		});

	});

	index$1('navigation changes', function() {

		it('updates state on navigation back (async)', function(expect, done) {
			expect(blixt.getState('route', 'hash')).to.equal('');
			app.route.set('/user_jimmy/profile');
			app.route.set('/');
			window.history.back();
			setTimeout(function() {
				expect(blixt.getState('route')).to.deep.equal({
					route: '/user_:name/profile',
					path: '/user_jimmy/profile',
					hash: '',
					search: '',
					params: { name: 'jimmy' }
				});
				done();
			}, 300); // window.onpopstate can take time to resolve
		});

		// NOTE: this test depends on the previous test
		// which sets history back once
		it('updates state on navigation forward', function(expect, done) {
			window.history.forward();
			setTimeout(function() {
				expect(blixt.getState('route')).to.deep.equal({
					route: '/',
					path: '/',
					hash: '',
					search: '',
					params: {}
				});
				done();
			}, 300); // window.onpopstate can take time to resolve
		});

	});

})();

}());
