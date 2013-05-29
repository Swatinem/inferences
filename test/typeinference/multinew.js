// should handle new of `MultiValue` functions correctly
//<number | string>
if (any)
	var f = function (a) { this.a = 1; };
else
	var f = function () { this.a = ''; };
var actual = (new f).a;
