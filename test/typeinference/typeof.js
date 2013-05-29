// should support basic typeof
//string

// TODO: split this out into different tests once we have == support
typeof null;
typeof function () {};
typeof any;

var a = 1;
var actual = typeof a ? '' : 1;
