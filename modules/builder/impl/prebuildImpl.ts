import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { ApiVersionData, Data } from '../../types/builderTypes.js';
import { log } from '../../log/logger.js';
import { getEnv, setEnv, measureDurationFrom } from '../../util/utils.js';
import { Builder } from '../builder.js';
import { executeScripts } from './utils.js';
import { gcGetApiVersionData } from '../../util/http.js';


export async function prebuildImpl(builder: Builder): Promise<void> {
    try {
        log.debug('Starting prebuild implementation');
        // Pre-run scripts
        log.debug('Executing prebuild pre-run scripts');
        executeScripts(builder, builder.config.stageSettings.prebuild.preRunScripts, 'custom prebuild pre-run');

        // Clone repo
        let startTime = Date.now();
        log.debug(`Starting repository clone operation - Repo: ${builder.config.settings.sdkRepo.repo}, Branch: ${builder.config.settings.sdkRepo.branch}, Target: ${getEnv('SDK_REPO')}`);
        log.info(`Cloning ${builder.config.settings.sdkRepo.repo} (${builder.config.settings.sdkRepo.branch}) to ${getEnv('SDK_REPO')}`);

        await builder.git.clone(builder.config.settings.sdkRepo.repo, builder.config.settings.sdkRepo.branch, getEnv('SDK_REPO') as string);

        log.debug('Repository clone completed successfully');
        log.debug(`Clone operation completed in ${measureDurationFrom(startTime)}`);

        // Diff swagger
        log.debug('Starting swagger diff operation');
        log.info('Diffing swagger files...');
        builder.gcApiSpecification.useSdkVersioning = true;
        // Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
        if (builder.config.settings.swaggerCodegen.codegenLanguage == "webmessagingjava") {
            log.debug('Enabling OpenAPI v3 to Swagger v2 downgrade for webmessagingjava');
            builder.gcApiSpecification.downgradeToSwaggerV2 = true;
        }
        log.debug(`Swagger preprocessing - Old: ${builder.config.settings.swagger.oldSwaggerPath}, New: ${builder.config.settings.swagger.newSwaggerPath}, Preview: ${builder.config.settings.swagger.previewSwaggerPath}`);
        builder.gcApiSpecification.getAndPreprocess(
            builder.config,
            builder.config.settings.swagger.oldSwaggerPath,
            builder.config.settings.swagger.newSwaggerPath,
            builder.config.settings.swagger.previewSwaggerPath,
            builder.config.settings.swagger.saveOldSwaggerPath,
            builder.config.settings.swagger.saveNewSwaggerPath,
            builder.config.settings.specificationPreprocessing ?? null
        );
        log.debug('Swagger preprocessing completed');

        log.debug(`Swagger diff paths - Old: ${builder.config.settings.swagger.oldSwaggerPath}, New: ${builder.config.settings.swagger.newSwaggerPath}, Preview: ${builder.config.settings.swagger.previewSwaggerPath}`);
        builder.gcApiSpecification.diff();
        log.debug('Swagger diff completed');

        // Compute ApiVersionData/BuilderVersion
        let apiVersionData: ApiVersionData = await computeVersion(builder);
        // Sanitize and store API version data
        let apiVersionDataClean = {} as ApiVersionData;
        _.forIn(apiVersionData, function (value, key) {
            apiVersionDataClean[key.replace(/\W+/g, '')] = value;
        })
        // Store Api Version
        if (builder.gcApiSpecification.diffImpl) builder.gcApiSpecification.diffImpl.newApiVersion = builder.apiVersionData.BuildVersion;
        builder.gcApiSpecification.newSpecification.info.apiVersion = builder.apiVersionData.BuildVersion;
        builder.apiVersionData = apiVersionDataClean;
        log.debug(`API version data: ${JSON.stringify(apiVersionDataClean, null, 2)}`);
        
        // For Jenkins only. 
        log.debug('Checking for upstream changes validation');
        if (builder.newSwaggerTempFile.includes('build-platform-sdks-internal-pipeline') && process.argv.includes("build-contains-upstream-changes")) {
            log.debug(`Validating upstream changes - Change count: ${builder.gcApiSpecification.changeCount}`);
            if (builder.gcApiSpecification.changeCount == 0) {
                log.debug('No swagger changes detected but upstream changes expected');
                throw new Error('The build contains upstream changes, but the Swagger definition has not changed.');
            }
        }

        // Notifications Preprocessing
        log.debug('Adding Notification Topics');
        await builder.gcApiSpecification.addNotificationTopics(
            builder.pureCloud,
            builder.config.settings.specificationPreprocessing ?? null
        );
        log.debug('Notification Topics added');

        // Legacy Swagger Refs Processing
        builder.gcApiSpecification.legacySwaggerRefsProcessing(
            builder.config.settings.specificationPreprocessing ?? null
        );

        // Save new swagger to temp file for build
        log.debug(`Writing processed swagger to temp file: ${builder.newSwaggerTempFile}`);
        log.info(`Writing new swagger file to temp storage path: ${builder.newSwaggerTempFile}`);
        fs.writeFileSync(builder.newSwaggerTempFile, JSON.stringify(builder.gcApiSpecification.newSpecification));
        log.debug('Swagger file written successfully');

        // Get extra release note data
        const data: Data = {
            extraNotes: getEnv('RELEASE_NOTES') as string,
            hasExtraNotes: false,
            apiVersionData: builder.apiVersionData,
        };
        data.hasExtraNotes = data.extraNotes !== undefined;
        // Get release notes
        log.info('Generating release notes...');
        builder.releaseNotes = builder.gcApiSpecification.generateReleaseNotes(builder.releaseNoteTemplatePath, data);
        builder.releaseNoteSummary = builder.gcApiSpecification.generateReleaseNotes(builder.releaseNoteSummaryTemplatePath, data);
        let releaseNotePath = path.join(getEnv('SDK_REPO') as string, 'releaseNotes.md');
        log.info(`Writing release notes to ${releaseNotePath}`);
        fs.writeFileSync(releaseNotePath, builder.releaseNotes);

        log.debug('Executing prebuild post-run scripts');
        executeScripts(builder, builder.config.stageSettings.prebuild.postRunScripts, 'custom prebuild post-run');

        log.debug('Prebuild implementation completed successfully');
        return;
    } catch (err: unknown) {
        if (err instanceof Error) {
            log.error(`Prebuild implementation failed: ${err.message}`);
            log.debug(`Stack trace: ${err.stack}`);
        } else {
            log.error(`Prebuild implementation failed: ${err}`);
        }
        throw err;
    }
}

