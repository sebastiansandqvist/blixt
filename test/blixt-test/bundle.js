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

function Vnode(tag, key, attrs, children, text, dom) {
	return {tag: tag, key: key, attrs: attrs, children: children, text: text, dom: dom, domSize: undefined, state: undefined, _state: undefined, events: undefined, instance: undefined, skip: false}
}
Vnode.normalize = function(node) {
	if (Array.isArray(node)) { return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined) }
	if (node != null && typeof node !== "object") { return Vnode("#", undefined, undefined, node === false ? "" : node, undefined, undefined) }
	return node
};
Vnode.normalizeChildren = function normalizeChildren(children) {
	for (var i = 0; i < children.length; i++) {
		children[i] = Vnode.normalize(children[i]);
	}
	return children
};

var vnode = Vnode;

var render$2 = function($window) {
	var $doc = $window.document;
	var $emptyFragment = $doc.createDocumentFragment();

	var onevent;
	function setEventCallback(callback) {return onevent = callback}

	//create
	function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
		for (var i = start; i < end; i++) {
			var vnode$$1 = vnodes[i];
			if (vnode$$1 != null) {
				createNode(parent, vnode$$1, hooks, ns, nextSibling);
			}
		}
	}
	function createNode(parent, vnode$$1, hooks, ns, nextSibling) {
		var tag = vnode$$1.tag;
		if (typeof tag === "string") {
			vnode$$1.state = {};
			if (vnode$$1.attrs != null) { initLifecycle(vnode$$1.attrs, vnode$$1, hooks); }
			switch (tag) {
				case "#": return createText(parent, vnode$$1, nextSibling)
				case "<": return createHTML(parent, vnode$$1, nextSibling)
				case "[": return createFragment(parent, vnode$$1, hooks, ns, nextSibling)
				default: return createElement(parent, vnode$$1, hooks, ns, nextSibling)
			}
		}
		else { return createComponent(parent, vnode$$1, hooks, ns, nextSibling) }
	}
	function createText(parent, vnode$$1, nextSibling) {
		vnode$$1.dom = $doc.createTextNode(vnode$$1.children);
		insertNode(parent, vnode$$1.dom, nextSibling);
		return vnode$$1.dom
	}
	function createHTML(parent, vnode$$1, nextSibling) {
		var match = vnode$$1.children.match(/^\s*?<(\w+)/im) || [];
		var parent1 = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match[1]] || "div";
		var temp = $doc.createElement(parent1);

		temp.innerHTML = vnode$$1.children;
		vnode$$1.dom = temp.firstChild;
		vnode$$1.domSize = temp.childNodes.length;
		var fragment = $doc.createDocumentFragment();
		var child;
		while (child = temp.firstChild) {
			fragment.appendChild(child);
		}
		insertNode(parent, fragment, nextSibling);
		return fragment
	}
	function createFragment(parent, vnode$$1, hooks, ns, nextSibling) {
		var fragment = $doc.createDocumentFragment();
		if (vnode$$1.children != null) {
			var children = vnode$$1.children;
			createNodes(fragment, children, 0, children.length, hooks, null, ns);
		}
		vnode$$1.dom = fragment.firstChild;
		vnode$$1.domSize = fragment.childNodes.length;
		insertNode(parent, fragment, nextSibling);
		return fragment
	}
	function createElement(parent, vnode$$1, hooks, ns, nextSibling) {
		var tag = vnode$$1.tag;
		switch (vnode$$1.tag) {
			case "svg": ns = "http://www.w3.org/2000/svg"; break
			case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
		}

		var attrs = vnode$$1.attrs;
		var is = attrs && attrs.is;

		var element = ns ?
			is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
			is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag);
		vnode$$1.dom = element;

		if (attrs != null) {
			setAttrs(vnode$$1, attrs, ns);
		}

		insertNode(parent, element, nextSibling);

		if (vnode$$1.attrs != null && vnode$$1.attrs.contenteditable != null) {
			setContentEditable(vnode$$1);
		}
		else {
			if (vnode$$1.text != null) {
				if (vnode$$1.text !== "") { element.textContent = vnode$$1.text; }
				else { vnode$$1.children = [vnode("#", undefined, undefined, vnode$$1.text, undefined, undefined)]; }
			}
			if (vnode$$1.children != null) {
				var children = vnode$$1.children;
				createNodes(element, children, 0, children.length, hooks, null, ns);
				setLateAttrs(vnode$$1);
			}
		}
		return element
	}
	function initComponent(vnode$$1, hooks) {
		var sentinel;
		if (typeof vnode$$1.tag.view === "function") {
			vnode$$1.state = Object.create(vnode$$1.tag);
			sentinel = vnode$$1.state.view;
			if (sentinel.$$reentrantLock$$ != null) { return $emptyFragment }
			sentinel.$$reentrantLock$$ = true;
		} else {
			vnode$$1.state = void 0;
			sentinel = vnode$$1.tag;
			if (sentinel.$$reentrantLock$$ != null) { return $emptyFragment }
			sentinel.$$reentrantLock$$ = true;
			vnode$$1.state = (vnode$$1.tag.prototype != null && typeof vnode$$1.tag.prototype.view === "function") ? new vnode$$1.tag(vnode$$1) : vnode$$1.tag(vnode$$1);
		}
		vnode$$1._state = vnode$$1.state;
		if (vnode$$1.attrs != null) { initLifecycle(vnode$$1.attrs, vnode$$1, hooks); }
		initLifecycle(vnode$$1._state, vnode$$1, hooks);
		vnode$$1.instance = vnode.normalize(vnode$$1._state.view.call(vnode$$1.state, vnode$$1));
		if (vnode$$1.instance === vnode$$1) { throw Error("A view cannot return the vnode it received as argument") }
		sentinel.$$reentrantLock$$ = null;
	}
	function createComponent(parent, vnode$$1, hooks, ns, nextSibling) {
		initComponent(vnode$$1, hooks);
		if (vnode$$1.instance != null) {
			var element = createNode(parent, vnode$$1.instance, hooks, ns, nextSibling);
			vnode$$1.dom = vnode$$1.instance.dom;
			vnode$$1.domSize = vnode$$1.dom != null ? vnode$$1.instance.domSize : 0;
			insertNode(parent, element, nextSibling);
			return element
		}
		else {
			vnode$$1.domSize = 0;
			return $emptyFragment
		}
	}

	//update
	function updateNodes(parent, old, vnodes, recycling, hooks, nextSibling, ns) {
		if (old === vnodes || old == null && vnodes == null) { return }
		else if (old == null) { createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, undefined); }
		else if (vnodes == null) { removeNodes(old, 0, old.length, vnodes); }
		else {
			if (old.length === vnodes.length) {
				var isUnkeyed = false;
				for (var i = 0; i < vnodes.length; i++) {
					if (vnodes[i] != null && old[i] != null) {
						isUnkeyed = vnodes[i].key == null && old[i].key == null;
						break
					}
				}
				if (isUnkeyed) {
					for (var i = 0; i < old.length; i++) {
						if (old[i] === vnodes[i]) { continue }
						else if (old[i] == null && vnodes[i] != null) { createNode(parent, vnodes[i], hooks, ns, getNextSibling(old, i + 1, nextSibling)); }
						else if (vnodes[i] == null) { removeNodes(old, i, i + 1, vnodes); }
						else { updateNode(parent, old[i], vnodes[i], hooks, getNextSibling(old, i + 1, nextSibling), recycling, ns); }
					}
					return
				}
			}
			recycling = recycling || isRecyclable(old, vnodes);
			if (recycling) {
				var pool = old.pool;
				old = old.concat(old.pool);
			}

			var oldStart = 0, start = 0, oldEnd = old.length - 1, end = vnodes.length - 1, map;
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldStart], v = vnodes[start];
				if (o === v && !recycling) { oldStart++, start++; }
				else if (o == null) { oldStart++; }
				else if (v == null) { start++; }
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldStart >= old.length - pool.length) || ((pool == null) && recycling);
					oldStart++, start++;
					updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), shouldRecycle, ns);
					if (recycling && o.tag === v.tag) { insertNode(parent, toFragment(o), nextSibling); }
				}
				else {
					var o = old[oldEnd];
					if (o === v && !recycling) { oldEnd--, start++; }
					else if (o == null) { oldEnd--; }
					else if (v == null) { start++; }
					else if (o.key === v.key) {
						var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling);
						updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns);
						if (recycling || start < end) { insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling)); }
						oldEnd--, start++;
					}
					else { break }
				}
			}
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldEnd], v = vnodes[end];
				if (o === v && !recycling) { oldEnd--, end--; }
				else if (o == null) { oldEnd--; }
				else if (v == null) { end--; }
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling);
					updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns);
					if (recycling && o.tag === v.tag) { insertNode(parent, toFragment(o), nextSibling); }
					if (o.dom != null) { nextSibling = o.dom; }
					oldEnd--, end--;
				}
				else {
					if (!map) { map = getKeyMap(old, oldEnd); }
					if (v != null) {
						var oldIndex = map[v.key];
						if (oldIndex != null) {
							var movable = old[oldIndex];
							var shouldRecycle = (pool != null && oldIndex >= old.length - pool.length) || ((pool == null) && recycling);
							updateNode(parent, movable, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns);
							insertNode(parent, toFragment(movable), nextSibling);
							old[oldIndex].skip = true;
							if (movable.dom != null) { nextSibling = movable.dom; }
						}
						else {
							var dom = createNode(parent, v, hooks, undefined, nextSibling);
							nextSibling = dom;
						}
					}
					end--;
				}
				if (end < start) { break }
			}
			createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns);
			removeNodes(old, oldStart, oldEnd + 1, vnodes);
		}
	}
	function updateNode(parent, old, vnode$$1, hooks, nextSibling, recycling, ns) {
		var oldTag = old.tag, tag = vnode$$1.tag;
		if (oldTag === tag) {
			vnode$$1.state = old.state;
			vnode$$1._state = old._state;
			vnode$$1.events = old.events;
			if (!recycling && shouldNotUpdate(vnode$$1, old)) { return }
			if (typeof oldTag === "string") {
				if (vnode$$1.attrs != null) {
					if (recycling) {
						vnode$$1.state = {};
						initLifecycle(vnode$$1.attrs, vnode$$1, hooks);
					}
					else { updateLifecycle(vnode$$1.attrs, vnode$$1, hooks); }
				}
				switch (oldTag) {
					case "#": updateText(old, vnode$$1); break
					case "<": updateHTML(parent, old, vnode$$1, nextSibling); break
					case "[": updateFragment(parent, old, vnode$$1, recycling, hooks, nextSibling, ns); break
					default: updateElement(old, vnode$$1, recycling, hooks, ns);
				}
			}
			else { updateComponent(parent, old, vnode$$1, hooks, nextSibling, recycling, ns); }
		}
		else {
			removeNode(old, null);
			createNode(parent, vnode$$1, hooks, ns, nextSibling);
		}
	}
	function updateText(old, vnode$$1) {
		if (old.children.toString() !== vnode$$1.children.toString()) {
			old.dom.nodeValue = vnode$$1.children;
		}
		vnode$$1.dom = old.dom;
	}
	function updateHTML(parent, old, vnode$$1, nextSibling) {
		if (old.children !== vnode$$1.children) {
			toFragment(old);
			createHTML(parent, vnode$$1, nextSibling);
		}
		else { vnode$$1.dom = old.dom, vnode$$1.domSize = old.domSize; }
	}
	function updateFragment(parent, old, vnode$$1, recycling, hooks, nextSibling, ns) {
		updateNodes(parent, old.children, vnode$$1.children, recycling, hooks, nextSibling, ns);
		var domSize = 0, children = vnode$$1.children;
		vnode$$1.dom = null;
		if (children != null) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child != null && child.dom != null) {
					if (vnode$$1.dom == null) { vnode$$1.dom = child.dom; }
					domSize += child.domSize || 1;
				}
			}
			if (domSize !== 1) { vnode$$1.domSize = domSize; }
		}
	}
	function updateElement(old, vnode$$1, recycling, hooks, ns) {
		var element = vnode$$1.dom = old.dom;
		switch (vnode$$1.tag) {
			case "svg": ns = "http://www.w3.org/2000/svg"; break
			case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
		}
		if (vnode$$1.tag === "textarea") {
			if (vnode$$1.attrs == null) { vnode$$1.attrs = {}; }
			if (vnode$$1.text != null) {
				vnode$$1.attrs.value = vnode$$1.text; //FIXME handle multiple children
				vnode$$1.text = undefined;
			}
		}
		updateAttrs(vnode$$1, old.attrs, vnode$$1.attrs, ns);
		if (vnode$$1.attrs != null && vnode$$1.attrs.contenteditable != null) {
			setContentEditable(vnode$$1);
		}
		else if (old.text != null && vnode$$1.text != null && vnode$$1.text !== "") {
			if (old.text.toString() !== vnode$$1.text.toString()) { old.dom.firstChild.nodeValue = vnode$$1.text; }
		}
		else {
			if (old.text != null) { old.children = [vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]; }
			if (vnode$$1.text != null) { vnode$$1.children = [vnode("#", undefined, undefined, vnode$$1.text, undefined, undefined)]; }
			updateNodes(element, old.children, vnode$$1.children, recycling, hooks, null, ns);
		}
	}
	function updateComponent(parent, old, vnode$$1, hooks, nextSibling, recycling, ns) {
		if (recycling) {
			initComponent(vnode$$1, hooks);
		} else {
			vnode$$1.instance = vnode.normalize(vnode$$1._state.view.call(vnode$$1.state, vnode$$1));
			if (vnode$$1.instance === vnode$$1) { throw Error("A view cannot return the vnode it received as argument") }
			if (vnode$$1.attrs != null) { updateLifecycle(vnode$$1.attrs, vnode$$1, hooks); }
			updateLifecycle(vnode$$1._state, vnode$$1, hooks);
		}
		if (vnode$$1.instance != null) {
			if (old.instance == null) { createNode(parent, vnode$$1.instance, hooks, ns, nextSibling); }
			else { updateNode(parent, old.instance, vnode$$1.instance, hooks, nextSibling, recycling, ns); }
			vnode$$1.dom = vnode$$1.instance.dom;
			vnode$$1.domSize = vnode$$1.instance.domSize;
		}
		else if (old.instance != null) {
			removeNode(old.instance, null);
			vnode$$1.dom = undefined;
			vnode$$1.domSize = 0;
		}
		else {
			vnode$$1.dom = old.dom;
			vnode$$1.domSize = old.domSize;
		}
	}
	function isRecyclable(old, vnodes) {
		if (old.pool != null && Math.abs(old.pool.length - vnodes.length) <= Math.abs(old.length - vnodes.length)) {
			var oldChildrenLength = old[0] && old[0].children && old[0].children.length || 0;
			var poolChildrenLength = old.pool[0] && old.pool[0].children && old.pool[0].children.length || 0;
			var vnodesChildrenLength = vnodes[0] && vnodes[0].children && vnodes[0].children.length || 0;
			if (Math.abs(poolChildrenLength - vnodesChildrenLength) <= Math.abs(oldChildrenLength - vnodesChildrenLength)) {
				return true
			}
		}
		return false
	}
	function getKeyMap(vnodes, end) {
		var map = {}, i = 0;
		for (var i = 0; i < end; i++) {
			var vnode$$1 = vnodes[i];
			if (vnode$$1 != null) {
				var key = vnode$$1.key;
				if (key != null) { map[key] = i; }
			}
		}
		return map
	}
	function toFragment(vnode$$1) {
		var count = vnode$$1.domSize;
		if (count != null || vnode$$1.dom == null) {
			var fragment = $doc.createDocumentFragment();
			if (count > 0) {
				var dom = vnode$$1.dom;
				while (--count) { fragment.appendChild(dom.nextSibling); }
				fragment.insertBefore(dom, fragment.firstChild);
			}
			return fragment
		}
		else { return vnode$$1.dom }
	}
	function getNextSibling(vnodes, i, nextSibling) {
		for (; i < vnodes.length; i++) {
			if (vnodes[i] != null && vnodes[i].dom != null) { return vnodes[i].dom }
		}
		return nextSibling
	}

	function insertNode(parent, dom, nextSibling) {
		if (nextSibling && nextSibling.parentNode) { parent.insertBefore(dom, nextSibling); }
		else { parent.appendChild(dom); }
	}

	function setContentEditable(vnode$$1) {
		var children = vnode$$1.children;
		if (children != null && children.length === 1 && children[0].tag === "<") {
			var content = children[0].children;
			if (vnode$$1.dom.innerHTML !== content) { vnode$$1.dom.innerHTML = content; }
		}
		else if (vnode$$1.text != null || children != null && children.length !== 0) { throw new Error("Child node of a contenteditable must be trusted") }
	}

	//remove
	function removeNodes(vnodes, start, end, context) {
		for (var i = start; i < end; i++) {
			var vnode$$1 = vnodes[i];
			if (vnode$$1 != null) {
				if (vnode$$1.skip) { vnode$$1.skip = false; }
				else { removeNode(vnode$$1, context); }
			}
		}
	}
	function removeNode(vnode$$1, context) {
		var expected = 1, called = 0;
		if (vnode$$1.attrs && typeof vnode$$1.attrs.onbeforeremove === "function") {
			var result = vnode$$1.attrs.onbeforeremove.call(vnode$$1.state, vnode$$1);
			if (result != null && typeof result.then === "function") {
				expected++;
				result.then(continuation, continuation);
			}
		}
		if (typeof vnode$$1.tag !== "string" && typeof vnode$$1._state.onbeforeremove === "function") {
			var result = vnode$$1._state.onbeforeremove.call(vnode$$1.state, vnode$$1);
			if (result != null && typeof result.then === "function") {
				expected++;
				result.then(continuation, continuation);
			}
		}
		continuation();
		function continuation() {
			if (++called === expected) {
				onremove(vnode$$1);
				if (vnode$$1.dom) {
					var count = vnode$$1.domSize || 1;
					if (count > 1) {
						var dom = vnode$$1.dom;
						while (--count) {
							removeNodeFromDOM(dom.nextSibling);
						}
					}
					removeNodeFromDOM(vnode$$1.dom);
					if (context != null && vnode$$1.domSize == null && !hasIntegrationMethods(vnode$$1.attrs) && typeof vnode$$1.tag === "string") { //TODO test custom elements
						if (!context.pool) { context.pool = [vnode$$1]; }
						else { context.pool.push(vnode$$1); }
					}
				}
			}
		}
	}
	function removeNodeFromDOM(node) {
		var parent = node.parentNode;
		if (parent != null) { parent.removeChild(node); }
	}
	function onremove(vnode$$1) {
		if (vnode$$1.attrs && typeof vnode$$1.attrs.onremove === "function") { vnode$$1.attrs.onremove.call(vnode$$1.state, vnode$$1); }
		if (typeof vnode$$1.tag !== "string" && typeof vnode$$1._state.onremove === "function") { vnode$$1._state.onremove.call(vnode$$1.state, vnode$$1); }
		if (vnode$$1.instance != null) { onremove(vnode$$1.instance); }
		else {
			var children = vnode$$1.children;
			if (Array.isArray(children)) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					if (child != null) { onremove(child); }
				}
			}
		}
	}

	//attrs
	function setAttrs(vnode$$1, attrs, ns) {
		for (var key in attrs) {
			setAttr(vnode$$1, key, null, attrs[key], ns);
		}
	}
	function setAttr(vnode$$1, key, old, value, ns) {
		var element = vnode$$1.dom;
		if (key === "key" || key === "is" || (old === value && !isFormAttribute(vnode$$1, key)) && typeof value !== "object" || typeof value === "undefined" || isLifecycleMethod(key)) { return }
		var nsLastIndex = key.indexOf(":");
		if (nsLastIndex > -1 && key.substr(0, nsLastIndex) === "xlink") {
			element.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(nsLastIndex + 1), value);
		}
		else if (key[0] === "o" && key[1] === "n" && typeof value === "function") { updateEvent(vnode$$1, key, value); }
		else if (key === "style") { updateStyle(element, old, value); }
		else if (key in element && !isAttribute(key) && ns === undefined && !isCustomElement(vnode$$1)) {
			//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
			if (vnode$$1.tag === "input" && key === "value" && vnode$$1.dom.value == value && vnode$$1.dom === $doc.activeElement) { return }
			//setting select[value] to same value while having select open blinks select dropdown in Chrome
			if (vnode$$1.tag === "select" && key === "value" && vnode$$1.dom.value == value && vnode$$1.dom === $doc.activeElement) { return }
			//setting option[value] to same value while having select open blinks select dropdown in Chrome
			if (vnode$$1.tag === "option" && key === "value" && vnode$$1.dom.value == value) { return }
			// If you assign an input type that is not supported by IE 11 with an assignment expression, an error will occur.
			if (vnode$$1.tag === "input" && key === "type") {
				element.setAttribute(key, value);
				return
			}
			element[key] = value;
		}
		else {
			if (typeof value === "boolean") {
				if (value) { element.setAttribute(key, ""); }
				else { element.removeAttribute(key); }
			}
			else { element.setAttribute(key === "className" ? "class" : key, value); }
		}
	}
	function setLateAttrs(vnode$$1) {
		var attrs = vnode$$1.attrs;
		if (vnode$$1.tag === "select" && attrs != null) {
			if ("value" in attrs) { setAttr(vnode$$1, "value", null, attrs.value, undefined); }
			if ("selectedIndex" in attrs) { setAttr(vnode$$1, "selectedIndex", null, attrs.selectedIndex, undefined); }
		}
	}
	function updateAttrs(vnode$$1, old, attrs, ns) {
		if (attrs != null) {
			for (var key in attrs) {
				setAttr(vnode$$1, key, old && old[key], attrs[key], ns);
			}
		}
		if (old != null) {
			for (var key in old) {
				if (attrs == null || !(key in attrs)) {
					if (key === "className") { key = "class"; }
					if (key[0] === "o" && key[1] === "n" && !isLifecycleMethod(key)) { updateEvent(vnode$$1, key, undefined); }
					else if (key !== "key") { vnode$$1.dom.removeAttribute(key); }
				}
			}
		}
	}
	function isFormAttribute(vnode$$1, attr) {
		return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode$$1.dom === $doc.activeElement
	}
	function isLifecycleMethod(attr) {
		return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
	}
	function isAttribute(attr) {
		return attr === "href" || attr === "list" || attr === "form" || attr === "width" || attr === "height"// || attr === "type"
	}
	function isCustomElement(vnode$$1){
		return vnode$$1.attrs.is || vnode$$1.tag.indexOf("-") > -1
	}
	function hasIntegrationMethods(source) {
		return source != null && (source.oncreate || source.onupdate || source.onbeforeremove || source.onremove)
	}

	//style
	function updateStyle(element, old, style) {
		if (old === style) { element.style.cssText = "", old = null; }
		if (style == null) { element.style.cssText = ""; }
		else if (typeof style === "string") { element.style.cssText = style; }
		else {
			if (typeof old === "string") { element.style.cssText = ""; }
			for (var key in style) {
				element.style[key] = style[key];
			}
			if (old != null && typeof old !== "string") {
				for (var key in old) {
					if (!(key in style)) { element.style[key] = ""; }
				}
			}
		}
	}

	//event
	function updateEvent(vnode$$1, key, value) {
		var element = vnode$$1.dom;
		var callback = typeof onevent !== "function" ? value : function(e) {
			var result = value.call(element, e);
			onevent.call(element, e);
			return result
		};
		if (key in element) { element[key] = typeof value === "function" ? callback : null; }
		else {
			var eventName = key.slice(2);
			if (vnode$$1.events === undefined) { vnode$$1.events = {}; }
			if (vnode$$1.events[key] === callback) { return }
			if (vnode$$1.events[key] != null) { element.removeEventListener(eventName, vnode$$1.events[key], false); }
			if (typeof value === "function") {
				vnode$$1.events[key] = callback;
				element.addEventListener(eventName, vnode$$1.events[key], false);
			}
		}
	}

	//lifecycle
	function initLifecycle(source, vnode$$1, hooks) {
		if (typeof source.oninit === "function") { source.oninit.call(vnode$$1.state, vnode$$1); }
		if (typeof source.oncreate === "function") { hooks.push(source.oncreate.bind(vnode$$1.state, vnode$$1)); }
	}
	function updateLifecycle(source, vnode$$1, hooks) {
		if (typeof source.onupdate === "function") { hooks.push(source.onupdate.bind(vnode$$1.state, vnode$$1)); }
	}
	function shouldNotUpdate(vnode$$1, old) {
		var forceVnodeUpdate, forceComponentUpdate;
		if (vnode$$1.attrs != null && typeof vnode$$1.attrs.onbeforeupdate === "function") { forceVnodeUpdate = vnode$$1.attrs.onbeforeupdate.call(vnode$$1.state, vnode$$1, old); }
		if (typeof vnode$$1.tag !== "string" && typeof vnode$$1._state.onbeforeupdate === "function") { forceComponentUpdate = vnode$$1._state.onbeforeupdate.call(vnode$$1.state, vnode$$1, old); }
		if (!(forceVnodeUpdate === undefined && forceComponentUpdate === undefined) && !forceVnodeUpdate && !forceComponentUpdate) {
			vnode$$1.dom = old.dom;
			vnode$$1.domSize = old.domSize;
			vnode$$1.instance = old.instance;
			return true
		}
		return false
	}

	function render(dom, vnodes) {
		if (!dom) { throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.") }
		var hooks = [];
		var active = $doc.activeElement;

		// First time rendering into a node clears it out
		if (dom.vnodes == null) { dom.textContent = ""; }

		if (!Array.isArray(vnodes)) { vnodes = [vnodes]; }
		updateNodes(dom, dom.vnodes, vnode.normalizeChildren(vnodes), false, hooks, null, undefined);
		dom.vnodes = vnodes;
		for (var i = 0; i < hooks.length; i++) { hooks[i](); }
		if ($doc.activeElement !== active) { active.focus(); }
	}

	return {render: render, setEventCallback: setEventCallback}
};

