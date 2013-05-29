// should return both operands of && if the first value is not clear
//<undefined | string | number>
if (any)
	var a;
else
	var a = 'hi';
var actual = a && 19;
