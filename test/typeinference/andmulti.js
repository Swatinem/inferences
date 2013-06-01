// should return both operands of && if the first value is not clear
//<undefined | string:"hi" | number:19>
if (any)
	var a;
else
	var a = 'hi';
var actual = a && 19;