var render$1 = render$2(window);

var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g;
var selectorCache = {};
var hasOwn = {}.hasOwnProperty;

function compileSelector(selector) {
	var match, tag = "div", classes = [], attrs = {};
	while (match = selectorParser.exec(selector)) {
		var type = match[1], value = match[2];
		if (type === "" && value !== "") { tag = value; }
		else if (type === "#") { attrs.id = value; }
		else if (type === ".") { classes.push(value); }
		else if (match[3][0] === "[") {
			var attrValue = match[6];
			if (attrValue) { attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\"); }
			if (match[4] === "class") { classes.push(attrValue); }
			else { attrs[match[4]] = attrValue || true; }
		}
	}
	if (classes.length > 0) { attrs.className = classes.join(" "); }
	return selectorCache[selector] = {tag: tag, attrs: attrs}
}

function execSelector(state, attrs, children) {
	var hasAttrs = false, childList, text;
	var className = attrs.className || attrs.class;

	for (var key in state.attrs) {
		if (hasOwn.call(state.attrs, key)) {
			attrs[key] = state.attrs[key];
		}
	}

	if (className !== undefined) {
		if (attrs.class !== undefined) {
			attrs.class = undefined;
			attrs.className = className;
		}

		if (state.attrs.className != null) {
			attrs.className = state.attrs.className + " " + className;
		}
	}

	for (var key in attrs) {
		if (hasOwn.call(attrs, key) && key !== "key") {
			hasAttrs = true;
			break
		}
	}

	if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
		text = children[0].children;
	} else {
		childList = children;
	}

	return vnode(state.tag, attrs.key, hasAttrs ? attrs : undefined, childList, text)
}

