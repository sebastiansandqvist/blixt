let isInitialized = false;
const noop = () => {};

const app = {
	state: {},
	actions: {},
	onUpdate: noop
};

function blixt(opts) {

	if (isInitialized) {
		throw Error('Blixt has already been initialized');
	}

	isInitialized = true;
	app.onUpdate = opts.onUpdate || app.onUpdate;
	const modules = opts.modules || {};
	Object.keys(modules).forEach(function(namespace) {
		app.state[namespace] = modules[namespace].state || {};
		app.actions[namespace] = modules[namespace].actions || {};
	});

	// return app.actions, so user can run app[namespace][action](args);
	return app.actions;

}

export function update(label = '[Anonymous update]', state = null) {
	app.onUpdate(app.state, label, state);
}

export function getState(...path) {
	return path.reduce((state, segment) => state[segment], app.state);
}

function getContext(state, boundActions) {
	return {
		state,
		actions: boundActions
	};
}

const isPromise = (x) => x && x.constructor && (typeof x.then === 'function');

function maybeUpdate(result, callerName, state) {
	if (result && result.update === false) { return; }
	update(callerName, state);
}

export function actions(actionsObj, fn = noop) {
	return {
		bindTo(state) {
			fn(state);
			const boundActions = {};
			Object.keys(actionsObj).forEach(function(key) {
				const action = actionsObj[key];
				boundActions[key] = function(...args) {
					// what if:
					// result = action.apply(getContext(state, boundActions), args)
					const result = action.apply(action, [getContext(state, boundActions)].concat(args));
					if (isPromise(result)) {
						return result.then(function(value) {
							fn(state);
							maybeUpdate(value, action.name, state);
						});
					}
					fn(state);
					maybeUpdate(result, action.name, state);
					return result;
				};
			});
			return boundActions;
		}
	};
}

blixt.getState = getState;
blixt.update = update;
blixt.actions = actions;

export default blixt;