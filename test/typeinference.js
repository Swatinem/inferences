
var esprima = require('esprima');
var inference = require('../');
var esgraph = require('esgraph');
var fs = require('fs');

function doInference(ast, filename) {
	var output = inference(ast);
	var runtime = output.runtime;
	var exit = output.cfg[1];

	// exception edges mess up everything, so rather use the node before the exit
	// node
	var normals = exit.prev.filter(function (n) { return n.normal === exit; })
		.reduce(function (arr, elem) {
			if (!~arr.indexOf(elem))
				arr.push(elem);
			return arr;
		}, []);
	if (normals.length === 1)
		exit = normals[0];
	// get the environment of the output node
	var env = output.output.get(exit);
	// and resolve it to a value
	var ref = runtime.GetIdentifierReference(env.LexicalEnvironment, 'actual', false);
	var value = runtime.GetValue(ref);
	return value;
}

function createTest(dir, file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	var comments = ast.comments;
	var title = comments[0].value.trim() + ' (' + file + ')';
	var expected = comments[1].value;
	// possibly skip the tests
	// FIXME: skip all for now, till I actually get stuff working
	(title.indexOf('TODO:') == 0 ? it.skip : it)(title, function () {
		var value = doInference(ast, dir + file /* for resolving require() */);
		var actual;
		if (value instanceof Array && value.length === 1)
			value = value[0];
		if (value instanceof Array) {
			actual = '<' + value.map(function (e) { return e.Type.toLowerCase(); }).join(' | ') + '>';
		} else
			actual = value && value.Type.toLowerCase() || 'any';
		actual.should.equal(expected);
	});
}

function checkFiles(dir) {
	var files = fs.readdirSync(dir);
	files.forEach(function (file) {
		if (/\.js$/.test(file)) {
			createTest(dir, file);
		} else {
			// this may be a directory?
			describe(file, function () {
				checkFiles(dir + file + '/');
			});
		}
	});
}

describe('Type Inference', function () {
	var basedir = __dirname + '/typeinference/';
	checkFiles(basedir);

	it('should pretty print all the objects', function () {
		var ast = esprima.parse('var a, b = {a: any || 1, b: true, c: "str", d: null, e: a, f: function () {}}');
		var inferred = inference(ast);
		inferred.output.get(inferred.cfg[1]).toString().should
			.eql('{"a": undefined, "b": {"a": [any, number:1], "b": boolean:true, "c": string:"str", "d": null, "e": undefined, "f": {"length": number:0, "prototype": {"constructor": [Cycle]}}}}');
	});
});
