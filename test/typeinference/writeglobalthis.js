// should create new properties on the global object
//number
(function () { this.a = 1; })();
var actual = a;
