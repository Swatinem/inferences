// should handle cycles correctly
//number:10

var a = {b: ''};
a.a = a;
a.b = 10;
var actual = a.a.b;
