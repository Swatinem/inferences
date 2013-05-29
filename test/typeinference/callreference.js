// should handle call of a reference correctly
//undefined
function a() {
	return;
}
if (a())
	var actual = 1;
else
	var actual;
