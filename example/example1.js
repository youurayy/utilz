
var utilz = require('../lib/utilz.js');

var t1 = Date.now();
var t2 = new Date('Mon, 21 Dec 2012 21:20:12 GMT').getTime();

console.log(utilz.timeSpan(t2 - t1));