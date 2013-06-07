
exports.MultiValue = MultiValue;

exports.Value = Value;
exports.StringValue = StringValue;
exports.BooleanValue = BooleanValue;
exports.NumberValue = NumberValue;
exports.ObjectValue = ObjectValue;
exports.FunctionValue = FunctionValue;

exports.PropertyDescriptor = PropertyDescriptor;
exports.IsDataDescriptor = IsDataDescriptor;
exports.IsAccessorDescriptor = IsAccessorDescriptor;

var Set = require('analyses').Set;
var StringMap = require('../stringmap');

/**
 * Similar to MultiReference, a Value may have multiple values as well, hence
 * MultiValue
 */
function MultiValue() {
	Set.apply(this, arguments);
}
MultiValue.prototype = Object.create(Set.prototype);
MultiValue.prototype.add = function MultiValue_add(V) {
	if (V instanceof MultiValue) {
		V.forEach(Set.prototype.add.bind(this));
		return this;
	}
	// else
	return Set.prototype.add.call(this, V);
};


// 8
function Value(type) {
	this.Type = type || 'Undefined';
}
Value.equals = function (v1, v2) {
	// Objects never ever equal
	return v1 && v2 && v1.Type == v1.Type &&
		v1.Type !== 'Object' && v1.PrimitiveValue === v2.PrimitiveValue;
};

// 8.1
var undefinedValue = exports.undefined = new Value();

// 8.2
var nullValue = exports.null = new Value('Null');

// 8.3
function BooleanValue(PrimitiveValue) {
	Value.call(this, 'Boolean');
	this.PrimitiveValue = PrimitiveValue;
}
BooleanValue.prototype = Object.create(Value.prototype);

// 8.4
function StringValue(PrimitiveValue) {
	Value.call(this, 'String');
	this.PrimitiveValue = PrimitiveValue;
}
StringValue.prototype = Object.create(Value.prototype);
StringValue.prototype.toString = function StringValue_toString() {
	return 'string' + (this.PrimitiveValue !== undefined ? ':"' + this.PrimitiveValue + '"' : '');
}

// 8.5
function NumberValue(PrimitiveValue) {
	Value.call(this, 'Number');
	this.PrimitiveValue = PrimitiveValue;
}
NumberValue.prototype = Object.create(Value.prototype);
NumberValue.prototype.toString = function NumberValue_toString() {
	return 'number' + (this.PrimitiveValue !== undefined ? ':' + this.PrimitiveValue : '');
};