function hyperscript$1(selector) {
	var arguments$1 = arguments;

	// Because sloppy mode sucks
	var attrs = arguments[1], start = 2, children;

	if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
		throw Error("The selector must be either a string or a component.");
	}

	if (typeof selector === "string") {
		var cached = selectorCache[selector] || compileSelector(selector);
	}

	if (attrs == null) {
		attrs = {};
	} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
		attrs = {};
		start = 1;
	}

	if (arguments.length === start + 1) {
		children = arguments[start];
		if (!Array.isArray(children)) { children = [children]; }
	} else {
		children = [];
		while (start < arguments.length) { children.push(arguments$1[start++]); }
	}

	var normalized = vnode.normalizeChildren(children);

	if (typeof selector === "string") {
		return execSelector(cached, attrs, normalized)
	} else {
		return vnode(selector, attrs.key, attrs, normalized)
	}
}

var hyperscript_1$1 = hyperscript$1;

var trust = function(html) {
	if (html == null) { html = ""; }
	return vnode("<", undefined, undefined, html, undefined, undefined)
};

var fragment = function(attrs, children) {
	return vnode("[", attrs.key, attrs, vnode.normalizeChildren(children), undefined, undefined)
};

hyperscript_1$1.trust = trust;
hyperscript_1$1.fragment = fragment;

