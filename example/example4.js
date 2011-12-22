
var utilz = require('../lib/utilz.js');
var async = require('../node_modules/async-mini');
var laeh = require('../node_modules/laeh');
var mongodb = require('../node_modules/mongodb');
var _e = laeh._e;
var _x = laeh._x;
var db;

async.series([
	_x(function(cb) {
		new mongodb.Db('example4', new mongodb.Server('localhost', 27017))
			.open(_x(function(err, _db) {
			db = _db;
			cb();
		}, cb, true));
	}),
	_x(function(cb) {
		utilz.mongodbInitCollections(db, [ 'col1', 'col2' ], cb);
	}),
	_x(function(cb) {
		utilz.mongodbEnsureIndexes(db.col1, [ [ 'field1' ], [ 'field2' ] ], cb);
	}),
	_x(function(cb) {
		utilz.mongodbEnsureIndexes(db.col2, [ [ 'field3' ], [ 'field4' ] ], cb);
	})
],
function(err) {
	_e(err);
	// the collections are now usable at db.col1 and db.col2, e.g.
	db.col1.find({ field1: 'abc' }).toArray(function(err, arr) {
		console.log(arr);
		db.close();
	});
});
