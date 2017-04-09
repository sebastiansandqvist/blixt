import blixt from '../index.js';

function splitRoute(string) {
	return string.split('/').filter((x) => Boolean(x));
}


// merge both loops (getParams and isMatch):
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



function getMatch(routeMap, url) {
	const urlSegments = splitRoute(url);
	for (const route in routeMap) {
		if (Object.prototype.hasOwnProperty.call(routeMap, route)) {
			const routeSegments = splitRoute(route);
			const params = getParamsIfMatch(routeSegments, urlSegments);
			if (params) { return { route, params }; }
			// if (isMatch(routeSegments, urlSegments)) {
			// 	return { route, params: getParams(routeSegments, urlSegments) };
			// }
		}
	}
	return { route: '*', params: {} };
}


export default function router(routes) {

	if (routes['*'] === undefined) {
		throw new Error('Blixt router requires catch-all * route');
	}

	const routeActions = {
		set({ actions, noRedraw }, path) {
			window.history.pushState(null, '', path);
			actions.resolveRoute();
			return noRedraw;
		},
		silentResolveRoute({ state, noRedraw }, match) {
			const matchedRoute = match || getMatch(routes, window.location.pathname);
			state.route = matchedRoute.route;
			state.path = window.location.pathname;
			state.hash = window.location.hash;
			state.search = window.location.search;
			state.params = matchedRoute.params;
			return noRedraw;
		},
		resolveRoute({ state, noRedraw, actions }) {
			const match = getMatch(routes, window.location.pathname);
			actions.silentResolveRoute(match);
			routes[match.route](state);
			return noRedraw;
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
