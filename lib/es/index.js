
module.exports = Runtime;

function Runtime(ast) {
	// 10.4.1.1
	var globalObject = new this.ObjectValue();
	var globalEnvironment = this.NewObjectEnvironment(globalObject, undefined);

	// TODO: initialize builtin objects

	var context = new this.ExecutionContext(globalEnvironment, globalEnvironment, globalObject);
	this.context = context;

	// FIXME?
	this.globalObject = globalObject;
	this.globalEnvironment = globalEnvironment;

	// 10.5
	this.DeclarationBinding(ast, context, undefined);
}

// export all the functions and objects defined in the ES standard as methods
// on the runtime
[
	require('./environment'),
	require('./value'),
	require('./conversion'),
	require('./reference'),
	require('./binding'),
	require('./evaluate'),
].forEach(function (ex) {
	for (var k in ex) {
		Runtime.prototype[k] = ex[k];
	}
});
