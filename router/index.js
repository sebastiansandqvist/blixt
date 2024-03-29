import blixt from '../index.js';

const hasOwn = Object.prototype.hasOwnProperty;

// given ['', 'foo', 'bar', '', ''], return ['foo', 'bar']
function trim(arr) {
	let i = 0;
	let j = arr.length;
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

const splitRoute = (s) => trim(s.split('/'));


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
	const params = {};
	let isVariadic = false;
	for (let i = 0; i < routeSegments.length; i++) {
		const p = routeSegments[i].indexOf(':'); // parameterized part's index
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
	for (const route in routeMap) {
		if (hasOwn.call(routeMap, route)) {
			const routeSegments = splitRoute(route);
			const params = getParamsIfMatch(routeSegments, urlSegments);
			if (params) { return { route, params }; }
		}
	}
	return { route: '*', params: {} };
}

export default function router(routes) {

	if (routes['*'] === undefined) {
		throw new Error('Blixt router requires catch-all * route');
	}

	const routeActions = {
		set({ actions }, path) {
			window.history.pushState(null, '', path);
			actions.resolveRoute();
			// return { update: false };
		},
		resolveRoute({ state }) {
			const match = getMatch(routes, splitRoute(window.location.pathname));
			state.route = match.route;
			state.path = window.location.pathname;
			state.hash = window.location.hash;
			state.search = window.location.search;
			state.params = match.params;
			routes[match.route](state);
			// return { update: false };
		}
	};

	const state = {
		route: '',
		path: '',
		hash: '',
		search: '',
		params: {}
	};

	const actions = blixt.actions(routeActions).bindTo(state);

	actions.resolveRoute();
	window.onpopstate = actions.resolveRoute;
	
	return { state, actions };

}