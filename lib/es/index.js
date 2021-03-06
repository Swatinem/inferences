
var cow = require('cow');
var Set = require('analyses').Set;
var StringMap = require('../stringmap');

module.exports = Runtime;

function Runtime(ast, inference) {
	// 10.4.1.1
	var globalObject = new this.ObjectValue();
	var globalEnvironment = this.NewObjectEnvironment(globalObject, undefined);

	// TODO: initialize builtin objects

	var context = new this.ExecutionContext(globalEnvironment, globalEnvironment, globalObject);
	this.context = context;

	// FIXME?
	this.globalObject = globalObject;
	this.globalEnvironment = globalEnvironment;

	// inference for recursion
	this.inference = inference;

	// 10.5
	this.DeclarationBinding(ast, context, undefined);
}

Runtime.prototype.get = function Runtime_get(N) {
	var env = this.context;
	var ref = this.GetIdentifierReference(env.LexicalEnvironment, N, false);
	var value = this.GetValue(ref);
	return value;
};

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
