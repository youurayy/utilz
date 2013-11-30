
// utilz, bsd lic

var fs = require('fs');
var crypto = require('crypto');
var async = require('async-mini');
var laeh = require('laeh2');
var _x = laeh._x;
var _e = laeh._e;
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

exports.mongodbInit = function(mongodb, dbName, srvHost, srvPort, opts, cb) {
	var pp = [], db;
	pp.push(_x(null, false, function(cb) {
		var srv = new mongodb.Server(srvHost, srvPort);
		new mongodb.Db(dbName, srv, opts.opts || {}).open(_x(cb, true, function(err, _db) {
			db = _db;
			cb();
		}));
	}));
	_.each(opts, function(indexes, colName) {
	    if(colName === 'opts')
	        return;
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


// Construct a simple-form Express.js url from a signed object.
// obj: the signed object, e.g. { func: 'a', type: 'b', sig: '4j3io4j3' }
// urlPattern: the url, e.g. 'http://user:pass@host:port/:func/:type/:sig'

exports.url = function(obj, urlPattern) {
    return urlPattern.replace(/\/\:([^\/\?]+)\??/g, function(a, m) {
        return '/' + obj[m];
    });
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


// Callback buffer

exports.CallbackBuffer = function() {

    var t = this;
    t.buff = [];
    var paused = true;

    t.pause = function() {
        paused = true;
    };

    t.isPaused = function() {
        return paused;
    };

    t.getWaiterCount = function() {
        return t.buff.length;
    };

    t.resume = function() {
        paused = false;
        var func;
        while((func = t.buff.splice(0, 1)).length)
            t.exec(func[0]);
    };

    t.wrap = function(func) { // func(err, ...)
        return function() {
            var f = {
                func: func,
                args: Array.prototype.slice.call(arguments, 0)
            };
            if(paused)
                t.buff.push(f);
            else
                t.exec(f);
        };
    };

    t.hook = function(source, events, func) {
        events.forEach(function(v) {
            source.on(v, func);
        });
    };

    t.hookOpenClose = function(source) {
        t.hookResume(source, [ 'open' ], t.resume);
        t.hookPause(source, [ 'close' ], t.pause);
    };

    function exec(f) {
        try {
            f.func.apply(null, f.args);
        }
        catch(e) {
            f.func.call(null, e);
        }
    };
};


// Generic top-level callback.

exports.cb = function(err, msg) {
    console.log(err ? (err.stack || err) : (msg || ''));
    process.exit(err ? 1 : 0);
};
