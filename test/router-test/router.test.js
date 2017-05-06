import test from 'testesterone';
import blixt from '../../index.js';
import router from '../../router';

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


const app = blixt({
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

test('blixt router', function(it) {

	test('setup', function() {

		it('throws if not provided catch-all * route', function(expect) {
			expect(function() {
				router({ '/foo': () => {} });
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

	test('set route', function() {

		it('changes route to non-matched route', function(expect) {
			const catchAllCount = CatchAll.callCount;
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
			const callCount = TestRoute.callCount;
			app.route.set('/foo');
			expect(window.location.pathname).to.equal('/foo');
			expect(blixt.getState('route', 'route')).to.equal('/foo');
			expect(blixt.getState('route', 'path')).to.equal('/foo');
			expect(TestRoute.callCount).to.equal(callCount + 1);
			app.route.set('/');
		});

		it('changes route to matched route (non-zero parameterized index)', function(expect) {
			const callCount = TestRoute.callCount;
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
			const rootCount = TestRoute.callCount;
			app.route.set('/');
			expect(window.location.pathname).to.equal('/');
			expect(blixt.getState('route', 'route')).to.equal('/');
			expect(blixt.getState('route', 'path')).to.equal('/');
			expect(TestRoute.callCount).to.equal(rootCount + 1);
			app.route.set('/');
		});

	});

	test('navigation changes', function() {

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