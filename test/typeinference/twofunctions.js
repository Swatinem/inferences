// TODO: should override already defined global function
//string:"str"

function a() { return 1; }
function a() { return 'str'; }
var actual = a();
