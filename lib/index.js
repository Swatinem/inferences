
var analyses = require('analyses');
var esgraph = require('esgraph');
var Runtime = require('./es');
var Set = analyses.Set;
var cow = require('cow');
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

	// FIXME: analyses needs another option for the first value
	var output = analyses(cfg, function (input, list, oldOutput) {
		if (this.type || !this.astNode)
			return input;

		if (!this.count)
			this.count = 0;
		if (this.count++ == 10) {
			debugLoop('infinite loop?');
			return {output: input, enqueue: false};
		}

		var runtime = input.first();
		// FIXME: evaluate should give us the COW-ed runtime
		var result = runtime.evaluate(this.astNode);
		var resultValue = result[1];
		runtime = result[0];
		var output = new Set([runtime]);

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
		merge: merge
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

	var runtime = a;

	mergeEnv(runtime.context.LexicalEnvironment, b.context.LexicalEnvironment);

	function mergeEnv(a, b) {
		if (a.outer)
			a = mergeEnv(a.outer, b.outer);
		var record = a.record;
		if (record instanceof runtime.DeclarativeEnvironment)
			mergeMap(a.record, b.record, 'bindings');
		else if (record instanceof runtime.ObjectEnvironment)
			mergeMap(a.record.object, b.record.object, 'properties');

		return a;
	}

	// merge an Environment or an Object which as a `[properties]` StringMap
	function cowMap(obj, propkey) {
		var cowed = cow({root: runtime, multiple: [obj, obj[propkey]._map]});
		runtime = cowed[0];
		return cowed[1][0];
	}
	function mergeMap(a, b, propkey) {
		var cowed = false;
		// for each prop in `b`:
		b[propkey].items().forEach(function (item) {
			var key = item[0];
			// if property does not exist in `a`, cow `a` and add the property from `b`
			if (!a[propkey].has(key)) {
				if (!cowed) {
					a = cowed = cowMap(a, propkey);
				}
				return a[propkey].set(key, b[propkey].get(key));
			}
			// else: a has the same key, so merge the two properties
			// FIXME: work correctly with property descriptors
			var merged = mergeValue(a[propkey].get(key).Value, b[propkey].get(key).Value);

			if (!cowed) {
				a = cowed = cowMap(a, propkey);
			}
			if (!merged)
				return a[propkey].delete(key);
			a[propkey].set(key, new runtime.PropertyDescriptor({
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

	//console.log('merge:', a.context.LexicalEnvironment.record.object.properties, b.context.LexicalEnvironment.record.object.properties);
	// FIXME: merge the two contexts
	return new Set([runtime]);
}

