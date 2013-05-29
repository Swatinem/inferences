// should expose the global object as `this` for simple functions
//number
var a = 1;
var actual = (function () { return this.a; })();
