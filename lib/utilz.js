
// Utilz - Various Small Utility Functions for Node.js
//
// Copyright (c) 2012 Juraj Vitko <http://github.com/ypocat>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var fs = require('fs');
var async = require('async-mini');
var laeh = require('laeh');
var _x = laeh._x;
var _ = require('underscore');


// Watch the specificed .js file and quit the server to restart if it has changed.
// best used with Supervisord, or Forever (when it matures)
// filename: the file to watch, may be relative to process.cwd()

exports.watchFile = function(filename) {
	setTimeout(function() {
		fs.watchFile(filename, { interval: 500 }, function(curr, prev) {
			if(curr.mtime.getTime() !== prev.mtime.getTime()) {
				setTimeout(function() {
					console.log(filename + ' has changed, exiting to be restarted...');
					process.exit(3);
				},
				process.env.NODE_ENV === 'production' ? 2000 : 0);
			}
		});
	}, 5000);
};


// Display time duration in human readable format, from number of days to milliseconds.
// t: the time interval in milliseconds

exports.timeSpan = function(t) {
	var f = Math.floor;
	if(t < 1000)
		return t + "ms";
	if(t < 60000)
		return f(t / 1000) + "s " + f(t % 1000) + "ms";
	if(t < 3600000)
		return f(t / 60000) + "m " + f((t % 60000) / 1000) + "s " + f(t % 1000) + "ms";
	if(t < 86400000)
		return f(t / 3600000) + "h " + f((t % 3600000) / 60000) + "m " +
			f((t % 60000) / 1000) + "s " + f(t % 1000) + "ms";
	return f(t / 86400000) + "d " +
		f((t % 86400000) / 3600000) + "h " + f((t % 3600000) / 60000) + "m " +
		f((t % 60000) / 1000) + "s " + f(t % 1000) + "ms";
};


// Format a number to the number of decimal places specified.
// n: the number to format
// fr: the number of decimal places

exports.formatNumber = function(n, fr) {
	n = n.toFixed(!fr && fr !== 0 ? 2 : fr) + '';
	x = n.split('.');
	x1 = x[0];
	x2 = Number(x[1]) > 0 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1))
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	return x1 + x2;
};


// Initialize mongodb (node-mongodb-native) collections and hook
// them right onto the db objects to prevent code litter.
// db: the DB object
// cols: array with string, the names of the collections
// cb: the callback to call when done

exports.mongodbInitCollections = function(db, cols, cb) {
	var aa = [];
	_.each(cols, function(v, k) {
		aa.push(_x(function(cb) {
			db.collection(v, _ex(function(err, col) {
				db[k] = col;
				cb();
			}, cb));
		}));
	});
	async.series(aa, _ex(function(err, res) {
		cb();
	}, cb));
};


// 

export.mongodbEnsureIndexes = function(col, arr, cb) {
	var pp = _.map(arr, function(v) {
		return _x(function(cb) {
			v.push(cb);
			col.ensureIndex.apply(col, v);
		});
	});
	async.series(pp, _ex(function(err) {
		cb();
	}, cb));
};
