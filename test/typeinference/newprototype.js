// should support object construction using `new`
//number
function F() {
}
F.prototype.a = 1;
var actual = (new F).a;
