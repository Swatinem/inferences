// should handle the void operator correctly
//number:10
var a;
var actual = void (a = 10) ? '' : a;
