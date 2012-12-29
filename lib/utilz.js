
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
var crypto = require('crypto');
var async = require('async-mini');
var laeh = require('laeh2');
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

exports.timeSpan = timeSpan = function(t) {
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


// Open mongodb database and initialize collections and their indexes.

exports.mongodbInit = function(mongodb, dbName, srvHost, srvPort, colIdx, cb) {
	var pp = [], db;
	pp.push(_x(null, false, function(cb) {
		var srv = new mongodb.Server(srvHost, srvPort);
		new mongodb.Db(dbName, srv).open(_x(cb, true, function(err, _db) {
			db = _db;
			cb();
		}));
	}));
	_.each(colIdx, function(indexes, colName) {
		pp.push(_x(null, false, function(cb) {
			db.collection(colName, _x(cb, true, function(err, col) {
				db[colName] = col;
				var aa = _.map(indexes, function(v) {
					return _x(null, false, function(cb) {
						v.push(cb);
						col.ensureIndex.apply(col, v);
					});
				});
				async.series(aa, _x(cb, true, function(err) {
					cb();
				}));
			}));
		}));
	});
	async.series(pp, _x(cb, true, function(err) {
		cb(null, db);
	}));
};


// Sign an object using sha256, optionally add timestamp.
// `sig` and `ts` are reserved property names in the object.
// obj: the object to sign
// secret: the secret key
// timed: boolean, whether to add timestamp for later checking
// return: the signature, which needs to be assigned to obj.sig

exports.sign = sign = function(obj, secret, timed) {
	if(timed)
		obj.ts = Date.now();
	var b = [];
	_.each(_.keys(obj).sort(), function(e) {
		if(e != 'sig') {
			b.push(e);
			var v = obj[e];
			b.push(Array.isArray(v) ? JSON.stringify(v) : String(v));
		}
	});
	b.push(secret);
	var s = b.join('|');
	return crypto.createHash('sha256').update(s).digest('hex');
};


// Verify a sha256 signed object, optionally check if timestamp 
// falls into the specified window.
// obj: the object to verify
// secret: the secret key
// timeWindowMs: optional, the time window tolerance for the 
//               timestamp, in milliseconds
// return: error message or null on success

exports.verify = function(obj, secret, timeWindowMs) {
	if(sign(obj, secret) !== obj.sig)
		return 'invalid signature';
	
	if(timeWindowMs) {
		if(!obj.ts)
			return 'missing timestamp';

		var half = timeWindowMs / 2;
		var timestamp = new Date(obj.ts).getTime();
		var latest = timestamp - timeWindowMs;
		var earliest = timestamp + timeWindowMs;
		
		// timespan plus window:
		//   latest -----|timestamp|---- earliest
		
		var now = Date.now();
		if(now < latest)
			return 'timestamp too late by ' + timeSpan(latest - now);
		if(now > earliest)
			return 'timestamp too early by ' + timeSpan(now - earliest);
	}
	
	return null;
}


// Special treatment for mongodb's findAndModify(), when the object is not found
// err: error passed by mongodb
// msg: your message describing the situation (see the README.md for usage)

exports.mongodbFAMCheck = function(err, msg) {
	if(err && err.errmsg === 'No matching object found')
		_e(msg);
	_e(err);
};


// Generate a random string based on the passed options.

exports.randomString = function(opts) {
    
    opts = _.defaults(opts || {}, {
        length: 10,
        ratios: [
            { type: 'numeric', probability: .2 },
            { type: 'upper', probability: .6 },
            { type: 'lower', probability: 1 }
        ]
    });
    
    opts.ratios.sort(function(a, b) {
        return a.probability < b.probability ? -1 : 1;
    });
    
    function rfunc(r) {
        switch(r.type) {
            case 'numeric': return 48 + Math.floor(Math.random() * 9);
            case 'upper': return 65 + Math.floor(Math.random() * 25);
            case 'lower': return 97 + Math.floor(Math.random() * 25);
        }
    }
    
    var s = '';
    
    for(var i = 0; i < opts.length; i++) {
        
        var n = Math.random();
        
        for(var j = 0; j < opts.ratios.length; j++) {
            
            var r = opts.ratios[j];
            
            if(n <= r.probability) {
                s += String.fromCharCode(rfunc(r));
                break;
            }
        }
    }
    
    return s;
};