var hyperscript_1 = hyperscript_1$1;

var isInitialized = false;

var app$1 = {
	state: {},
	actions: {},
	root: null
};

function blixt(opts) {

	if (isInitialized) {
		throw Error('Blixt has already been initialized');
	}

	isInitialized = true;
	app$1.root = opts.root;
	var modules = opts.modules || {};
	Object.keys(modules).forEach(function(namespace) {
		app$1.state[namespace] = modules[namespace].state || {};
		app$1.actions[namespace] = modules[namespace].actions || {};
	});

	// return app.actions, so user can run app[namespace][action](args);
	return app$1.actions;

}

var lastRenderedArgs;
function render() {
	var args = [], len = arguments.length;
	while ( len-- ) args[ len ] = arguments[ len ];

	lastRenderedArgs = args;
	render$1.render(app$1.root, hyperscript_1.apply(hyperscript_1, args));
}

var redrawScheduled = false;
function redraw() {
	if (redrawScheduled) { return; }
	redrawScheduled = true;
	requestAnimationFrame(function() {
		redrawScheduled = false;
		blixt.render.apply(blixt.render, lastRenderedArgs);
	});
}

function getState() {
	var path = [], len = arguments.length;
	while ( len-- ) path[ len ] = arguments[ len ];

	var state = app$1.state;
	path.forEach(function(segment) {
		state = state[segment];
	});
	return state;
}


