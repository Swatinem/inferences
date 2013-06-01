
var cow = require('cow');
var Set = require('analyses').Set;
var StringMap = require('../stringmap');

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

Runtime.prototype.cow = function Runtime_cow(obj) {
	var multiple = [obj];
	if (obj instanceof Set) {
		multiple.push(obj._values);
	} else if (obj instanceof StringMap) {
		multiple.push(obj._map);
	}
	var cowed = cow({root: this, multiple: multiple});
	return [cowed[0], cowed[1][0]];
};

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
