
var esprima = require('esprima');
var inference = require('../');
var fs = require('fs');

function doInference(ast) {
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
	runtime = output.output.get(exit).first();
	return runtime.get('actual');
}

function createTest(dir, file) {
	var contents = fs.readFileSync(dir + file, 'utf8');
	var ast = esprima.parse(contents, {comment: true});
	var comments = ast.comments;
	var title = comments[0].value.trim() + ' (' + file + ')';
	var expected = comments[1].value;
	// possibly skip the tests
	(title.indexOf('TODO:') === 0 ? it.skip : it)(title, function () {
		var value = doInference(ast, dir + file /* for resolving require() */);
		var actual = value && value.toString() || 'any';
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
		var output = inferred.output.get(inferred.cfg[1]).first();
		output.globalObject.toString().should
			.eql('object:{"a": undefined, "b": object:{"a": <any | number:1>, "b": boolean:true, "c": string:"str", "d": null, "e": undefined, "f": function:{"length": number:0, "prototype": object:{"constructor": [Cycle]}}}}');
	});
});
