// should support `new` returning an ObjectValue
//number
function F() {
	return {a: 1};
}
var actual = (new F).a;
