// should handle the void operator correctly
//number
var a;
var actual = void (a = 10) ? '' : a;
