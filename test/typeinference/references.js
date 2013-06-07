// should handle references correctly
//number:10

var a = {a: {a:''}};
var b = a.a;
a.a.a = 10;
var actual = b.a;
