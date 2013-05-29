// should handle call of `MultiValue` functions correctly
//<number | string>
if (any)
	var f = function () { return 1; };
else
	var f = function () { return ''; };
var actual = f();
