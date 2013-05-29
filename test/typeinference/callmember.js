// should handle call as part of a `MemberExpression`
//number
var o = {prop: 10, func: function b() { return this.prop; }};
var actual = o.func();