function getContext(state, boundActions) {
	return {
		state: state,
		actions: boundActions
	};
}

var noop = function () {};
var isPromise = function (x) { return x && x.constructor && (typeof x.then === 'function'); };

function maybeRedraw(result) {
	if (result && result.redraw === false) { return; }
	blixt.redraw();
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
							maybeRedraw(value);
						});
					}
					fn(state);
					maybeRedraw(result);
					return result;
				};
			});
			return boundActions;
		}
	};
}

blixt.getState = getState;
blixt.render = render;
blixt.redraw = redraw;
blixt.actions = actions;
blixt.h = hyperscript_1;

var h = hyperscript_1;

var renderCount = 0;
var oldRender = blixt.render;
blixt.render = function(component, attrs) {
	renderCount++;
	oldRender(component, attrs);
};

// ------------------- global test state --------------------

// basic typechecker to test actions({}, typechecker);
function typeCheck(schema) {
	var typeChecker = function(state) {
		typeChecker.callCount++;
		Object.keys(schema).forEach(function(key) {
			if (typeof state[key] !== schema[key]) {
				typeChecker.hasError = true;
			}
		});
	};
	typeChecker.hasError = false;
	typeChecker.callCount = 0;
	return typeChecker;
}

var stateModule = (function() {
	var state = { foo: 'bar' };
	return { state: state };
})();

