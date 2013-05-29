// should correctly handle `PutValue` for `MultiReference`
//string
if (any)
	var a = new (function (a) { this.a = 1; });
else
	var a = new (function () {});
a.b = '';
var actual = a.b;
