import blixt from '../index.js';

function splitRoute(string) {
	return string.split('/').filter((x) => Boolean(x));
}


// function getParams(routeSegments, urlSegments) {
// 	const params = {};
// 	for (let i = 0; i < routeSegments.length; i++) {
// 		if (routeSegments[i][0] === ':') {
// 			params[routeSegments[i].slice(1)] = urlSegments[i];
// 		}
// 	}
// 	return params;
// }

// function isMatch(routeSegments, urlSegments) {
// 	if (routeSegments.length !== urlSegments.length) { return false; }
// 	for (let i = 0; i < routeSegments.length; i++) {
// 		if (routeSegments[i][0] === ':') { continue; }
// 		if (routeSegments[i] !== urlSegments[i]) { return false; }
// 	}
// 	return true;
// }


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

	const routeActions = {
		set({ actions, noRedraw }, _, path) {
			window.history.pushState(null, '', path);
			actions.resolveRoute();
			return noRedraw;
		},
		resolveRoute({ state, noRedraw }) {
			const match = getMatch(routes, window.location.pathname);
			state.route = match.route;
			state.path = window.location.pathname;
			state.hash = window.location.hash;
			state.search = window.location.search;
			state.params = match.params;
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

	const routerModule = {
		state,
		actions
	};

	return routerModule;

}