var complexStateModule = (function() {
	var state = { foo: 'bar', baz: [ { a: [1, 2, 3] } ] };
	return { state: state };
})();


var statelessActions = blixt.actions({
	foo: function foo(context, arg1, arg2) {
		return { context: context, arg1: arg1, arg2: arg2, bar: 'baz' };
	}
}).bindTo(null);

var unboundActionModule = (function() {
	return { actions: statelessActions };
})();

var arrayStateModule = (function() {
	var state = [1, 2, 3];
	var actions$$1 = blixt.actions({
		append: function append(context, number) {
			context.state.push(number);
		},
		remove: function remove(context, number) {
			var index = context.state.indexOf(number);
			context.state.splice(index, 1);
		}
	}).bindTo(state);
	return { state: state, actions: actions$$1 };
})();

var counterActions = blixt.actions({
	increment: function increment(ref) {
		var state = ref.state;

		state.number++;
	},
	incBy: function incBy(ref, amount) {
		var state = ref.state;

		state.number += amount;
	},
	decrement: function decrement(ref) {
		var actions$$1 = ref.actions;

		actions$$1.incBy(-1);
	},
	incWithoutRedraw: function incWithoutRedraw(ref) {
		var state = ref.state;

		state.number++;
		return { redraw: false, doubleN: state.number * 2 };
	},
	setTo: function setTo(ref, number) {
		var state = ref.state;

		state.number = number;
	},
	asyncInc2: function asyncInc2(ref) {
		var state = ref.state;

		return new Promise(function(resolve) {
			setTimeout(function() {
				state.number += 2;
				resolve();
			}, 500);
		});
	},
	asyncInc2NoRedraw: function asyncInc2NoRedraw(ref) {
		var state = ref.state;

		return new Promise(function(resolve) {
			setTimeout(function() {
				state.number += 2;
				resolve({ redraw: false });
			}, 500);
		});
	}
});

var counterModule = (function() {
	var state = { number: 0 };
	var actions$$1 = counterActions.bindTo(state);
	return { state: state, actions: actions$$1 };
})();


var appRoot = document.getElementById('app');

var app = blixt({
	modules: {
		stateModule: stateModule,
		complexStateModule: complexStateModule,
		unboundActionModule: unboundActionModule,
		counter: counterModule,
		arrayModule: arrayStateModule
	},
	root: appRoot
});

