// should correctly go up the scope chain
//boolean
var a = true;
var actual = (function b() { return a; })();