// 8.6
function ObjectValue(Prototype) {
	Value.call(this, 'Object');
	this.Prototype = Prototype;
	this.Extensible = true; // TODO
	this.properties = new StringMap();
	/*
	this.Class;
	this.Extensible;
	DefaultValue
	PrimitiveValue
	Construct
	Call
	HasInstance
	Scope
	FormalParameters
	Code
	TargetFunction
	BoundThis
	BoundArguments
	Match
	ParameterMap
	*/
}
ObjectValue.prototype = Object.create(Value.prototype);
// 8.12.1
ObjectValue.prototype.GetOwnProperty = function ObjectValue_GetOwnProperty(P) {
	if (!this.properties.has(P))
		return undefined;
	return this.properties.get(P);
};
// 8.12.2
ObjectValue.prototype.GetProperty = function ObjectValue_GetProperty(P) {
	var prop = this.GetOwnProperty(P);
	if (prop)
		return prop;
	var proto = this.Prototype;
	if (!proto)
		return undefined;
	return proto.GetProperty(P);
};
// 8.12.3
ObjectValue.prototype.Get = function ObjectValue_Get(P) {
	var desc = this.GetProperty(P);
	if (!desc)
		return undefined;
	// FIXME: work through runtime!
	if (IsDataDescriptor(desc))
		return desc.Value;
	// else: accessor
	var getter = desc.Get;
	if (!getter)
		return undefined;
	return getter.Call(O, []);
};
// 8.12.4
ObjectValue.prototype.CanPut = function ObjectValue_CanPut(P) {
	var desc = this.GetOwnProperty(P);
	if (desc) {
		// FIXME: work through runtime!
		if (IsAccessorDescriptor(desc))
			return !!desc.Set;
		// else
		return desc.Writable;
	}
	// else
	var proto = this.Prototype;
	if (!proto)
		return this.Extensible;
	var inherited = proto.GetProperty(P);
	if (!inherited)
		return this.Extensible;
	// FIXME: work through runtime!
	if (IsAccessorDescriptor(inherited))
		return !!inherited.Set;
	// else
	return this.Extensible && inherited.Writable;
};
ObjectValue.prototype.Put = function ObjectValue_Put(runtime, P, V, Throw) {
	if (!this.CanPut(P)) {
		// TODO: TypeError
		//return; FIXME: ignore this for now
	}
	var ownDesc = this.GetOwnProperty(P);
	if (runtime.IsDataDescriptor(ownDesc)) {
		var valueDesc = new runtime.PropertyDescriptor({Value: V});
		return this.DefineOwnProperty(runtime, P, valueDesc, Throw);
	}
	var desc = this.GetProperty(P);
	if (runtime.IsAccessorDescriptor(desc)) {
		var setter = desc.Set;
		return setter.Call(O, [V]);
	} else {
		var newDesc = new runtime.PropertyDescriptor({
			Value: V,
			Writable: true,
			Enumerable: true,
			Configurable: true
		});
		return this.DefineOwnProperty(runtime, P, newDesc, Throw);
	}
};
// 8.12.6
ObjectValue.prototype.HasProperty = function ObjectValue_HasProperty(P) {
	var desc = this.GetProperty(P);
	return !!desc;
};
// 8.12.7
ObjectValue.prototype.Delete = function ObjectValue_Delete(P, Throw) {
	var desc = this.GetOwnProperty(P);
	if (!desc) {
		return true;
	}
	if (desc.Configurable) {
		this.properties.delete(P);
		return true;
	}
	// TODO: TypeError
	return false;
};
// TODO: 8.12.8: [[DefaultValue]] (hint)
// 8.12.9
ObjectValue.prototype.DefineOwnProperty = function ObjectValue_DefineOwnProperty(runtime, P, Desc, Throw) {
	// TODO: Reject
	var current = this.GetOwnProperty(P);
	var extensible = this.Extensible;
	if (!current && !extensible) {
		return false;
	}
	if (!current && extensible) {
		this.properties.set(P, Desc);
		return true;
	}
	// else:
	if (equalDesc(Desc, current)) {
		return true;
	}
	if (!current.Configurable) {
		if (Desc.Configurable) {
			return false; // Reject
		}
		if (Desc.Enumerable != Desc.Enumerable) {
			return false; // Reject
		}
	}
	// TODO: GenericDescriptor
	if (runtime.IsDataDescriptor(current) != runtime.IsDataDescriptor(Desc)) { // 9.
		if (!current.Configurable) {
			return false; // Reject
		}
		// TODO preserve [[Configurable]] and [[Enumerable]]
		this.properties.set(P, Desc); // properties
		return true;
	}
	else if (runtime.IsDataDescriptor(current) && runtime.IsDataDescriptor(Desc)) { // 10.
		if (!current.Configurable) {
			if (!current.Writable && Desc.Writable) {
				return false; // Reject
			}
			// TODO: SameValue on Value
			//if (!current.Writable && )
		} else {
			this.properties.set(P, Desc); // properties
			return true;
		}
	} else { // 11.
		if (!current.Configurable) {
			// TODO: SameValue on Set, Get
		}
	}
	this.properties.set(P, Desc); // properties
	return true;
};

// FIXME: move this to somewhere else
function equalDesc(a, b) {
	return a.Enumerable === b.Enumerable &&
		a.Configurable === b.Configurable &&
		a.Get === b.Get &&
		a.Set === b.Set &&
		a.Value === b.Value &&
		a.Writable === b.Writable;
}

// 8.6.1
function PropertyDescriptor(options) {
	// FIXME:
	this.Enumerable = true;
	this.Configurable = true;
	for (var key in options || {}) {
		this[key] = options[key];
	}
}

// 8.10.1
function IsAccessorDescriptor(Desc) {
	if (!Desc)
		return false;
	if (!Desc.Get && !Desc.Set)
		return false;
	return true;
}