var CountComponent = {
	view: function (ref) {
		var attrs = ref.attrs;

		return blixt.h('h2', 'count: ' + attrs.number);
}
};

// ------------------- tests --------------------

index$1('blixt', function(it) {

	it('throws if initialized more than once', function(expect) {

		expect(function() {
			blixt({
				modules: { stateModule: stateModule, unboundActionModule: unboundActionModule, counter: counterModule },
				root: appRoot
			});
		}).to.explode();

		try {
			blixt({
				modules: { stateModule: stateModule, unboundActionModule: unboundActionModule, counter: counterModule },
				root: appRoot
			});
		}
		catch (err) {
			expect(err.message).to.equal('Blixt has already been initialized');
		}

	});


	index$1('view', function() {

		it('renders hyperscript', function(expect) {
			blixt.render(CountComponent, { number: 123 });
			expect(appRoot.innerHTML).to.equal('<h2>count: 123</h2>');
			blixt.render(CountComponent, { number: 456 });
			expect(appRoot.innerHTML).to.equal('<h2>count: 456</h2>');
			expect(renderCount).to.equal(2);
		});

		it('redraws async', function(expect, done) {
			blixt.redraw();
			expect(renderCount).to.equal(2);
			setTimeout(function() {
				expect(renderCount).to.equal(3);
				done();
			}, 50);
		});

		it('batches redraws', function(expect, done) {
			var initialRenderCount = renderCount;
			blixt.redraw();
			blixt.redraw();
			blixt.redraw();
			blixt.redraw();
			blixt.redraw();
			expect(renderCount).to.equal(3);
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 1);
				done();
			}, 50);
		});

	});

	index$1('modules', function() {

		it('initializes modules', function(expect) {
			expect(blixt.getState('counter')).to.deep.equal({ number: 0 });
		});

		it('initializes state-only modules', function(expect) {
			expect(blixt.getState('stateModule')).to.deep.equal({ foo: 'bar' });
		});

		it('initializes actions-only modules', function(expect) {
			expect(blixt.getState('unboundActionModule')).to.deep.equal({});
		});

		it('initializes array modules', function(expect) {
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3]);
		});

		it('initializes simple modules', function(expect) {
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3]);
		});

	});

	index$1('getState', function() {
		it('traverses path to state', function(expect) {
			expect(blixt.getState('complexStateModule', 'baz', '0', 'a')).to.deep.equal([1, 2, 3]);
		});
		it('traverses array state', function(expect) {
			expect(blixt.getState('arrayModule', 2)).to.equal(3);
		});
	});

	index$1('actions', function() {

		it('works if not bound to state', function(expect) {
			expect(typeof statelessActions.foo).to.equal('function');
			expect(statelessActions.foo(1, 'foo').arg1).to.equal(1);
			expect(statelessActions.foo(1, 'foo').arg2).to.equal('foo');
			expect(statelessActions.foo(1, 'foo').bar).to.equal('baz');
			expect(statelessActions.foo(1, 'foo').context.actions).to.equal(statelessActions);
			expect(statelessActions.foo(1, 'foo').context.state).to.equal(null);
		});

		it('works if bound to state', function(expect) {
			var state = { number: 0 };
			var actions$$1 = counterActions.bindTo(state);
			actions$$1.increment();
			expect(state.number).to.equal(1);
		});

		it('redraws when action is complete', function(expect, done) {
			var state = { number: 1000 };
			var actions$$1 = counterActions.bindTo(state);
			var initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 1000</h2>');
			actions$$1.decrement();
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 2);
				expect(appRoot.innerHTML).to.equal('<h2>count: 999</h2>');
				done();
			}, 50);
		});

		it('does not redraw if action returns `noRedraw`', function(expect, done) {
			var state = { number: 1000 };
			var actions$$1 = counterActions.bindTo(state);
			var initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 1000</h2>');
			actions$$1.incWithoutRedraw();
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 1);
				expect(appRoot.innerHTML).to.equal('<h2>count: 1000</h2>');
				blixt.redraw();
				setTimeout(function() {
					expect(renderCount).to.equal(initialRenderCount + 2);
					expect(appRoot.innerHTML).to.equal('<h2>count: 1001</h2>');
					done();
				}, 50);
			}, 50);
		});

		it('runs function (typecheck) when actions are bound', function(expect) {
			var T = typeCheck({ foo: 'string', bar: 'number', baz: 'function' });
			var goodState = { foo: '123', bar: 456, baz: function() {} };
			var badState = { foo: 123, bar: 456, baz: 789 };

			expect(T.hasError).to.equal(false);
			expect(T.callCount).to.equal(0);

			blixt.actions({}, T).bindTo(goodState);
			expect(T.hasError).to.equal(false);
			expect(T.callCount).to.equal(1);

			blixt.actions({}, T).bindTo(badState);
			expect(T.hasError).to.equal(true);
			expect(T.callCount).to.equal(2);
		});

		it('runs function (typecheck) after an action runs', function(expect) {
			var T = typeCheck({ foo: 'number', bar: 'number' });
			var model = { foo: 123, bar: 456 };
			var actions$$1 = {
				incFoo: function incFoo(ref) {
				var state = ref.state;
 state.foo = state.foo + 1; }
			};
			var boundActions = blixt.actions(actions$$1, T).bindTo(model);
			expect(T.hasError).to.equal(false);
			expect(T.callCount).to.equal(1);

			boundActions.incFoo();
			expect(model.foo).to.equal(124);
			expect(T.callCount).to.equal(2);
			expect(T.hasError).to.equal(false);

			model.foo = 'foo:';
			boundActions.incFoo();
			expect(model.foo).to.equal('foo:1');
			expect(T.callCount).to.equal(3);
			expect(T.hasError).to.equal(true);
		});

		it('[wait] (prepare for async test next)', function(expect, done) {
			setTimeout(done, 50);
		});

		it('runs async promise action', function(expect, done) {
			var state = { number: 40 };
			var actions$$1 = counterActions.bindTo(state);
			var initialRenderCount = renderCount;
			actions$$1.asyncInc2();
			expect(state.number).to.equal(40);
			expect(renderCount).to.equal(initialRenderCount);
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount);
				expect(state.number).to.equal(40);
				setTimeout(function() {
					expect(renderCount).to.equal(initialRenderCount + 1);
					expect(state.number).to.equal(42);
					done();
				}, 700);
			}, 50);
		});

		it('runs async promise action that resolves to `noRedraw`', function(expect, done) {
			var state = { number: 2000 };
			var actions$$1 = counterActions.bindTo(state);
			var initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 2000</h2>');
			actions$$1.asyncInc2NoRedraw();
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 1);
				expect(appRoot.innerHTML).to.equal('<h2>count: 2000</h2>');
				expect(state.number).to.equal(2002);
				blixt.redraw();
				setTimeout(function() {
					expect(renderCount).to.equal(initialRenderCount + 2);
					expect(appRoot.innerHTML).to.equal('<h2>count: 2002</h2>');
					done();
				}, 50);
			}, 700);
		});

		it('runs function (typecheck) after async action promise resolves [pass]', function(expect, done) {
			var T = typeCheck({ foo: 'number', bar: 'number' });
			var model = { foo: 123, bar: 456 };
			var actions$$1 = {
				incFooAsync: function incFooAsync(ref) {
					var state = ref.state;

					return new Promise(function(resolve) {
						setTimeout(function() {
							state.foo = state.foo + 1;
							resolve();
						}, 500);
					});
				}
			};

			var boundActions = blixt.actions(actions$$1, T).bindTo(model);
			expect(T.hasError).to.equal(false);
			expect(T.callCount).to.equal(1);

			// nothing changes until promise resolves
			boundActions.incFooAsync();
			expect(model.foo).to.equal(123);
			expect(T.callCount).to.equal(1);
			expect(T.hasError).to.equal(false);

			setTimeout(function() {
				expect(model.foo).to.equal(124);
				expect(T.callCount).to.equal(2);
				expect(T.hasError).to.equal(false);
				done();
			}, 700);

		});

		it('runs function (typecheck) after async action promise resolves [fail]', function(expect, done) {
			var T = typeCheck({ foo: 'number', bar: 'number' });
			var model = { foo: 123, bar: 456 };
			var actions$$1 = {
				incFooAsync: function incFooAsync(ref) {
					var state = ref.state;

					return new Promise(function(resolve) {
						setTimeout(function() {
							state.foo = state.foo + 1;
							resolve();
						}, 500);
					});
				}
			};

			var boundActions = blixt.actions(actions$$1, T).bindTo(model);
			model.foo = 'foo:';
			expect(T.hasError).to.equal(false);
			expect(T.callCount).to.equal(1);

			// nothing changes until promise resolves
			// no typechecking occurs yet either
			boundActions.incFooAsync();
			expect(model.foo).to.equal('foo:');
			expect(T.callCount).to.equal(1);
			expect(T.hasError).to.equal(false);

			setTimeout(function() {
				expect(model.foo).to.equal('foo:1');
				expect(T.callCount).to.equal(2);
				expect(T.hasError).to.equal(true);
				done();
			}, 700);

		});

	});

	index$1('emit app actions', function() {

		it('triggers bound actions', function(expect) {
			expect(blixt.getState('counter').number).to.equal(0);
			app.counter.increment();
			expect(blixt.getState('counter').number).to.equal(1);
			app.counter.decrement();
			expect(blixt.getState('counter').number).to.equal(0);
			app.counter.incBy(10);
			expect(blixt.getState('counter').number).to.equal(10);
		});

		it('triggers unbound actions', function(expect) {
			var x = app.unboundActionModule.foo('hello', 'world');
			expect(x.arg1).to.equal('hello');
			expect(x.arg2).to.equal('world');
			expect(x.bar).to.equal('baz');
			expect(x.context.actions).to.equal(statelessActions);
			expect(x.context.state).to.equal(null);
		});

		it('updates state synchronously', function(expect) {
			app.counter.setTo(555);
			var state = blixt.getState('counter');
			expect(state).to.deep.equal({ number: 555 });
		});

		it('updates DOM correctly', function(expect, done) {
			var state = blixt.getState('counter');
			expect(state).to.deep.equal({ number: 555 }); // shouldn't have changed from previous test
			var initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			app.counter.incBy(222);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 555</h2>');
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 2);
				expect(appRoot.innerHTML).to.equal('<h2>count: 777</h2>');
				done();
			}, 50);
		});

		it('works with array state', function(expect) {
			var state = blixt.getState('arrayModule');
			expect(state).to.deep.equal([1, 2, 3]);
			app.arrayModule.append(4);
			app.arrayModule.append(100);
			app.arrayModule.append(10);
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3, 4, 100, 10]);
			app.arrayModule.remove(100);
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3, 4, 10]);
		});

	});

	index$1('works with exported functions', function() {

		it('getState', function(expect) {
			expect(getState('counter')).to.deep.equal({ number: 777 });
			expect(getState).to.equal(blixt.getState);
		});

		it('actions', function(expect) {
			expect(actions).to.equal(blixt.actions);
		});

		it('render', function(expect) {
			expect(render).to.equal(oldRender);
		});

		it('redraw', function(expect) {
			expect(redraw).to.equal(blixt.redraw);
		});

		it('hyperscript', function(expect) {
			expect(h).to.equal(blixt.h);
		});

	});

})();

}());
