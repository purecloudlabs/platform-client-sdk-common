import _ from 'lodash';
import { log } from '../log/logger.js';
import { Haystack } from '../types/config.js'

export function checkAndThrow(haystack: Haystack, needle: string, message: string = `${needle} must be set!`): void {
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
