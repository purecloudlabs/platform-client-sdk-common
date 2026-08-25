import _ from 'lodash';
import fs from 'fs-extra';
import { Haystack } from '../types/config.js'
import { Builder } from '../builder/builder.js'
import { log } from '../log/logger.js';

export function maybeInit(haystack: Builder | Haystack, needle: string, defaultValue: Haystack, warning: string = "Haystack was undefined!"): void {
	if (!haystack) {
		log.warn(warning);
		return;
	}
	if (!haystack[needle]) {
		haystack[needle] = defaultValue;
	}
}

export function checkAndThrow(haystack: Builder | Haystack, needle: string, message: string = `${needle} must be set!`): void {
	if (!haystack[needle] || haystack[needle] === '') {
		throw new Error(message);
	}
}

export function getEnv(
	varname: string,
	defaultValue: string = '',
	isdefaultValue: boolean = false
): string | boolean {
	varname = varname.trim();
	const envVar = process.env[varname];
	log.silly(`ENV: ${varname}->${envVar}`);

	if (!envVar && defaultValue !== '') {
		if (isdefaultValue === true) {
			log.info(`Using default value for ${varname}: ${defaultValue}`);
		} else {
			log.warn(`Using override for ${varname}: ${defaultValue}`);
		}
		return defaultValue;
	}

	if (envVar) {
		if (envVar.toLowerCase() === 'true') {
			return true;
		} else if (envVar.toLowerCase() === 'false') {
			return false;
		} else {
			return envVar;
		}
	}

	return defaultValue;
}

export function setEnv(varname: string, value: any) {
	let values = [value];
	resolveEnvVars(values);
	varname = varname.trim();
	log.silly(`ENV: ${varname}=${values[0]}`);
	process.env[varname] = values[0];
}

//recursive for config, localconfig, enVars, Settings
export function resolveEnvVars(config: { [key: string]: any }) {
	_.forOwn(config, function (value, key) {
		if (typeof value == 'string') {
			config[key] = value.replace(/\$\{(.+?)\}/gi, function (match, p1, offset, string) {
				return getEnv(p1) as string;
			});
		} else {
			resolveEnvVars(value);
		}
	});
}

export function getFileCount(dir: fs.PathLike) {
	if (!fs.existsSync(dir)) {
		log.silly(`Directory doesn't exist: ${dir}`);
		return 0;
	}
	let files = fs.readdirSync(dir);
	log.silly(`There are ${files.length} files in ${dir}`);

	if (files.length == 1 && files[0] === '.DS_Store') {
		log.silly("...and it's named .DS_Store   ಠ_ಠ");
		return 0;
	}

	return files.length;
}

export function measureDurationFrom(startTime: number, endTime: number = Date.now()) {
	if (!startTime) return 'no time';
    if (endTime > startTime) return 'negative time';

    // ms
    let timeDiff = endTime - startTime;
    const time = {
        day: Math.floor(timeDiff / 86400000),
        hour: Math.floor(timeDiff / 3600000) % 24,
        minute: Math.floor(timeDiff / 60000) % 60,
        second: Math.floor(timeDiff / 1000) % 60
    };
    let humanizedTimeDiff = Object.entries(time)
        .filter(val => val[1] !== 0)
        .map(([key, val]) => `${val} ${key}${val !== 1 ? 's' : ''}`)
        .join(', ');

	return humanizedTimeDiff;
}
