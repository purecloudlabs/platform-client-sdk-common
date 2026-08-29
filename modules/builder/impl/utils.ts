import _ from 'lodash';
import childProcess from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import pluralize from 'pluralize';
import { Script } from '../../types/config.js';
import { log } from '../../log/logger.js';
import { measureDurationFrom } from '../../util/utils.js';
import { Builder } from '../builder.js';


export function executeScripts(builder: Builder, scripts: Script[], phase: string) {
    if (!scripts) return;
    let scriptCount = scripts ? scripts.length : 0;
    log.info(`Executing ${scriptCount} ${phase ? phase.trim() + ' ' : ''}${pluralize('scripts', scriptCount)}...`);
    _.forEach(scripts, function (script) {
        executeScript(builder, script);
    });
}

function executeScript(builder: Builder, script: Script): Number {
    let code: Buffer;
    let startTime = Date.now();
    let bufferCode: Number = -1;

    log.debug(`Executing script - Type: ${script.type}, Path: ${script.path}, Args: ${script.args ? script.args.join(' ') : 'none'}`);
    try {
        let args = script.args ? script.args.slice() : [];
        let options: { [key: string]: string } = { stdio: 'inherit' };
        if (script.cwd) {
            log.debug('cwd: ' + script.cwd);
            options['cwd'] = path.resolve(script.cwd);
        }

        if (script.appendIsNewReleaseArg === true) args.push(builder.isNewVersion.toString());

        if (builder.version.displayFull && script.appendVersionArg === true) args.push(builder.version.displayFull);

        switch (script.type.toLowerCase()) {
            case 'tsx': {
                args.unshift(getScriptPath(builder, script));
                log.verbose(`Executing node script: ${args.join(' ')}`);
                code = childProcess.execFileSync('tsx', args, options);

                break;
            }
            case 'shell': {
                args.unshift(getScriptPath(builder, script));
                args.unshift('-e');
                log.verbose(`Executing shell script: ${args.join(' ')}`);
                code = childProcess.execFileSync('sh', args, options);
                break;
            }
            case 'command': {
                log.verbose(`Executing command: ${script.command} ${args.join(' ')}`);
                code = childProcess.execFileSync(script.command ?? '', args, options);

                break;
            }
            default: {
                log.warn(`UNSUPPORTED SCRIPT TYPE: ${script.type}`);
                bufferCode = 1;
                return bufferCode;
            }
        }

        if (!code || code === null) {
            bufferCode = 0;
        } else {
            bufferCode = parseInt(code.toString(), 10);
        }
    } catch (err: unknown) {
        log.error(`Script execution failed - Type: ${script.type}, Error: ${err}`);
        if (err instanceof Error) {
            if (err.message) log.error(err.message);
        }
    }

    let completedMessage = `Script completed with return code ${bufferCode} in ${measureDurationFrom(startTime)}`;
    log.debug(`Script execution completed - Type: ${script.type}, ReturnCode: ${bufferCode}, Duration: ${measureDurationFrom(startTime)}`);
    if (bufferCode !== 0) {
        log.error(completedMessage);
        if (script.failOnError === true) {
            log.error('Script failed with failOnError=true, aborting');
            throw new Error(`Script failed! Aborting. Script: ${JSON.stringify(script, null, 2)}`);
        }
        return bufferCode;
    } else {
        log.verbose(completedMessage);
        return bufferCode;
    }
}

function getScriptPath(builder: Builder, script: Script): string {
    let scriptPath = script.path;
    if (!path.parse(scriptPath).dir)
        scriptPath = path.join('./resources/sdk', builder.config.settings.swaggerCodegen.resourceLanguage, 'scripts', script.path);
    scriptPath = path.resolve(scriptPath);

    if (!fs.existsSync(scriptPath)) {
        let msg = `Script not found: ${scriptPath}`;
        throw new Error(msg);
    }

    return scriptPath;
}

