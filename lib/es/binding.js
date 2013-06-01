
exports.DeclarationBinding = DeclarationBinding;
exports.CreateArgumentsObject = CreateArgumentsObject;

var findDeclarations = require('../declarations');

// 10.5
function DeclarationBinding(ast, context, args) {
	var runtime = this;
	var env = context.VariableEnvironment.record;
	var configurableBindings = false; // TODO
	var strict = false; // TODO
	var functionCode = ~['FunctionDeclaration','FunctionExpression'].indexOf(ast.type);

	// 4. parameters
	if (functionCode) {
		var names = ast.params;
		var argCount = args.length;
		for (var n = 0; n < names.length; n++) {
			var argName = names[n].name;
			var v = n >= argCount ? undefined : args[n];
			var argAlreadyDeclared = env.HasBinding(argName);
			if (!argAlreadyDeclared) {
					runtime = env.CreateMutableBinding(runtime, argName);
			}
			runtime = env.SetMutableBinding(runtime, argName, v, strict);
		}
	}

	// find the declarations in the function body
	var declarations = findDeclarations(functionCode ? ast.body : ast);
	// 5. functions
	for (var i in declarations.functions) {
		var f = declarations.functions[i];
		var fn = f.id.name;

		var fo = new runtime.FunctionValue(runtime, f, context.LexicalEnvironment, strict);

		var funcAlreadyDeclared = env.HasBinding(fn);
		if (!funcAlreadyDeclared) {
			runtime = env.CreateMutableBinding(runtime, fn, configurableBindings);
		} else if (context.LexicalEnvironment == runtime.globalEnvironment) {
			var go = context.ThisBinding;
			var existingProp = go.GetProperty(fn);
			if (existingProp.Configurable) {
				var desc = new PropertyDescriptor({
					Value: undefined,
					Writable: true,
					Enumerable: true,
					Configurable: configurableBindings});
				runtime = go.DefineOwnProperty(runtime, fn, desc, true);
			} // TODO: else if: 5.e.iv
		}
		env.SetMutableBinding(runtime, fn, fo, strict);
	}
	
	var argumentsAlreadyDeclared = env.HasBinding('arguments');
	// 7. arguments
	if (functionCode && !argumentsAlreadyDeclared) {
		var func = context.func; // FIXME
		var argsObj = runtime.CreateArgumentsObject(func, names, args, env, strict);
		if (strict) {
			// TODO
		} else {
			runtime = env.CreateMutableBinding(runtime, 'arguments');
			runtime = env.SetMutableBinding(runtime, 'arguments', argsObj, false);
		}
	}
	
	// 8. variables
	for (var i in declarations.variables) {
		var d = declarations.variables[i];
		var dn = d.id.name;
		var varAlreadyDeclared = env.HasBinding(dn);
		if (!varAlreadyDeclared) {
			runtime = env.CreateMutableBinding(runtime, dn, configurableBindings);
			runtime = env.SetMutableBinding(runtime, dn, runtime.undefined, strict);
		}
	}
	return runtime;
}

function CreateArgumentsObject(func, names, args, env, strict) {
	var runtime = this;
	var len = args.length;
	var obj = new runtime.ObjectValue();
	obj.Class = 'Arguments';
	// TODO: Prototype
	//obj.Prototype = ...;
	obj.DefineOwnProperty('length', new runtime.PropertyDescriptor({
		Value: new runtime.NumberValue(len),
		Writable: true,
		Enumerable: false,
		Configurable: true
	}), false);
	// TODO: ...
	return obj;
}
