const _ = require('lodash');
const Winston = require('winston');



function Logger() { }

Logger.prototype.log = new Winston.Logger({
    transports: [
        new Winston.transports.Console({
            level: 'silly',
            handleExceptions: true,
            json: false,
            colorize: false
        })
    ]
});



Logger.prototype.setLogLevel = function(level) {
	level = checkLevel(level);
	this.log.transports.console.level = level;
	this.log.info(`Log level set to ${level}`);
};

Logger.prototype.setUseColor = function(useColor) {
	this.log.transports.console.colorize = useColor === true;
	this.log.info(`Logger will use color: ${useColor}`);
};

// Passthrough functions
Logger.prototype.silly = function(msg) { this.log.silly(msg); };
Logger.prototype.debug = function(msg) { this.log.debug(msg); };
Logger.prototype.verbose = function(msg) { this.log.verbose(msg); };
Logger.prototype.info = function(msg) { this.log.info(msg); };
Logger.prototype.warn = function(msg) { this.log.warn(msg); };
Logger.prototype.error = function(msg) { this.log.error(msg); };

Logger.prototype.profile = function(msg) { this.log.profile(msg); };


Logger.prototype.writeBoxedLine = function(string, width, padchar, level) {
	level = checkLevel(level);
	if (!width) width = this.defaultWidth;
	if (!padchar) padchar = ' ';
	var cWidth = width - 4;
	var words = string.split(' ');
	var rows = [];
	var c = 0;
	_.forEach(words, function(word, index) {
		if (!rows[c]) rows[c] = '';
		if (rows[c].length + word.length + 1 > cWidth) {
			c++;
			rows[c] = '';
		}
		rows[c] += word + ' ';
	});

	// Lodash messes with this/self. self is set to the Builder object for some reason.
	var logObject = this.log;
	_.forEach(rows, function(row, index) {
		logObject.log(level, '║ ' + pad(row.trimRight(), cWidth, padchar) + ' ║');
	});
};

Logger.prototype.writeBoxTop = function(width, level) {
	level = checkLevel(level);
	if (!width) width = this.defaultWidth;
	this.log.log(level, '╔' + pad('', width - 2, '═') + '╗');
};

Logger.prototype.writeBoxSeparator = function(width, level) {
	level = checkLevel(level);
	if (!width) width = this.defaultWidth;
	this.log.log(level, '╟' + pad('', width - 2, '─') + '╢');
};

Logger.prototype.writeBoxBottom = function(width, level) {
	level = checkLevel(level);
	if (!width) width = this.defaultWidth;
	this.log.log(level, '╚' + pad('', width - 2, '═') + '╝');
};

Logger.prototype.writeBox = function(string, width, level) {
	// default boxes to info
	level = level ? level : 'info';
	if (!width)
		width = string.length > this.defaultWidth ? this.defaultWidth : string.length + 5;
	this.writeBoxTop(width, level);
	this.writeBoxedLine(string, width, null, level);
	this.writeBoxBottom(width, level);
};

function pad(value, length, padchar) {
    return (value.toString().length < length) ? pad(value+padchar, length, padchar):value;
}

function checkLevel(level) { return level ? level : 'debug'; }

self = module.exports = new Logger();
