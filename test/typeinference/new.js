// should write props on the new object
//number
function F() {
	this.a = 10;
}
var actual = (new F).a;
