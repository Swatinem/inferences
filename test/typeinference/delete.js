// should support delete statement
//any
var o = {a: ''};
delete o.a;
// just for test coverage:
delete (true);
delete any.any;
var a = '';
delete a;

var actual = o.a;