async function computeVersion(builder: Builder): Promise<ApiVersionData> {
    return new Promise<ApiVersionData>((resolve, reject) => {
        builder.version = {
            major: 0,
            minor: 0,
            point: 0,
            prerelease: 'UNKNOWN',
            apiVersion: 0,
        };

        if (builder.config.settings.versionFile) {
            if (fs.existsSync(builder.config.settings.versionFile)) {
                builder.version = JSON.parse(fs.readFileSync(builder.config.settings.versionFile, 'utf8'));
            } else {
                log.warn(`Version file not found: ${builder.config.settings.versionFile}`);
            }
        } else {
            log.warn('Version file not specified! Defaulting to 0.0.0-UNKNOWN');
        }

        // Increment version in config
        let oldVersion = builder.gcApiSpecification.stringifyVersion(builder.version, true);
        log.debug(`Previous version: ${oldVersion}`);
        builder.gcApiSpecification.incrementVersion(builder.version);
        let newVersion = builder.gcApiSpecification.stringifyVersion(builder.version, true);

        // Determine if new version
        builder.isNewVersion = getEnv('BRANCH_NAME') !== 'master' ? false : oldVersion !== newVersion;
        setEnv('SDK_NEW_VERSION', builder.isNewVersion);
        if (builder.isNewVersion === true) log.info(`New version: ${builder.version.displayFull}`);
        else log.warn('Version was not incremented');

        // Write new version to file
        if (builder.isNewVersion === true && builder.config.settings.versionFile) {
            fs.writeFileSync(builder.config.settings.versionFile, JSON.stringify(builder.version, null, 2));
        }

        // Get API version from health check endpoint
        log.info(`Getting API version from ${builder.config.settings.apiHealthCheckUrl}`);
        gcGetApiVersionData(builder.config.settings.apiHealthCheckUrl)
            .then((apiVersionData) => {
                resolve(apiVersionData);
            })
            .catch((err: unknown) => {
                reject(err)
            });
    });

}

