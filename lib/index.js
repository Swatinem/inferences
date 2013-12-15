
var analyses = require('analyses');
var esgraph = require('esgraph');
var Runtime = require('./es');
var Set = analyses.Set;
var Cow = require('cow');
var debugMerge = require('debug')('inferences:merge');
var debugLoop = require('debug')('inferences:loop');

var exports = module.exports = inference;

// expose internals for testing
exports.declarations = require('./declarations');
exports.StringMap = require('./stringmap');
exports.Runtime = require('./es');

function inference(ast) {
	var cfg = esgraph(ast);
	var runtime = new Runtime(ast); // TODO: initialize the runtime

	var output = analyses(cfg, function (input, list, oldOutput) {
		if (this.type || !this.astNode)
			return input;

		var cow = new Cow(input.first());
		var runtime = cow.proxy;
		var resultValue = runtime.evaluate(this.astNode);
		var output = new Set([cow.finish()]);

		if (!this.true || !resultValue)
			return output; // let the worklist worry about old output etc...

		if (oldOutput && equals(output, oldOutput))
			return {output: output, enqueue: false}; // no change -> algorithm ends
		// else: we know that output changed AND that we have a branch node
		var bool = runtime.ToBoolean(resultValue);
		if (typeof bool.PrimitiveValue !== 'undefined') {
			if (bool.PrimitiveValue)
				list.push(this.true);
			else
				list.push(this.false);
		} else {
				list.push(this.true);
				list.push(this.false);
		}
		if (this.exception)
			list.push(this.exception);

		return {output: output, enqueue: false};
	}, {
		direction: 'forward',
		start: new Set([runtime]),
		equals: equals,
		merge: analyses.merge(merge)
	});

	return {
		cfg: cfg,
		runtime: runtime,
		output: output
	};
}

function equals(a, b) {
	if (a === b)
		return true;
	if (a instanceof Set)
		return Set.equals(a, b);
	var ak = Object.keys(a);
	var bk = Object.keys(b);
	if (ak.length != bk.length)
		return false;
	for (var i = 0; i < ak.length; i++) {
		var vala = a[ak[i]];
		var valb = b[bk[i]];
		if (!equals(vala, valb))
			return false;
	}
	return true;
}

function merge(a, b) {
	// actually a and b are sets
	if (!a && !b)
		return a;
	if (a && !b)
		return a;
	if (b && !a)
		return b;
	a = a.first();
	b = b.first();

	var cow = new Cow(a);
	var runtime = a;
	a = cow.proxy;

	mergeEnv(runtime.context.LexicalEnvironment, b.context.LexicalEnvironment);

	function mergeEnv(a, b) {
		if (a.outer)
			a = mergeEnv(a.outer, b.outer);
		var record = a.record;
		if (record instanceof runtime.DeclarativeEnvironment)
			mergeMap(a.record.bindings, b.record.bindings);
		else if (record instanceof runtime.ObjectEnvironment)
			mergeMap(a.record.object.properties, b.record.object.properties);

		return a;
	}

	// merge an Environment or an Object which as a `[properties]` StringMap
	function mergeMap(a, b) {
		// for each prop in `b`:
		b.items().forEach(function (item) {
			var key = item[0];
			// if property does not exist in `a`, add the property from `b`
			if (!a.has(key)) {
				return a.set(key, b.get(key));
			}
			// else: a has the same key, so merge the two properties
			// FIXME: work correctly with property descriptors
			var merged = mergeValue(a.get(key).Value, b.get(key).Value);

			if (!merged)
				return a.delete(key);
			a.set(key, new runtime.PropertyDescriptor({
				Value: merged
			}));
		});
		return a;
	}

	// merge simple values
	function mergeValue(a, b) {
		debugMerge('merging `' + a + '` and `' + b + '`');
		var aValues = a instanceof runtime.MultiValue ? a.values() : [a];
		var bValues = b instanceof runtime.MultiValue ? b.values() : [b];

		// check all the values in b and see if we can merge them into any of a
		var newValues = [];
		bValues.forEach(function (bVal) {
			for (var i = 0; i < aValues.length; i++) {
				var aVal = aValues[i];
				newValues.push(aVal);
				if (!aVal && !bVal)
					return; // merged undefined
				if (!aVal || !bVal)
					continue; // cant merge with `any`
				if (aVal.Type !== bVal.Type)
					continue; // not mergeable
				if (aVal.Type !== 'Object' && aVal.PrimitiveValue === bVal.PrimitiveValue)
					return; // same PrimitiveValue -> merged
				if (aVal.Type === 'Boolean' && aVal.PrimitiveValue !== bVal.PrimitiveValue) {
					// we merged Boolean:true and Boolean:false into a generic Boolean
					newValues.pop();
					return newValues.push(new runtime.BooleanValue());
				}
				// FIXME: merge objects:
				continue;
				if (aVal.Type !== 'Object' || !equals(aVal.Prototype, bVal.Prototype) || aVal.Code)
					continue; // non-objects, objects with different prototypes or
					// functions are not mergeable
				// we have two objects here with the same Prototype:
				// FIXME: merge the properties into a new object
				return;
			}
			// we were not able to merge it with any existing value in `a`
			newValues.push(bVal);
		});

		var ret = newValues.length == 1
			? newValues[0]
			: new runtime.MultiValue(newValues);

		debugMerge('= `' + ret + '`');
		return ret;
	}

	var finished = cow.finish();
	return new Set([finished]);
}

