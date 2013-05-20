
module.exports = Runtime;

function Runtime() {
}

// export all the functions and objects defined in the ES standard as methods
// on the runtime
[
	require('./environment'),
	require('./value'),
	require('./conversion'),
	require('./reference'),
	require('./binding'),
].forEach(function (ex) {
	for (var k in ex) {
		Runtime.prototype[k] = ex[k];
	}
});
