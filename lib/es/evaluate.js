
var debug = require('debug')('inferences:evaluate');

exports.evaluate = evaluateExpression;

function evaluateExpression(ast) {
	var runtime = this;
	var context = runtime.context;


	function recurse(ast) {
		return evaluateExpression.call(runtime, ast);
	}

	switch (ast.type) {
		// 11.1.1
		case 'ThisExpression':
			return context.ThisBinding;

		// 11.1.5
		case 'ObjectExpression':
			// TODO: Prototype, etc
			var o = new runtime.ObjectValue();
			ast.properties.forEach(function (prop) {
				var propName = prop.key.name;
				var desc;
				if (prop.kind == 'init') {
					var exprValue = recurse(prop.value);
					var propValue = runtime.GetValue(exprValue);
					desc = new runtime.PropertyDescriptor({Value: propValue, Writable: true, Enumerable: true, Configurable: true});
				}
				o.DefineOwnProperty(runtime, propName, desc, false);
			});
			return o;

		// 11.2.1
		case 'MemberExpression':
			var baseReference = recurse(ast.object);
			var baseValue = runtime.GetValue(baseReference);
			/* per standard:
			var propertyNameReference = recurse(this.property);
			var propertyNameValue = GetValue(propertyNameReference);
			// TODO: CheckObjectCoercible(baseValue)
			var propertyNameString = ToString(propertyNameValue);
			return new Reference(baseValue, propertyNameString, strict);
			*/

			var strict = false; // FIXME
			if (!(baseValue instanceof runtime.MultiValue)) {
				var oldValue = baseValue;
				baseValue = new runtime.MultiValue();
				baseValue.add(oldValue);
			}

			// here is where the code completion comes into play: we record every
			// baseValue that ever came through this MemberExpression
			// FIXME: use a map from node -> value
			/*if (!ast.object.Value)
				Object.defineProperty(ast.object, 'Value', {value: new runtime.MultiValue()});
			ast.object.Value.add(baseValue);*/

			var ref = new runtime.MultiReference();
			baseValue.forEach(function (base) {
				if (!ast.computed) {
					ref.add(new runtime.Reference(base, ast.property.name, strict));
				} else {
					var propertyNamesReference = recurse(ast.property);
					var propertyNamesValue = runtime.GetValue(propertyNamesReference);
					//var propertyNamesString = ToString(propertyNamesValue);
					// string...
					// TODO
				}
			});
			if (ref.size === 1)
				return ref.first(); // keep it simple if possible
			return ref;

		// 11.2.2
		case 'NewExpression':
			var ref = recurse(ast.callee);
			var constructor = runtime.GetValue(ref);
			var argList = ast.arguments.map(recurse);
			// TODO: TypeError
			if (!constructor)
				return;
			if (!(constructor instanceof runtime.MultiValue))
				constructor = [constructor];
			var allret = new runtime.MultiValue();
			constructor.forEach(function (c) {
				// TODO: ret.throw
				var ret = c.Construct(argList);
				allret.add(ret.return);
			});
			return allret.length > 1 ? allret : allret[0];

		// 11.2.3
		case 'CallExpression':
			// TODO: MultiValue
			var ref = recurse(ast.callee);
			var func = runtime.GetValue(ref);
			var argList = ast.arguments.map(recurse);
			// TODO: TypeError
			var thisVal = undefined; // TODO: the object
			if (ref instanceof runtime.Reference) {
				if (runtime.IsPropertyReference(ref))
					thisVal = ref.base;
				else if (ref.base)
					thisVal = ref.base.ImplicitThisValue();
			}
			if (!func)
				return;
			if (!(func instanceof runtime.MultiValue))
				func = [func];
			var allret = new runtime.MultiValue();
			func.forEach(function (f) {
				// TODO: ret.throw
				var ret = f.Call(runtime, thisVal, argList);
				// FIXME: need a reference aware merge and replace function
				// FIXME: what about outer var references when we have `MultiValue`s?
				/*if (context.ThisBinding === context.globalObject) {
					context.ThisBinding = ret.globalObject;
					context.LexicalEnvironment.record.object = ret.globalObject;
				}*/
				//context.globalObject = ret.globalObject;
				allret.add(ret.return);
			});
			return allret;

		// 11.4
		case 'UnaryExpression':
			switch (ast.operator) {
				// 11.4.1
				case 'delete':
					var ref = recurse(ast.argument);
					if (!(ref instanceof runtime.Reference))
						return new runtime.BooleanValue(true);
					if (runtime.IsUnresolvableReference(ref)) {
						// TODO: 3.a strict: throw SyntaxError
						return new runtime.BooleanValue(true);
					}
					if (runtime.IsPropertyReference(ref)) {
						var ret = runtime.ToObject(ref.base).Delete(ref.name, ref.strict);
						return new runtime.BooleanValue(ret);
					} else {
						// TODO: 5.a strict: throw SyntaxError
						var bindings = ref.base;
						var ret = bindings.DeleteBinding(ref.name);
						return new runtime.BooleanValue(ret);
					}

				// 11.4.2
				case 'void':
					var expr = recurse(ast.argument);
					runtime.GetValue(expr);
					return runtime.undefined;

				// 11.4.3
				case 'typeof':
					// TODO: MultiReference, MultiValue and `any` support
					var val = recurse(ast.argument);
					if (val instanceof runtime.Reference) {
						if (runtime.IsUnresolvableReference(val))
							return new runtime.StringValue('undefined');
						val = runtime.GetValue(val);
					}
					if (val instanceof runtime.FunctionValue)
						return new runtime.StringValue('function');
					if (val === runtime.null)
						return new runtime.StringValue('object');
					return new runtime.StringValue(val.Type.toLowerCase());

				// 11.4.4
				case '++':

				// 11.4.5
				case '--':

				// 11.4.6
				case '+':

				// 11.4.7
				case '-':

				// 11.4.8
				case '~':

					debug('unhandled unary operator: ' + ast.operator);
					break;

				// 11.4.9
				case '!':
					var expr = recurse(ast.argument);
					var oldValue = runtime.ToBoolean(runtime.GetValue(expr));
					if (oldValue.PrimitiveValue)
						return new runtime.BooleanValue(false);
					else if (typeof oldValue.PrimitiveValue !== 'undefined')
						return new runtime.BooleanValue(true);
					else
						return new runtime.BooleanValue();
			}

		// 11.11
		case 'LogicalExpression':
			switch (ast.operator) {
				case '&&':
					var lref = recurse(ast.left);
					var lval = runtime.GetValue(lref);
					var bool = runtime.ToBoolean(lval);
					if (typeof bool.PrimitiveValue !== 'undefined' && !bool.PrimitiveValue)
						return lval;
					else {
						var rref = recurse(ast.right);
						var rval = runtime.GetValue(rref);
						if (bool.PrimitiveValue)
							return rval;
						// else
						var val = new runtime.MultiValue();
						val.add(lval);
						val.add(rval);
						return val;
					}
				case '||':
					var lref = recurse(ast.left);
					var lval = runtime.GetValue(lref);
					var bool = runtime.ToBoolean(lval);
					if (bool.PrimitiveValue)
						return lval;
					else {
						var rref = recurse(ast.right);
						var rval = runtime.GetValue(rref);
						if (typeof bool.PrimitiveValue !== 'undefined')
							return rval;
						// else
						var val = new runtime.MultiValue();
						val.add(lval);
						val.add(rval);
						return val;
					}
				default:
					debug('unhandled logical operator: ' + ast.operator);
					break;
			}

		// 11.12
		case 'ConditionalExpression':
			var lref = recurse(ast.test);
			var bool = runtime.ToBoolean(runtime.GetValue(lref));
			// true "branch" only:
			if (bool.PrimitiveValue)
				return runtime.GetValue(recurse(ast.consequent));
			// false "branch" only:
			else if (typeof bool.PrimitiveValue !== 'undefined')
				return runtime.GetValue(recurse(ast.alternate));
			// both true and false:
			else {
				var val = new runtime.MultiValue();
				val.add(runtime.GetValue(recurse(ast.consequent)));
				val.add(runtime.GetValue(recurse(ast.alternate)));
				return val;
			}

		// 11.13
		case 'AssignmentExpression':
			switch (ast.operator) {
				case '=':
					var rref = recurse(ast.right);
					var lref = recurse(ast.left);
					var rval = runtime.GetValue(rref);
					// TODO: 4. SyntaxErrors
					runtime.PutValue(lref, rval);
					return rval;
				default:
					debug('unhandled assignment: ' + ast.operator);
					break;
			}

		// 12.9
		case 'ReturnStatement':
			if (!context.return)
				context.return = new runtime.MultiValue();
			if (!ast.argument)
				return context.return.add(runtime.undefined);
			// else
			var exprRef = recurse(ast.argument);
			return context.return.add(runtime.GetValue(exprRef));

		// 13
		case 'FunctionExpression':
			if (ast.id) {
				var funcEnv = runtime.NewDeclarativeEnvironment(context.LexicalEnvironment);
				var envRec = funcEnv.record;
				envRec.CreateImmutableBinding(ast.id.name);
				var closure = new runtime.FunctionValue(runtime, ast, funcEnv, false);
				envRec.InitializeImmutableBinding(ast.id.name, closure);
				return closure;
			} else {
				return new runtime.FunctionValue(runtime, ast, context.LexicalEnvironment, false); // TODO: strict mode?
			}

		// 8.7
		case 'Literal':
			switch (typeof ast.value) {
				case 'boolean': // 7.8.2
					return new runtime.BooleanValue(ast.value);
				case 'number': // 7.8.3
					return new runtime.NumberValue(ast.value);
				case 'string': // 7.8.4
					return new runtime.StringValue(ast.value);
				case 'object':
					if (ast.value === null)
						return runtime.null; // 7.8.1
					debug('unhandled RegExp literal' + ast.value);
					break;
					// TODO: 7.8.5
			}

		// 10.3.1
		case 'Identifier':
			var env = context.LexicalEnvironment;
			var strict = false; // FIXME
			return runtime.GetIdentifierReference(env, ast.name, strict);

		// 12.2
		case 'VariableDeclaration':
			ast.declarations.forEach(function (decl) {
				recurse(decl);
			});
			break;
		case 'VariableDeclarator':
			if (!ast.init)
				return ast.id.name;
			var rhs = recurse(ast.init);
			var lhs = recurse(ast.id);
			var value = runtime.GetValue(rhs);
			runtime.PutValue(lhs, value);
			return ast.id.name;

		default:
			debug('unhandled ', ast.type);
			break;
	}
}

