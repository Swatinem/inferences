
exports.DeclarativeEnvironment = DeclarativeEnvironment;
exports.ObjectEnvironment = ObjectEnvironment;
exports.LexicalEnvironment = LexicalEnvironment;

exports.GetIdentifierReference = GetIdentifierReference;

exports.NewObjectEnvironment = NewObjectEnvironment;
exports.NewDeclarativeEnvironment = NewDeclarativeEnvironment;
exports.ExecutionContext = ExecutionContext;

var StringMap = require('../stringmap');

// 10.2.1.1
// TODO: non-deletable bindings
// TODO: immutable bindings
function DeclarativeEnvironment() {
	this.bindings = new StringMap();
}
// 10.2.1.1.1
DeclarativeEnvironment.prototype.HasBinding = function DeclarativeEnvironment_HasBinding(N) {
	return this.bindings.has(N);
};
// 10.2.1.1.2
DeclarativeEnvironment.prototype.CreateMutableBinding = function DeclarativeEnvironment_CreateMutableBinding(runtime, N, D) {
	// assert(!this.HasBinding(N));
	// TODO: non-deletable
	this.bindings.set(N, undefined);
};
// 10.2.1.1.3
DeclarativeEnvironment.prototype.SetMutableBinding = function DeclarativeEnvironment_SetMutableBinding(N, V, S) {
	// assert(this.HasBinding(N));
	// TODO: immutable binding?
	this.bindings.set(N, V);
};
// 10.2.1.1.4
DeclarativeEnvironment.prototype.GetBindingValue = function DeclarativeEnvironment_GetBindingValue(N, S) {
	return this.bindings.get(N);
};
// 10.2.1.1.5
DeclarativeEnvironment.prototype.DeleteBinding = function DeclarativeEnvironment_DeleteBinding(N) {
		if (!this.HasBinding(N))
			return true;
		// TODO: non-deletable
		this.bindings.delete(N);
		return true;
};
// 10.2.1.1.6
DeclarativeEnvironment.prototype.ImplicitThisValue = function DeclarativeEnvironment_ImplicitThisValue() {
	return undefined;
};
// 10.2.1.1.7
DeclarativeEnvironment.prototype.CreateImmutableBinding = function DeclarativeEnvironment_CreateImmutableBinding(N) {
	// assert(!this.HasBinding(N));
	// TODO: immutable
	this.bindings.set(N, undefined);
};
// 10.2.1.1.8
DeclarativeEnvironment.prototype.InitializeImmutableBinding = function DeclarativeEnvironment_InitializeImmutableBinding(N, V) {
	// assert(this.HasBinding(N));
	// TODO: record initialized
	this.bindings.set(N, V);
};

// 10.2.1.2
function ObjectEnvironment(object) {
	this.object = object;
}

// 10.2.1.2.1
ObjectEnvironment.prototype.HasBinding = function ObjectEnvironment_HasBinding(N) {
	return this.object.HasProperty(N);
};
// 10.2.1.2.2
ObjectEnvironment.prototype.CreateMutableBinding = function ObjectEnvironment_CreateMutableBinding(runtime, N, D) {
	// assert(!this.object.HasProperty(N))
	var configValue = D;
	//FIXME:
	configValue = true;
	var desc = new runtime.PropertyDescriptor({
		Value: undefined,
		Writable: true,
		Enumerable: true,
		Configurable: configValue});
	this.object.DefineOwnProperty(N, desc, true);
};
// 10.2.1.2.3
ObjectEnvironment.prototype.SetMutableBinding = function ObjectEnvironment_SetMutableBinding(N, V, S) {
	this.object.Put(N, V, S);
};
// 10.2.1.2.4
ObjectEnvironment.prototype.GetBindingValue = function ObjectEnvironment_GetBindingValue(N, S) {
	var value = this.object.HasProperty(N);
	if (!value) {
		// TODO: 4.a
	}
	return this.object.Get(N);
};
// 10.2.1.2.5
ObjectEnvironment.prototype.DeleteBinding = function ObjectEnvironment_DeleteBinding(N) {
		return this.object.Delete(N);
};
// 10.2.1.2.6
ObjectEnvironment.prototype.ImplicitThisValue = function ObjectEnvironment_ImplicitThisValue() {
	return this.provideThis && this.object;
};


function LexicalEnvironment(outer, record) {
	this.outer = outer;
	this.record = record;
}

// 10.2.2.1
function GetIdentifierReference(lex, name, strict) {
	var runtime = this;
	if (!lex) {
		return new runtime.Reference(undefined, name, strict);
	}
	var envRec = lex.record;
	var exists = envRec.HasBinding(name);
	if (exists) {
		return new runtime.Reference(envRec, name, strict);
	} else {
		var outer = lex.outer;
		return runtime.GetIdentifierReference(outer, name, strict);
	}
}

// 10.2.2.2
function NewDeclarativeEnvironment(E) {
	var envRec = new this.DeclarativeEnvironment();
	var env = new this.LexicalEnvironment(E, envRec);
	return env;
}

// 10.2.2.3
function NewObjectEnvironment(O, E) {
	var envRec = new this.ObjectEnvironment(O);
	var env = new this.LexicalEnvironment(E, envRec);
	return env;
}

// 10.3
function ExecutionContext(LexicalEnvironment, VariableEnvironment, ThisBinding) {
	this.LexicalEnvironment = LexicalEnvironment;
	this.VariableEnvironment = VariableEnvironment;
	this.ThisBinding = ThisBinding;
}
