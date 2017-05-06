import blixt from '../index.js';


const hasOwn = Object.prototype.hasOwnProperty;
const splitRoute = (s) => s.split('/').filter((x) => Boolean(x));


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
	if (routeSegments.length !== urlSegments.length) { return null; }
	const params = {};
	for (let i = 0; i < routeSegments.length; i++) {
		if (routeSegments[i][0] === ':') {
			params[routeSegments[i].slice(1)] = urlSegments[i];
			continue;
		}
		if (routeSegments[i] !== urlSegments[i]) { return null; }
	}
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
			return { redraw: false };
		},
		silentResolveRoute({ state }) {
			const match = getMatch(routes, splitRoute(window.location.pathname));
			state.route = match.route;
			state.path = window.location.pathname;
			state.hash = window.location.hash;
			state.search = window.location.search;
			state.params = match.params;
			return { redraw: false, match };
		},
		resolveRoute({ state, actions }) {
			const { match } = actions.silentResolveRoute();
			routes[match.route](state);
			return { redraw: false };
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
	window.onhashchange = actions.silentResolveRoute;
	
	const routerModule = {
		state,
		actions
	};

	return routerModule;

}