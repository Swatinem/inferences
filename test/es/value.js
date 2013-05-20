
var Runtime = require('../../').Runtime;

var MultiValue = Runtime.prototype.MultiValue;

describe('MultiValue', function () {
	it('should act like a `Set`', function () {
		var m = new MultiValue();
		m.add('a');
		m.add('a');
		var called = 0;
		m.forEach(function (e) {
			called++;
			e.should.eql('a');
		});
		called.should.eql(1);
	});
	it('should `add` another MultiValue', function () {
		var m1 = new MultiValue(['a', 'b']);
		var m2 = new MultiValue();
		m2.add(m1);
		m2.values().should.eql(m1.values());
	});
});
