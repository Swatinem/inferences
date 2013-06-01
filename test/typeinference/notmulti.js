// should just create a blank bool if the value has clear value
//<number:9 | string:"">
if (any)
	var a = 9;
else
	var a;
var actual = !a ? 9 : '';
