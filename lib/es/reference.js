
exports.Reference = Reference;
exports.MultiReference = MultiReference;
exports.HasPrimitiveBase = HasPrimitiveBase;
exports.IsPropertyReference = IsPropertyReference;
exports.IsUnresolvableReference = IsUnresolvableReference;
exports.GetValue = GetValue;
exports.PutValue = PutValue;

var Set = require('analyses').Set;

/**
 * Since we do not work exactly, a Reference can have multiple base values
 * and even multiple name values, thus we need a MultiReference
 */
function MultiReference() {
	Set.call(this);
}
MultiReference.prototype = Object.create(Set.prototype);


// 8.7
function Reference(base, name, strict) {
	this.base = base;
	this.name = name;
	this.strict = strict;
}

// 8.7
function HasPrimitiveBase(V) {
	var runtime = this;
	return V.base instanceof runtime.NumberValue ||
		V.base instanceof runtime.StringValue ||
		V.base instanceof runtime.BooleanValue;
};
function IsPropertyReference(V) {
	// FIXME
	var runtime = this;
	return V.base instanceof runtime.ObjectValue || runtime.HasPrimitiveBase(V);
}
function IsUnresolvableReference(V) {
	return !V.base;
}

// 8.7.1
function GetValue(V) {
	var runtime = this;
	if (V instanceof runtime.MultiReference) {
		var val = new runtime.MultiValue();
		V.forEach(function (ref) {
			val.add(runtime.GetValue(ref));
		});
		return val;
	}
	
	if (!(V instanceof runtime.Reference)) {
		return V;
	}
	var base = V.base;
	// TODO: ReferenceError
	if (!base)
		return undefined;
	if (runtime.IsPropertyReference(V)) {
		var get;
		if (!runtime.HasPrimitiveBase(V)) {
			get = base.Get;
		} else {
			get = function (P) {
				var base = this;
				var O = runtime.ToObject(base);
				var desc = O.GetProperty(P);
				if (!desc)
					return undefined;
				if (runtime.IsDataDescriptor(desc)) {
					return desc.Value;
				} else {
					var getter = desc.Get;
					if (!getter)
						return undefined;
					return getter.Call(base);
				}
			};
		}
		return get.call(base, V.name);
	} else {
		return base.GetBindingValue(V.name, V.strict);
	}
}
// 8.7.2
function PutValue(V, W) {
	var runtime = this;
	if (V instanceof runtime.MultiReference) {
		return V.forEach(function (ref) {
			runtime.PutValue(ref, W);
		});
	}
	// TODO: ReferenceError
	var base = V.base;
	if (runtime.IsUnresolvableReference(V)) {
		if (V.strict) { // TODO: ReferenceError
		} else {
			return runtime.globalObject.Put(runtime, V.name, W, false);
		}
	} else if (runtime.IsPropertyReference(V)) {
		var put;
		if (!runtime.HasPrimitiveBase(V)) {
			put = base.Put;
		} else {
			put = function (P, W, Throw) {
				var base = this;
				var O = runtime.ToObject(base);
				if (!O.CanPut(P)) {
					// TODO: 2.a throw TypeError
					return;
				}
				var ownDesc = O.GetOwnProperty(P);
				if (runtime.IsDataDescriptor(ownDesc)) {
					// TODO: 4.a throw TypeError
					return;
				}
				var desc = O.GetProperty(P);
				if (IsAccessorDescriptor(desc)) {
					var setter = desc.Set;
					return setter.Call(base, [W]);
				} else if (Throw) {
					// TODO: 7.a throw TypeError
				}
			};
		}
		return put.call(base, runtime, V.name, W, V.strict);
	} else {
		return base.SetMutableBinding(runtime, V.name, W, V.strict);
	}
}
