// should support writing to outer variable
//number
var a;
(function () { a = 10; })();
var actual = a;
