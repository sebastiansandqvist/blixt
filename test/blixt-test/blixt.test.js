import test from 'testesterone';
import blixt from '../../index.js';

import {
	render,
	redraw,
	getState,
	actions as importedActions,
	h
} from '../../index.js';

// ------------------- mocks/stubs --------------------

let renderCount = 0;
const oldRender = blixt.render;
blixt.render = function(component, attrs) {
	renderCount++;
	oldRender(component, attrs);
};

// ------------------- global test state --------------------

// basic typechecker to test actions({}, typechecker);
function typeCheck(schema) {
	const typeChecker = function(state) {
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

const stateModule = (function() {
	const state = { foo: 'bar' };
	return { state };
})();

const complexStateModule = (function() {
	const state = { foo: 'bar', baz: [ { a: [1, 2, 3] } ] };
	return { state };
})();


const statelessActions = blixt.actions({
	foo(context, arg1, arg2) {
		return { context, arg1, arg2, bar: 'baz' };
	}
}).bindTo(null);

const unboundActionModule = (function() {
	return { actions: statelessActions };
})();

const arrayStateModule = (function() {
	const state = [1, 2, 3];
	const actions = blixt.actions({
		append(context, number) {
			context.state.push(number);
		},
		remove(context, number) {
			const index = context.state.indexOf(number);
			context.state.splice(index, 1);
		}
	}).bindTo(state);
	return { state, actions };
})();

const counterActions = blixt.actions({
	increment({ state }) {
		state.number++;
	},
	incBy({ state }, amount) {
		state.number += amount;
	},
	decrement({ actions }) {
		actions.incBy(-1);
	},
	incWithoutRedraw({ state }) {
		state.number++;
		return { redraw: false, doubleN: state.number * 2 };
	},
	setTo({ state }, number) {
		state.number = number;
	},
	asyncInc2({ state }) {
		return new Promise(function(resolve) {
			setTimeout(function() {
				state.number += 2;
				resolve();
			}, 500);
		});
	},
	asyncInc2NoRedraw({ state }) {
		return new Promise(function(resolve) {
			setTimeout(function() {
				state.number += 2;
				resolve({ redraw: false });
			}, 500);
		});
	}
});

const counterModule = (function() {
	const state = { number: 0 };
	const actions = counterActions.bindTo(state);
	return { state, actions };
})();


const appRoot = document.getElementById('app');

const app = blixt({
	modules: {
		stateModule,
		complexStateModule,
		unboundActionModule,
		counter: counterModule,
		arrayModule: arrayStateModule
	},
	root: appRoot
});

const CountComponent = {
	view: ({ attrs }) => blixt.h('h2', 'count: ' + attrs.number)
};

// ------------------- tests --------------------

test('blixt', function(it) {

	it('throws if initialized more than once', function(expect) {

		expect(function() {
			blixt({
				modules: { stateModule, unboundActionModule, counter: counterModule },
				root: appRoot
			});
		}).to.explode();

		try {
			blixt({
				modules: { stateModule, unboundActionModule, counter: counterModule },
				root: appRoot
			});
		}
		catch (err) {
			expect(err.message).to.equal('Blixt has already been initialized');
		}

	});


	test('view', function() {

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
			const initialRenderCount = renderCount;
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

	test('modules', function() {

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

	test('getState', function() {
		it('traverses path to state', function(expect) {
			expect(blixt.getState('complexStateModule', 'baz', '0', 'a')).to.deep.equal([1, 2, 3]);
		});
		it('traverses array state', function(expect) {
			expect(blixt.getState('arrayModule', 2)).to.equal(3);
		});
	});

	test('actions', function() {

		it('works if not bound to state', function(expect) {
			expect(typeof statelessActions.foo).to.equal('function');
			expect(statelessActions.foo(1, 'foo').arg1).to.equal(1);
			expect(statelessActions.foo(1, 'foo').arg2).to.equal('foo');
			expect(statelessActions.foo(1, 'foo').bar).to.equal('baz');
			expect(statelessActions.foo(1, 'foo').context.actions).to.equal(statelessActions);
			expect(statelessActions.foo(1, 'foo').context.state).to.equal(null);
		});

		it('works if bound to state', function(expect) {
			const state = { number: 0 };
			const actions = counterActions.bindTo(state);
			actions.increment();
			expect(state.number).to.equal(1);
		});

		it('redraws when action is complete', function(expect, done) {
			const state = { number: 1000 };
			const actions = counterActions.bindTo(state);
			const initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 1000</h2>');
			actions.decrement();
			setTimeout(function() {
				expect(renderCount).to.equal(initialRenderCount + 2);
				expect(appRoot.innerHTML).to.equal('<h2>count: 999</h2>');
				done();
			}, 50);
		});

		it('does not redraw if action returns `noRedraw`', function(expect, done) {
			const state = { number: 1000 };
			const actions = counterActions.bindTo(state);
			const initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 1000</h2>');
			actions.incWithoutRedraw();
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
			const T = typeCheck({ foo: 'string', bar: 'number', baz: 'function' });
			const goodState = { foo: '123', bar: 456, baz: function() {} };
			const badState = { foo: 123, bar: 456, baz: 789 };

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
			const T = typeCheck({ foo: 'number', bar: 'number' });
			const model = { foo: 123, bar: 456 };
			const actions = {
				incFoo({ state }) { state.foo = state.foo + 1; }
			};
			const boundActions = blixt.actions(actions, T).bindTo(model);
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
			const state = { number: 40 };
			const actions = counterActions.bindTo(state);
			const initialRenderCount = renderCount;
			actions.asyncInc2();
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
			const state = { number: 2000 };
			const actions = counterActions.bindTo(state);
			const initialRenderCount = renderCount;
			blixt.render(CountComponent, state);
			expect(renderCount).to.equal(initialRenderCount + 1);
			expect(appRoot.innerHTML).to.equal('<h2>count: 2000</h2>');
			actions.asyncInc2NoRedraw();
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
			const T = typeCheck({ foo: 'number', bar: 'number' });
			const model = { foo: 123, bar: 456 };
			const actions = {
				incFooAsync({ state }) {
					return new Promise(function(resolve) {
						setTimeout(function() {
							state.foo = state.foo + 1;
							resolve();
						}, 500);
					});
				}
			};

			const boundActions = blixt.actions(actions, T).bindTo(model);
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
			const T = typeCheck({ foo: 'number', bar: 'number' });
			const model = { foo: 123, bar: 456 };
			const actions = {
				incFooAsync({ state }) {
					return new Promise(function(resolve) {
						setTimeout(function() {
							state.foo = state.foo + 1;
							resolve();
						}, 500);
					});
				}
			};

			const boundActions = blixt.actions(actions, T).bindTo(model);
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

	test('emit app actions', function() {

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
			const x = app.unboundActionModule.foo('hello', 'world');
			expect(x.arg1).to.equal('hello');
			expect(x.arg2).to.equal('world');
			expect(x.bar).to.equal('baz');
			expect(x.context.actions).to.equal(statelessActions);
			expect(x.context.state).to.equal(null);
		});

		it('updates state synchronously', function(expect) {
			app.counter.setTo(555);
			const state = blixt.getState('counter');
			expect(state).to.deep.equal({ number: 555 });
		});

		it('updates DOM correctly', function(expect, done) {
			const state = blixt.getState('counter');
			expect(state).to.deep.equal({ number: 555 }); // shouldn't have changed from previous test
			const initialRenderCount = renderCount;
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
			const state = blixt.getState('arrayModule');
			expect(state).to.deep.equal([1, 2, 3]);
			app.arrayModule.append(4);
			app.arrayModule.append(100);
			app.arrayModule.append(10);
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3, 4, 100, 10]);
			app.arrayModule.remove(100);
			expect(blixt.getState('arrayModule')).to.deep.equal([1, 2, 3, 4, 10]);
		});

	});

	test('works with exported functions', function() {

		it('getState', function(expect) {
			expect(getState('counter')).to.deep.equal({ number: 777 });
			expect(getState).to.equal(blixt.getState);
		});

		it('actions', function(expect) {
			expect(importedActions).to.equal(blixt.actions);
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