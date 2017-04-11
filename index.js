import m from 'mithril/render';
import hyperscript from 'mithril/hyperscript';


let isInitialized = false;

const app = {
	state: {},
	actions: {},
	root: null
};

function blixt(opts) {

	if (isInitialized) {
		throw Error('Blixt has already been initialized');
	}

	isInitialized = true;
	app.root = opts.root;
	const modules = opts.modules || {};
	Object.keys(modules).forEach(function(namespace) {
		app.state[namespace] = modules[namespace].state || {};
		app.actions[namespace] = modules[namespace].actions || {};
	});

	// return app.actions, so user can run app[namespace][action](args);
	return app.actions;

}

let lastRenderedArgs;
export function render(...args) {
	lastRenderedArgs = args;
	m.render(app.root, hyperscript.apply(hyperscript, args));
}

let redrawScheduled = false;
export function redraw() {
	if (redrawScheduled) { return; }
	redrawScheduled = true;
	requestAnimationFrame(function() {
		redrawScheduled = false;
		blixt.render.apply(blixt.render, lastRenderedArgs);
	});
}

export function getState(...path) {
	let state = app.state;
	path.forEach(function(segment) {
		state = state[segment];
	});
	return state;
}


function getContext(state, boundActions) {
	return {
		state,
		actions: boundActions
	};
}

const noop = () => {};
const isPromise = (x) => x && x.constructor && (typeof x.then === 'function');

function maybeRedraw(result) {
	if (result && result.redraw === false) { return; }
	blixt.redraw();
}

export function actions(actionsObj, fn = noop) {
	return {
		bindTo(state) {
			fn(state);
			const boundActions = {};
			Object.keys(actionsObj).forEach(function(key) {
				const action = actionsObj[key];
				boundActions[key] = function(...args) {
					const result = action.apply(action, [getContext(state, boundActions)].concat(args));
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
blixt.h = hyperscript;

export const h = hyperscript;

export default blixt;