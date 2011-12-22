
var utilz = require('../lib/utilz.js');
var laeh = require('../node_modules/laeh');
var _e = laeh._e;
var _x = laeh._x;

var obj = { f: 'my func', a: 'data 1', b: 'data 2' };

console.log(obj);

obj.sig = utilz.sign(obj, 'my secret', true);

console.log(obj);

_e(utilz.verify(obj, 'my secret', 5000));

console.log('success');