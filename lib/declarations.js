
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

	function mayRecurse(node, recurse) {
		if (options.recurse)
			walkes.checkProps(node, recurse);
	}

	walkes(astNode, {
		CatchClause: mayRecurse,
		FunctionDeclaration: function (node, recurse) {
			declarations.functions.push(node);
			if (options.recurse)
				recurse(node.body);
		},
		FunctionExpression: function (node, recurse) {
			if (options.expressions)
				declarations.functions.push(node);
			if (options.recurse)
				recurse(node.body);
		},
		VariableDeclarator: function (node, recurse) {
			declarations.variables.push(node);
			recurse(node.init);
		},
		WithStatement: mayRecurse
	});
	return declarations;
}

