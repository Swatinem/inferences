// should also do branching and merging inside function calls
//<number | string>
var a
var actual = (function () {
	if (any)
		a = 1;
	else
		a = '';
	return a;
})();
