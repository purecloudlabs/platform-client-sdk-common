import _ from 'lodash';
import Winston from 'winston';
import path from 'path';
import fs from 'fs';

class Logger {

	public log: Winston.LoggerInstance;
	private static instance: Logger;
	private defaultWidth: number = 0;

	private constructor() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const logFileName = `app-${timestamp}.log`;
		const logDir = 'logs';
		
		// Ensure logs directory exists
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}
		
		const logFilePath = path.join(logDir, logFileName);
		
		this.log = new Winston.Logger({
			level: 'debug',
			transports: [
				new Winston.transports.Console({
					level: 'debug',
					handleExceptions: true,
					json: false,
					colorize: false,
					timestamp: () => new Date().toISOString(),
					formatter: (options) => {
						const ts = typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp;
        				return `${ts} [${options.level.toUpperCase()}] ${options.message}`;
					}
				}),
				new Winston.transports.File({
					filename: logFilePath,
					level: 'debug',
					handleExceptions: true,
					json: false,
					timestamp: () => new Date().toISOString(),
					formatter: (options) => {
						const ts = typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp;
						return `${ts} [${options.level.toUpperCase()}] ${options.message}`;
					}
				})
			],
		});
	}
	
	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
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
		const location = this.getCallerInfo();
		this.log.silly(`${location} ${msg}`);
	}

	public debug(msg: string) {
		const location = this.getCallerInfo();
		this.log.debug(`${location} ${msg}`);
	}

	public verbose(msg: string) {
		const location = this.getCallerInfo();
		this.log.verbose(`${location} ${msg}`);
	}

	public info(msg: string) {
		const location = this.getCallerInfo();
		this.log.info(`${location} ${msg}`);
	}

	public error(msg: string) {
		const location = this.getCallerInfo();
		this.log.error(`${location} ${msg}`);
	}

	public profile(msg: string) {
		const location = this.getCallerInfo();
		this.log.profile(`${location} ${msg}`);
	}

	public warn(msg: string) {
		const location = this.getCallerInfo();
		this.log.warn(`${location} ${msg}`);
	}

	private getCallerInfo(): string {
		const stack = new Error().stack;
		if (!stack) return '[unknown]';
		
		const lines = stack.split('\n');
		// Skip first 3 lines: Error, getCallerInfo, and the logging method
		const callerLine = lines[3];
		
		if (!callerLine) return '[unknown]';
		
		// Extract file path and line number from stack trace
		const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/);
		if (!match) return '[unknown]';
		
		const filePath = match[1];
		const lineNumber = match[2];
		const fileName = path.basename(filePath);
		
		// Extract function name if available
		const functionMatch = callerLine.match(/at\s+([^\s]+)\s+\(/) || callerLine.match(/at\s+([^\s(]+)/);
		const functionName = functionMatch && functionMatch[1] !== filePath ? functionMatch[1] : 'anonymous';
		
		return `[${fileName}:${functionName}:${lineNumber}]`;
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

// Export singleton instance
const logger = Logger.getInstance();
export default logger;

function pad(value: string, length: number, padchar: string) {
	return value.toString().length < length ? pad(value + padchar, length, padchar) : value;
}

function checkLevel(level: string) {
	return level ? level : 'debug';
}
