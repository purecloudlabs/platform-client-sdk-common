import _ from 'lodash';
import childProcess from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { zipDir } from '../../util/zip.js';
import { log } from '../../log/logger.js';
import { getEnv, getFileCount } from '../../util/utils.js';
import { Builder } from '../builder.js';
import { executeScripts } from './utils.js';


export async function buildImpl(builder: Builder): Promise<void> {
    try {
        log.debug('Starting build implementation');
        // Pre-run scripts
        log.debug('Executing build pre-run scripts');
        executeScripts(builder, builder.config.stageSettings.build.preRunScripts, 'custom build pre-run');

        let outputDir = path.join(getEnv('SDK_REPO') as string, 'build');
        log.debug(`Setting up build output directory: ${outputDir}`);
        fs.emptyDirSync(outputDir);

        let command = '';
        // Java command and options
        command += 'java ';
        command += `-DapiTests=${builder.config.settings.swaggerCodegen.generateApiTests} `;
        command += `-DmodelTests=${builder.config.settings.swaggerCodegen.generateModelTests} `;
        command += `${getEnv('JAVA_OPTS', '')} -XX:MaxMetaspaceSize=256M -Xmx2g -DloggerPath=conf/log4j.properties `;
        // Swagger-codegen jar file
        if (builder.config.settings.swaggerCodegen.isOpenApiCustomGenerator === true) {
            // To run custom language/generator with openapi-generator
            // the jarPath will include both plugin for the custom language/generator and the openapi-generator jar file
            command += `-cp ${builder.config.settings.swaggerCodegen.jarPath} org.openapitools.codegen.OpenAPIGenerator `;
        } else {
            // To run swagger-generator (legacy), or to run language/generator provided with openapi-generator (supported/included)
            command += `-jar ${builder.config.settings.swaggerCodegen.jarPath} `;
        }

        // Swagger-codegen options
        command += 'generate ';
        command += `-i ${builder.newSwaggerTempFile} `;
        command += `-g ${builder.config.settings.swaggerCodegen.codegenLanguage} `;
        command += `-o ${outputDir} `;
        command += `-c ${builder.config.settings.swaggerCodegen.configFile} `;
        command += '--skip-validate-spec ';
        // Don't append empty templates directory
        if (getFileCount(builder.resourcePaths.templates) > 0) command += `-t ${builder.resourcePaths.templates} `;

        _.forEach(builder.config.settings.swaggerCodegen.extraGeneratorOptions, (option) => (command += ' ' + option));

        log.debug(`Executing swagger-codegen command: ${command}`);
        log.info('Running swagger-codegen...');
        let code = childProcess.execSync(command, { stdio: 'inherit' });
        log.debug('Swagger-codegen execution completed');

        log.debug('Checking for extensions to copy...');
        if (fs.existsSync(builder.resourcePaths.extensions)) {
            log.debug(`Copying extensions from ${builder.resourcePaths.extensions} to ${builder.config.settings.extensionsDestination}`);
            log.info('Copying extensions...');
            fs.copySync(builder.resourcePaths.extensions, builder.config.settings.extensionsDestination);
        } else {
            log.debug('Extensions path not found');
            log.warn(`Extensions path does not exist! Path: ${builder.resourcePaths.extensions}`);
        }

        if (builder.config.settings.samplesDestination) {
            log.debug('Checking for samples to copy...');
            if (builder.resourcePaths.samples && fs.existsSync(builder.resourcePaths.samples)) {
                fs.ensureDirSync(builder.config.settings.samplesDestination);
                log.debug(`Copying samples from ${builder.resourcePaths.samples} to ${builder.config.settings.samplesDestination}`);
                log.info('Copying samples...');
                fs.copySync(builder.resourcePaths.samples, builder.config.settings.samplesDestination);
            } else {
                log.debug('Samples path not found');
                log.warn(`Samples path does not exist! Path: ${builder.resourcePaths.samples}`);
            }
        }

        // Ensure compile scripts fail on error
        _.forEach(builder.config.stageSettings.build.compileScripts, function (script) {
            script.failOnError = true;
        });

        // Run compile scripts
        log.debug('Executing compile scripts');
        executeScripts(builder, builder.config.stageSettings.build.compileScripts, 'compile');

        // Copy readme from build to docs and repo root
        log.debug('Starting readme copy operations');
        log.info('Copying readme...');
        fs.ensureDirSync(path.join(getEnv('SDK_REPO') as string, 'build/docs'));
        fs.createReadStream(path.join(getEnv('SDK_REPO') as string, 'build/README.md')).pipe(
            fs.createWriteStream(path.join(getEnv('SDK_REPO') as string, 'build/docs/index.md'))
        );
        fs.createReadStream(path.join(getEnv('SDK_REPO') as string, 'build/README.md')).pipe(
            fs.createWriteStream(path.join(getEnv('SDK_REPO') as string, 'README.md'))
        );

        //Copy the release notes from the build directory to the docs directory
        log.info('Copying releaseNotes.md...');
        fs.createReadStream(path.join(getEnv('SDK_REPO') as string, 'releaseNotes.md')).pipe(
            fs.createWriteStream(path.join(getEnv('SDK_REPO') as string, 'build/docs/releaseNotes.md'))
        );

        log.debug('Starting documentation zip operation');
        log.info('Zipping docs...');
        await zipDir(path.join(outputDir, 'docs'), path.join(getEnv('SDK_TEMP') as string, 'docs.zip'));

        log.debug('Documentation zipped successfully, executing post-run scripts');
        executeScripts(builder, builder.config.stageSettings.build.postRunScripts, 'custom build post-run');

        log.debug('Build implementation completed successfully');
        return;
    } catch (err: unknown) {
        if (err instanceof Error) {
            log.error(`Build implementation failed: ${err.message}`);
            log.debug(`Stack trace: ${err.stack}`);
        } else {
            log.error(`Build implementation failed: ${err}`);
        }
        throw err;
    }
}

