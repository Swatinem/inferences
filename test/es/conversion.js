
var Runtime = require('../../').Runtime;
var should = require('should');

var runtime = Runtime.prototype;
function toBool(V) {
	return runtime.ToBoolean(V).PrimitiveValue;
}

describe('ToBoolean', function () {
	it('should return a new Boolean value', function () {
		runtime.ToBoolean(new runtime.Value())
			.should.be.an.instanceof(runtime.BooleanValue);
	});
	it('should be true for truthy primitive values', function () {
		toBool(new runtime.BooleanValue(true)).should.be.true;
		toBool(new runtime.NumberValue(1)).should.be.true;
		toBool(new runtime.StringValue('a')).should.be.true;
	});
	it('should be false for falsy primitive values', function () {
		toBool(new runtime.BooleanValue(false)).should.be.false;
		toBool(new runtime.NumberValue(0)).should.be.false;
		toBool(new runtime.StringValue('')).should.be.false;
	});
	it('should be true for truthy MultiValues', function () {
		var v = new runtime.MultiValue();
		v.add(new runtime.BooleanValue(true));
		v.add(new runtime.NumberValue(1));
		v.add(new runtime.StringValue('a'));
		toBool(v).should.be.true;
	});
	it('should be false for falsy MultiValues', function () {
		var v = new runtime.MultiValue();
		v.add(new runtime.BooleanValue(false));
		v.add(new runtime.NumberValue(0));
		v.add(new runtime.StringValue(''));
		toBool(v).should.be.false;
	});
	it('should be false for undefined and null', function () {
		toBool(runtime.null).should.be.false;
		toBool(runtime.undefined).should.be.false;
	});
	it('should be true for objects', function () {
		toBool(new runtime.ObjectValue()).should.be.true;
	});
	it('should not give a value for unknown values', function () {
		should.not.exist(toBool(new runtime.BooleanValue()));
		should.not.exist(toBool(new runtime.NumberValue()));
		should.not.exist(toBool(new runtime.StringValue()));

		var v = new runtime.MultiValue();
		v.add(new runtime.BooleanValue(true));
		v.add(new runtime.NumberValue(1));
		v.add(new runtime.StringValue());
		should.not.exist(toBool(v));
	});
});
