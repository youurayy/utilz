# Utilz - Various Small Utility Functions for Node.js

## Usage

	npm install utilz
	
	var utilz = require('utilz');

## Examples

### watchFile(fileName)

Watch the specificed .js file and quit the server to restart if it has changed.
Best used with Supervisord, or Forever (when it matures).
`filename`: the file to watch, may be relative to `process.cwd()`.

```js
utilz.watchFile();
utilz.watchFile(__dirname + '/other.js');
```

In production (NODE_ENV === 'production'), this will not restart imediatelly, but rather wait 2 seconds, to allow for all files to be replaced first, in the case of a full update.


### timeSpan(timespanInMs)

Display time duration in human readable format, from number of days to milliseconds.
`t`: the time interval in milliseconds.

```js
var t1 = Date.now();
var t2 = new Date('Mon, 21 Dec 2012 21:20:12 GMT').getTime();

console.log(utilz.timeSpan(t2 - t1));
```

This will display an interval in the form of:

	368d 11h 41m 17s 57ms


### formatNumber(number, fractionDigits)

Format a number to the number of decimal places specified.
`n`: the number to format.
`fr`: the number of decimal places.

```js
var n = 3.14159265;

console.log(utilz.formatNumber(n, 3));
console.log(utilz.formatNumber(n, 0));
```

This will display:

	3.142
	3


### More...

More functions will be added in the future.
