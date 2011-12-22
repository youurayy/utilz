# Utilz - Various Small Utility Functions for Node.js

## Usage

	npm install utilz
	
	var utilz = require('utilz');

## Examples

### watchFile(fileName)

Watch the specificed .js file and quit the server to restart if it has changed.
Best used with Supervisord, or Forever (when it matures).

* `fileName`: the file to watch, may be relative to `process.cwd()`.

```js
utilz.watchFile(__filename); // watch this .js
utilz.watchFile(__dirname + '/other.js'); // watch some other .js
```

In production `(NODE_ENV === 'production')`, this will not restart imediatelly, but rather wait 2 seconds, to allow for all files to be replaced first, in the case of a full update.


### timeSpan(timespanInMs)

Display time duration in human readable format, from number of days to milliseconds.

* `timespanInMs`: the time interval in milliseconds.

```js
var t1 = Date.now();
var t2 = new Date('Mon, 21 Dec 2012 21:20:12 GMT').getTime();

console.log(utilz.timeSpan(t2 - t1));
```

This will display an interval in the form of:

	368d 11h 41m 17s 57ms


### formatNumber(number, fractionDigits)

Format a number to the number of decimal places specified, and add grouping commas.

* `number`: the number to format.
* `fractionDigits`: the number of decimal places.

```js
var n = 123456.123456;

console.log(utilz.formatNumber(n, 3));
console.log(utilz.formatNumber(n, 0));
```

This will display:

	123,456.123
	123,456


### sign(obj, secret, timed)

Sign an object using sha256, optionally add timestamp. The `sig` and `ts` are reserved property names in the object.

* `obj`: the object to sign
* `secret`: the secret key
* `timed`: boolean, whether to add timestamp for later checking
* `return`: the signature, which needs to be assigned to `obj.sig`

See below for complete example.


### verify(obj, secret, timeWindowMs)

Verify a sha256 signed object, optionally check if timestamp falls into the specified window.

* `obj`: the object to verify
* `secret`: the secret key
* `timeWindowMs`: optional, the time window tolerance for the timestamp, in milliseconds
* `return`: error message or null on success

```js
var utilz = require('utilz');
var laeh = require('laeh');
var _e = laeh._e;
var _x = laeh._x;

var obj = { f: 'my func', a: 'data 1', b: 'data 2' };

console.log(obj);

obj.sig = utilz.sign(obj, 'my secret', true);

console.log(obj);

_e(utilz.verify(obj, 'my secret', 5000));

console.log('success');
```

This will print:

	{ f: 'my func', a: 'data 1', b: 'data 2' }
	{ f: 'my func', a: 'data 1', b: 'data 2', ts: 1324557616927, 
		sig: '1adb63e40223fe95a543983de5c4b4d164a84c05af3effebd1157c50e5b1a533' }
	success


### mongodbInitCollections(db, cols, cb)

Initialize mongodb (node-mongodb-native) collections and hook them right onto the db objects to prevent code litter.

* `db`: the DB object
* `cols`: array with strings, the names of the collections;
        optionally, an object where values are names of mongo collections,
        and keys are aliases under which to store them on the db object
* `cb`: the callback to call when done

See below for complete example.


### mongodbEnsureIndexes(col, indexes, cb)

Initialize mongodb (node-mongodb-native) indexes for a specific collection.

* `col`: the initialized collection
* `indexes`: array with strings, the names of the indexes
* `cb`: the callback to call when done

Complete example of to open a MongoDB database using `mongodbInitCollections` and `mongodbEnsureIndexes`, plus helpers from `asinc-mini` and `LAEH`.

```js
var utilz = require('utilz');
var async = require('async-mini');
var laeh = require('laeh');
var mongodb = require('mongodb');
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
		utilz.mongodbEnsureIndexes(db.col1, [[ 'field1' ], [ 'field2' ]], cb);
	}),
	_x(function(cb) {
		utilz.mongodbEnsureIndexes(db.col2, [[ 'field3' ], [ 'field4' ]], cb);
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
```


### More...

More functions will be added in the future.
