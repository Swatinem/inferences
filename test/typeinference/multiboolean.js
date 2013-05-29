// should correctly work with boolean `MultiValue`s
//<string | boolean>
if (any)
	var a = 'hi';
else
	var a;
// a = <undefined | string>
if (a)
	var actual = '';
else
	var actual = true;
