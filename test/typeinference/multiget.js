// should correctly handle `GetValue` for `MultiReference`
//<string:"str" | number:10>
if (any)
	var a = {a: 'str'};
else
	var a = {a: 10};
var actual = a.a;
