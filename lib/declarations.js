
// FIXME: this is not actually used, so move it to a different package maybe?
var walkes = require('walkes');

module.exports = findDeclarations;
/**
 * Returns all the `FunctionDeclaration`s and `VariableDeclarator`s in the
 * lexical scope of `astNode` as a {functions: [], variables: []} object.
 * It does not recurse for statements creating a new lexical scope unless
 * `options.recurse` is set.
 * if `options.expressions` is set, it will also collect all
 * `FunctionExpression`s.
 */
function findDeclarations(astNode, options) {
	options = options || {};
	var declarations = {functions: [], variables: []};

	function mayRecurse() {
		if (options.recurse)
			walkes.checkProps.apply(this, arguments);
	}

	walkes(astNode, {
		CatchClause: mayRecurse,
		FunctionDeclaration: function (recurse) {
			declarations.functions.push(this);
			if (options.recurse)
				recurse(this.body);
		},
		FunctionExpression: function (recurse) {
			if (options.expressions)
				declarations.functions.push(this);
			if (options.recurse)
				recurse(this.body);
		},
		VariableDeclarator: function (recurse) {
			declarations.variables.push(this);
			recurse(this.init);
		},
		WithStatement: mayRecurse
	});
	return declarations;
}