// 8.10.2
function IsDataDescriptor(Desc) {
	if (!Desc)
		return false;
	if (!Desc.Value && !Desc.Writable)
		return false;
	return true;
}

// TODO: 8.10.3 - 8.10.5


// 13.2
function FunctionValue(runtime, ast, Scope, strict) {
	// TODO: Prototype 15.3.3.1
	ObjectValue.call(this/*, Prototype*/);
	var F = this;

	F.Type = 'Function';
	F.Scope = Scope;
	// TODO: formal parameters?
	F.Code = ast;
	F.Extensible = true;

	var len = new runtime.NumberValue(ast.params.length);
	F.DefineOwnProperty(runtime, 'length', new runtime.PropertyDescriptor({
		Value: len,
		Writable: false,
		Enumerable: false,
		Configurable: false
	}), false);
	var proto = new runtime.ObjectValue();
	proto.DefineOwnProperty(runtime, 'constructor', new runtime.PropertyDescriptor({
		Value: F,
		Writable: true,
		Enumerable: false,
		Configurable: true
	}), false);
	F.DefineOwnProperty(runtime, 'prototype', new runtime.PropertyDescriptor({
		Value: proto,
		Writable: true,
		Enumerable: false,
		//Configurable: false
		Configurable: true // FIXME
	}), false);
	/* TODO:
	if (strict)
	*/
}
FunctionValue.prototype = Object.create(ObjectValue.prototype);
FunctionValue.prototype.Class = 'Function';
// 15.3.5.4
FunctionValue.prototype.Get = function FunctionValue_Get(P) {
	// TODO: TypeError
	return ObjectValue.prototype.Get.call(this, P);
};
// 13.2.1
FunctionValue.prototype.Call = function FunctionValue_Call(runtime, thisVal, argList) {
	// 10.4.3
	/* FIXME: rewrite this!
	if (!thisVal)
		thisVal = runtime.context.globalObject;
	var localEnv = runtime.NewDeclarativeEnvironment(this.Scope);
	var funcCtx = new runtime.ExecutionContext(localEnv, localEnv, thisVal, globals.context.globalObject);
	funcCtx.func = this; // FIXME
	globals.DeclarationBinding(this.Code, funcCtx, argList);

	var oldContext = runtime.context;
	globals.context = funcCtx;
	var cfg = this.Code.cfg = this.Code.cfg || ControlFlowGraph(this.Code.body);
	globals.typeInference(cfg, globals);
	globals.context = oldContext;

	var returnContext = cfg[1].output[0];
	return returnContext;*/
};
// TODO: 13.2.2
FunctionValue.prototype.Construct = function FunctionValue_Construct(runtime, argList) {
	var proto = this.Get('prototype');
	// TODO: 7. proto not Object
	var obj = new runtime.ObjectValue(proto);
	var result = this.Call(obj, argList);
	if (!(result.return && result.return.length == 1 && result.return[0] instanceof ObjectValue))
		result.return = result.ThisBinding;
	return result;
};
// TODO: 15.3.5.3
FunctionValue.prototype.HasInstance = function FunctionValue_HasInstance() {
	
};


// toString methods
MultiValue.prototype.toString = function MultiValue_toString() {
	return '<' + this.map(function (p) { return p || 'any'; }).join(' | ') + '>';
};
Value.prototype.toString = function Value_toString() {
	return this.Type.toLowerCase() + (this.PrimitiveValue !== undefined ? ':' + this.PrimitiveValue : '');
};
StringValue.prototype.toString = function StringValue_toString() {
	return 'string' + (this.PrimitiveValue !== undefined ? ':"' + this.PrimitiveValue + '"' : '')
};
ObjectValue.prototype.toString = function ObjectValue_toString() {
	if (this.printing)
		return '[Cycle]';
	this.printing = true;
	var out = this.Type.toLowerCase() + ':{' + this.properties.items().map(function (item) {
		return '"' + item[0] + '": ' + item[1].toString();
	}).join(', ') + '}';
	delete this.printing;
	return out;
};
PropertyDescriptor.prototype.toString = function PropertyDescriptor_toString() {
	return this.Value.toString();
};

