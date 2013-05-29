// should support multiple levels of prototype chain
//number
function F() {
}
F.prototype.a = 1;
function G() {
}
G.prototype = new F;
var actual = (new G).a;
