import _ from 'lodash';
import Winston from 'winston';

export default class Logger {

	public log: Winston.LoggerInstance;

	private defaultWidth: number = 0;

	constructor() {
		this.log = new Winston.Logger({
			transports: [
				new Winston.transports.Console({
					level: 'silly',
					handleExceptions: true,
					json: false,
					colorize: false,
				}),
			],
		});
	}

	public setLogLevel(level: string): void {
		level = checkLevel(level);
		this.log.transports.console.level = level;
		this.log.info(`Log level set to ${level}`);
	}

	public setUseColor(useColor: boolean) {
		(this.log.transports.console as Winston.ConsoleTransportInstance).colorize = useColor === true;
		this.log.info(`Logger will use color: ${useColor}`);
	};


	public silly(msg: string) {
		this.log.silly(msg);
	}

	public debug(msg: string) {
		this.log.debug(msg);
	}

	public verbose(msg: string) {
		this.log.verbose(msg);
	}

	public info(msg: string) {
		this.log.info(msg);
	}

	public error(msg: string) {
		this.log.error(msg);
	}

	public profile(msg: string) {
		this.log.profile(msg);
	}

	public warn(msg: string) {
		this.log.warn(msg);
	}

	public writeBoxedLine(string: string, width: number, padchar: string, level: string) {
		level = checkLevel(level);
		if (!width) width = this.defaultWidth;
		if (!padchar) padchar = ' ';
		let cWidth = width - 4;
		let words = string.split(' ');
		let rows = [];
		let c = 0;
		_.forEach(words, function (word, index) {
			if (!rows[c]) rows[c] = '';
			if (rows[c].length + word.length + 1 > cWidth) {
				c++;
				rows[c] = '';
			}
			rows[c] += word + ' ';
		});

		// Lodash messes with this/self. self is set to the Builder object for some reason.
		let logObject = this.log;
		_.forEach(rows, function (row, index) {
			logObject.log(level, '║ ' + pad(row.trimRight(), cWidth, padchar) + ' ║');
		});
	};


	public writeBoxTop(width: number, level: string) {
		level = checkLevel(level);
		if (!width) width = this.defaultWidth;
		this.log.log(level, '╔' + pad('', width - 2, '═') + '╗');
	};

	public writeBoxSeparator(width: number, level: string) {
		level = checkLevel(level);
		if (!width) width = this.defaultWidth;
		this.log.log(level, '╟' + pad('', width - 2, '─') + '╢');
	};

	public writeBoxBottom(width: number, level: string) {
		level = checkLevel(level);
		if (!width) width = this.defaultWidth;
		this.log.log(level, '╚' + pad('', width - 2, '═') + '╝');
	};

	public writeBox(string: string, width: number = 0, level: string = "info") {
		// default boxes to info
		level = level ? level : 'info';

		if (width == 0) width = string.length < this.defaultWidth ? this.defaultWidth : string.length + 5;
		this.writeBoxTop(width, level);
		this.writeBoxedLine(string, width, null, level);
		this.writeBoxBottom(width, level);
	};
}

function pad(value: string, length: number, padchar: string) {
	return value.toString().length < length ? pad(value + padchar, length, padchar) : value;
}

function checkLevel(level: string) {
	return level ? level : 'debug';
}
