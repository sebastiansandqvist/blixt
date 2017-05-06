export default function batch(fn) {
	let updateScheduled = false;
	return function batchUpdate(...args) {
		if (updateScheduled) { return; }
		updateScheduled = true;
		setTimeout(function() {
			updateScheduled = false;
			fn.apply(fn, args);
		}, 0);
	};
}

