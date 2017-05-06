import test from 'testesterone';
import blixt from '../../index.js';
import batch from '../../helpers/batch.js';
import m from 'mithril';

import {
	forceUpdate,
	getState,
	actions as importedActions
} from '../../index.js';

// ------------------- blixt setup --------------------

const counterModule = (function() {
	const s = { number: 3 };
	const a = blixt.actions({
		set({ state }, input) { state.number = input; },
		inc({ state }) { state.number++; },
		dec({ state }) { state.number--; },
		inc3({ actions }) {
			actions.inc();
			actions.inc();
			actions.inc();
		}
	}).bindTo(s);
	return { state: s, actions: a };
})();


let redrawCount = 0;
const batchedUpdater = batch(function(appState) {
	if (typeof appState !== 'object') { throw new Error('onUpdate to be called with app state'); }
	redrawCount++;
	m.redraw();
});

const app = blixt({
	modules: { count: counterModule },
	onUpdate: batchedUpdater
});

const Component = {
	view: () => m('div', 'value: ', blixt.getState('count', 'number'))
};

const mountNode = document.getElementById('app');
m.mount(mountNode, Component);

test('Blixt', function(it) {

	it('throws if initialized more than once', function(expect) {
		const errMessage = 'Blixt has already been initialized';
		expect(() => blixt({})).to.explode();
		try { blixt({}); }
		catch (err) { expect(err.message).to.equal(errMessage); }
	});

	test('actions', function() {

		const actions = blixt.actions({
			five: () => 5,
			foo: () => 'foo!',
			getModel: (model) => model,
			getInput: (model, input) => input,
			incCount({ state }) {
				state.count++;
			}
		});

		it('redraws after actions', function(expect, done) {
			redrawCount = 0;
			actions.bindTo(null).foo();
			requestAnimationFrame(function() {
				expect(redrawCount).to.equal(1);
				done();
			});
		});

		it('batches redraws', function(expect, done) {
			redrawCount = 0;
			const a = actions.bindTo(null);
			a.five();
			a.foo();
			a.foo();
			a.foo();
			a.foo();
			a.foo();
			requestAnimationFrame(function() {
				expect(redrawCount).to.equal(1);
				done();
			});
		});

		it('stateless', function(expect) {
			const a = actions.bindTo(null);
			expect(a.five()).to.equal(5);
			expect(a.foo()).to.equal('foo!');
			expect(a.getModel().state).to.equal(null);
			expect(a.getModel().actions).to.equal(a);
			expect(a.getInput(123)).to.equal(123);
		});

		it('stateful', function(expect) {
			const state = { count: 5 };
			const a = actions.bindTo(state);
			expect(a.getModel()).to.deep.equal({ actions: a, state: { count: 5 } });
			a.incCount();
			expect(a.getModel()).to.deep.equal({ actions: a, state: { count: 6 } });
		});

		it('stateful (multiple)', function(expect) {
			const state1 = { count: 5 };
			const state2 = { count: -50 };
			const a = actions.bindTo(state1);
			const b = actions.bindTo(state2);
			expect(a.getModel().state).to.deep.equal({ count: 5 });
			expect(b.getModel().state).to.deep.equal({ count: -50 });
			a.incCount();
			expect(a.getModel().state).to.deep.equal({ count: 6 });
			expect(b.getModel().state).to.deep.equal({ count: -50 });
			b.incCount();
			b.incCount();
			expect(b.getModel().state).to.deep.equal({ count: -48 });
			expect(a.getModel().state).to.deep.equal({ count: 6 });
		});

		it('runs callback after actions are initialized', function(expect) {
			let callCount = 0;
			const state1 = { x: 3 };
			const state2 = { x: 5 };
			const a = blixt.actions({}, function(state) {
				if (callCount === 0) { expect(state.x).to.equal(3); }
				else { expect(state.x).to.equal(5); }
				callCount++;
			});
			a.bindTo(state1);
			a.bindTo(state2);
			expect(callCount).to.equal(2);
		});

		it('runs callback after actions are run', function(expect) {
			let callCount = 0;
			const s = { x: 3 };
			const actions1 = blixt.actions({ inc({ state }) { state.x++; } }, function(state) {
				expect(typeof state.x).to.equal('number');
				callCount++;
			});
			const a = actions1.bindTo(s); // 1
			a.inc();                      // 2
			a.inc();                      // 3
			a.inc();                      // 4
			expect(callCount).to.equal(4);
		});

		it('works with array state', function(expect) {
			const s = [9, 8, 7];
			const a = blixt.actions({
				append({ state }, input) { state.push(input); }
			}).bindTo(s);
			a.append(6);
			expect(s).to.deep.equal([9, 8, 7, 6]);
		});

	});

	test('forceUpdate', function() {

		it('causes an update', function(expect, done) {
			requestAnimationFrame(function() {
				redrawCount = 0;
				blixt.forceUpdate();
				requestAnimationFrame(function() {
					expect(redrawCount).to.equal(1);
					done();
				});
			});
		});

	});

	test('modules', function() {

		it('gets initial state', function(expect) {
			expect(blixt.getState()).to.deep.equal({ count: { number: 3 } });
			expect(blixt.getState('count')).to.deep.equal({ number: 3 });
		});

		it('gets state by traversal', function(expect) {
			expect(blixt.getState('count', 'number')).to.equal(3);
		});

		it('has global actions', function(expect) {
			app.count.set(10);
			app.count.inc();
			expect(blixt.getState('count', 'number')).to.equal(11);
		});

		it('has actions that call other actions', function(expect) {
			app.count.set(10);
			app.count.inc3();
			expect(blixt.getState('count', 'number')).to.equal(13);
		});

	});

	test('dom updates', function() {
		it('works', function(expect, done) {
			app.count.set(123);
			requestAnimationFrame(function() {
				expect(mountNode.innerHTML).to.equal('<div>value: 123</div>');
				done();
			});
		});
	});

	test('works with exported functions', function() {
		it('getState', (t) => t(getState).equal(blixt.getState));
		it('actions', (t) => t(importedActions).equal(blixt.actions));
		it('forceUpdate', (t) => t(forceUpdate).equal(blixt.forceUpdate));
	});

})();