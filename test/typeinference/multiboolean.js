// should correctly work with boolean `MultiValue`s
//<string:"" | boolean:true>
if (any)
	var a = 'hi';
else
	var a;
// a = <undefined | string:"hi">
if (a)
	var actual = '';
else
	var actual = true;
