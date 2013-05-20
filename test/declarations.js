
var esprima = require('esprima');
var find = require('../').declarations;

describe('declarations', function () {
	it('should find `FunctionDeclaration`s', function () {
		var ast = esprima.parse('function a() {}');
		var f = find(ast);
		f.functions.length.should.eql(1);
		f.functions[0].should.equal(ast.body[0]);
	});
	it('should find `VariableDeclarator`s', function () {
		var ast = esprima.parse('var a, b;');
		var f = find(ast);
		f.variables.length.should.eql(2);
		f.variables[0].should.equal(ast.body[0].declarations[0]);
		f.variables[1].should.equal(ast.body[0].declarations[1]);
	});
	it('should only collect `FunctionExpression`s when requested', function () {
		var ast = esprima.parse('(function () {})');
		var f = find(ast);
		f.functions.length.should.eql(0);

		f = find(ast, {expressions: true});
		f.functions.length.should.eql(1);
		f.functions[0].should.equal(ast.body[0].expression);
	});
	it('should only recurse when requested', function () {
		var ast = esprima.parse(
			'function a() { var vina; function fina() {} }\n' +
			'(function b() { var vinb; function finb() {} })\n' +
			'try {} catch (e) { var vinc; function finc() {} }\n' +
			'with (o) { var vinw; function finw() {} }'
		);
		var f = find(ast, {expressions: true});
		f.functions.length.should.eql(2);
		f.variables.length.should.eql(0);

		f = find(ast, {expressions: true, recurse: true});
		f.functions.length.should.eql(6);
		f.variables.length.should.eql(4);
	});
});
