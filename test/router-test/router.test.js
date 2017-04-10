import test from 'testesterone';
import blixt from '../../index.js';
import router from '../../router';

// import { h } from '../../index.js';

const appRoot = document.getElementById('app');

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

const Component = {
	view({ attrs }) {
		return [
			blixt.h('strong', 'route: '),
			blixt.h('span', attrs.route),
			blixt.h('hr'),
			blixt.h('strong', 'path: '),
			blixt.h('span', attrs.path),
			blixt.h('hr'),
			blixt.h('strong', 'hash: '),
			blixt.h('span', attrs.hash),
			blixt.h('hr'),
			blixt.h('strong', 'search: '),
			blixt.h('span', attrs.search),
			blixt.h('hr'),
			blixt.h('strong', 'params: '),
			blixt.h('span', JSON.stringify(attrs.params, null, 2))
		];
	}
};

const app = blixt({
	modules: {
		router: router({
			'/': TestRoute,
			'/foo': TestRoute,
			'/foo/bar': TestRoute,
			'/foo/:baz': TestRoute,
			'/test/': TestRoute,
			'/test/123/:foo/test/:bar/:baz': TestRoute,
			'/rendered': (route) => blixt.render(Component, route),
			'/rendered/:foo/:bar': (route) => blixt.render(Component, route),
			'*': CatchAll
		})
	},
	root: appRoot
});

window.app = app;

test('blixt router', function(it) {

	test('setup', function() {

		it('throws if not provided catch-all * route', function(expect) {
			expect(function() {
				router({ '/foo': () => {} });
			}).to.explode();
		});

		it('sets initial state', function(expect) {
			expect(blixt.getState('router')).to.deep.equal({
				route: '/',
				path: '/',
				hash: '',
				search: '',
				params: {}
			});
		});

	});

	test('set route', function() {

		it('changes route to non-matched route', function(expect) {
			const catchAllCount = CatchAll.callCount;
			expect(window.location.pathname).to.equal('/');
			app.router.set('/some-route');
			expect(window.location.pathname).to.equal('/some-route');
			expect(blixt.getState('router', 'route')).to.equal('*');
			expect(blixt.getState('router', 'path')).to.equal('/some-route');
			expect(CatchAll.callCount).to.equal(catchAllCount + 1);
			expect(CatchAll.route).to.deep.equal(blixt.getState('router'));
		});

		it('changes route to matched route', function(expect) {
			const callCount = TestRoute.callCount;
			app.router.set('/foo');
			expect(window.location.pathname).to.equal('/foo');
			expect(blixt.getState('router', 'route')).to.equal('/foo');
			expect(blixt.getState('router', 'path')).to.equal('/foo');
			expect(TestRoute.callCount).to.equal(callCount + 1);
		});

		it('changes route to matched route with hash', function(expect) {
			app.router.set('/foo#bar');
			expect(window.location.pathname).to.equal('/foo');
			expect(window.location.hash).to.equal('#bar');
			expect(blixt.getState('router', 'route')).to.equal('/foo');
			expect(blixt.getState('router', 'path')).to.equal('/foo');
			expect(blixt.getState('router', 'hash')).to.equal('#bar');
		});

		it('changes route to matched route with search');
		it('changes route to matched route with hash and search');
		it('changes route to matched route with params');

		it('changes route to root route', function(expect) {
			const rootCount = TestRoute.callCount;
			app.router.set('/');
			expect(window.location.pathname).to.equal('/');
			expect(blixt.getState('router', 'route')).to.equal('/');
			expect(blixt.getState('router', 'path')).to.equal('/');
			expect(TestRoute.callCount).to.equal(rootCount + 1);
		});

	});

	test('on change', function() {

		it('updates state on hash change [note: onhashchange is async]', function(expect, done) {
			expect(window.location.hash).to.equal('');
			expect(blixt.getState('router', 'hash')).to.equal('');
			window.location.hash = 'foo';
			setTimeout(function() {
				expect(blixt.getState('router', 'hash')).to.equal('#foo');
				window.location.hash = '';
				setTimeout(done, 0);
			}, 0);
		});

		it('updates state on navigation back', function(expect, done) {
			expect(blixt.getState('router', 'hash')).to.equal('');
			window.history.pushState({}, '', '/foo/bar');
			window.history.pushState({}, '', '/test');
			// window.history.back();
			setTimeout(function() {
				expect(blixt.getState('router')).to.deep.equal({
					route: '/foo/bar',
					path: '/foo/bar',
					hash: '',
					search: '',
					params: {}
				});
				window.history.forward();
				window.history.pushState({}, '', '/');
				done();
			}, 0);

		});

		it('updates state on navigation forward');

	});

})();