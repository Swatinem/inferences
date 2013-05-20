
var StringMap = require('../').StringMap;
var should = require('should');

describe('StringMap', function () {
	it('should support basic map functions', function () {
		var m = new StringMap();
		m.has('k').should.be.false;
		m.set('k', 1);
		m.has('k').should.be.true;
		m.get('k').should.eql(1);
		m.delete('k');
		m.has('k').should.be.false;
		should.not.exist(m.get('k'));
	});
	it('should not choke on reserved properties', function () {
		var m = new StringMap();
		m.has('__proto__').should.be.false;
		m.set('__proto__', 1);
		m.get('__proto__').should.eql(1);
		m.delete('__proto__');
		m.has('__proto__').should.be.false;
	});
});
