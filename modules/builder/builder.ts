import _ from 'lodash';
import childProcess from 'child_process';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import fs from 'fs-extra';
import https from 'https';
import path from 'path';
import pluralize from 'pluralize';
import yaml from 'js-yaml';
import { Config, Script, PureCloud, LocalConfig, valueOverides } from '../types/config.js';
import { Resourcepaths, Version, ApiVersionData, Data } from '../types/builderTypes.js';
import { Swagger, OpenApiSpec } from '../types/swagger.js';
import SpecificationDiff from '../swagger/specificationDiff.js';
import { GitModule, GithubConfig } from '../git/gitModule.js';
import { zipDir } from '../util/zip.js';
import { log } from '../log/logger.js';
import { maybeInit, checkAndThrow, getEnv, setEnv, resolveEnvVars, measureDurationFrom, getFileCount } from '../util/utils.js';
import { swaggerPreprocessing } from '../swagger/swaggerUtils.js';
import { openapiPreprocessing } from '../swagger/openapiUtils.js';


const specificationDiff = new SpecificationDiff();
const git = new GitModule();
let newSwaggerTempFile = '';

// Alternative to github-api-promise until update

let githubConfig: GithubConfig = {
	owner: "github_username",
	repo: "repo_name",
	host: "https://api.github.com",
	debug: false,
};

export class Builder {
	// Properties
	config: Config = {} as Config;
	resourcePaths: Resourcepaths = {} as Resourcepaths;
	path: string = '';
	version: Version = {} as Version;
	isNewVersion: boolean = false;
	releaseNotes: string = '';
	apiVersionData: ApiVersionData = {} as ApiVersionData;
	releaseNoteSummary: string = '';
	localConfig: LocalConfig = {} as LocalConfig;
	pureCloud: PureCloud = {} as PureCloud;
	releaseNoteTemplatePath: string = '';
	releaseNoteSummaryTemplatePath: string = '';

	async init(configPath: string, localConfigPath: string): Promise<void> {
		try {
			log.info(`Builder initialization started - Config: ${configPath}, LocalConfig: ${localConfigPath}`);
			this.constructBuilder(configPath, localConfigPath);

			log.debug('Builder construction completed, starting deref');
			await this.deref();

			log.debug('Deref completed, starting post-construction');
			this.postConstructBuilder();

			log.info('Builder construct completed successfully');
			log.debug(`Final Builder Config (${this.config.name ?? ''}) - settings: ${JSON.stringify(this.config.settings ?? {}, null, 4)}`);
			log.debug(`Final Builder Config (${this.config.name ?? ''}) - stageSettings: ${JSON.stringify(this.config.stageSettings ?? {}, null, 4)}`);
			return;
		} catch (err: unknown) {
			if (err instanceof Error) {
				log.error(`Builder initialization failed: ${err.message}`);
				log.debug(`Stack trace: ${err.stack}`);
			} else {
				log.error(`Builder initialization failed: ${err}`);
			}
			throw err;
		}
	}

	constructBuilder(configPath: string, localConfigPath: string): void {
		try {
			log.debug('Starting builder construction');
			log.writeBox('Constructing Builder');

			// Load config files
			log.debug(`Checking config file existence: ${configPath}`);
			if (configPath && fs.existsSync(configPath)) {
				log.debug('Loading main config file');
				this.config = loadConfig(configPath);
				log.debug('Main config loaded successfully');
			}
			else {
				log.error(`Config file not found: ${configPath}`);
				throw new Error(`Config file doesn't exist! Path: ${configPath}`);
			}

			log.debug(`Checking local config file existence: ${localConfigPath}`);
			if (localConfigPath && fs.existsSync(localConfigPath)) {
				log.debug('Loading local config file');
				this.localConfig = loadConfig(localConfigPath);
				log.debug('Local config loaded successfully');
			} else {
				log.debug('Local config file not found, using empty config');
				this.localConfig = {} as LocalConfig;
				log.warn(`No local config provided. Path: ${localConfigPath}`);
			}

			// Apply overrides
			log.debug('Applying configuration overrides');
			log.info('Applying overrides...');
			applyOverrides(this.config, this.localConfig.overrides);

			log.debug('Configuration overrides applied successfully');
			return;
		}
		catch (err: unknown) {
			log.error(`Builder construction failed: ${err}`);
			throw err;
		}
	}

	postConstructBuilder(): void {
		try {
			log.debug('Starting post-construction builder setup');

			// https://github.com/winstonjs/winston#logging-levels
			// silly > debug > verbose > info > warn > error
			if (this.config.settings.logLevel) {
				log.debug(`Setting log level: ${this.config.settings.logLevel}`);
				log.setLogLevel(this.config.settings.logLevel);
			}

			// Checketh thyself before thou wrecketh thyself
			if (!this.config) this.config = {} as Config;
			if (!this.localConfig) this.localConfig = {} as LocalConfig;
			maybeInit(this.config, 'settings', {}, "1 settings");
			maybeInit(this.config.settings, 'swagger', {}, "settings");
			maybeInit(this.config.settings, 'sdkRepo', { repo: undefined, branch: undefined }, "sdkReposettings");
			maybeInit(this.config.settings, 'swaggerCodegen', {}, "swaggerCodegensettings");
			maybeInit(this.config.settings.swaggerCodegen, 'generateApiTests', false, "stageSettings");
			maybeInit(this.config.settings.swaggerCodegen, 'generateModelTests', false, "generateModelTests");
			maybeInit(this.config.settings, 'resourcePaths', {}, "generateModelTests");
			maybeInit(this.config, 'stageSettings', {}, "1stageSettings");
			maybeInit(this.config.stageSettings, 'prebuild', {}, "1stageSettings");
			maybeInit(this.config.stageSettings, 'build', {}, "1build");
			maybeInit(this.config.stageSettings, 'postbuild', {}, "1postbuild");
			maybeInit(this.config.settings.sdkRepo, 'tagFormat', '{version}', "1tagFormat");
			maybeInit(this.config.settings.swaggerCodegen, 'sdkPathLanguage', '', "1sdkPathLanguage");
			maybeInit(this.config.settings.swaggerCodegen, 'isOpenApiCustomGenerator', false, "1customGenerator");

			// Check for required settings
			checkAndThrow(this.config.settings.swagger, 'oldSwaggerPath', "1oldSwaggerPath");
			checkAndThrow(this.config.settings.swagger, 'newSwaggerPath', "1newSwaggerPath");
			checkAndThrow(this.config.settings, 'swaggerCodegen', "1sss");
			checkAndThrow(this.config.settings.swaggerCodegen, 'codegenLanguage', "1codegenLanguage");
			checkAndThrow(this.config.settings.swaggerCodegen, 'resourceLanguage', "1resourceLanguage");
			checkAndThrow(this.config.settings.swaggerCodegen, 'configFile', "1configFile");

			// Normalize sdkRepo
			if (typeof this.config.settings.sdkRepo === 'string') {
				this.config.settings.sdkRepo = {
					repo: this.config.settings.sdkRepo,
					branch: '',
					tagFormat: ''
				};
			}

			// Set env vars
			log.debug('Setting up environment variables');
			const commonRoot = path.resolve('./');
			let sdkRepo: string, sdkTemp: string;
			if (!this.config.settings.swaggerCodegen.sdkPathLanguage) {
				// No swaggerCodegen.sdkPathLanguage - use swaggerCodegen.codegenLanguage
				sdkRepo = path.resolve(path.join('./output', this.config.settings.swaggerCodegen.codegenLanguage));
				sdkTemp = path.resolve(path.join('./temp', this.config.settings.swaggerCodegen.codegenLanguage));
			} else {
				sdkRepo = path.resolve(path.join('./output', this.config.settings.swaggerCodegen.sdkPathLanguage));
				sdkTemp = path.resolve(path.join('./temp', this.config.settings.swaggerCodegen.sdkPathLanguage));
			}

			log.debug(`Environment paths - CommonRoot: ${commonRoot}, SdkRepo: ${sdkRepo}, SdkTemp: ${sdkTemp}`);
			setEnv('COMMON_ROOT', commonRoot);
			setEnv('SDK_REPO', sdkRepo);
			log.debug('Removing existing SDK_REPO directory');
			fs.removeSync(getEnv('SDK_REPO') as string);
			setEnv('SDK_TEMP', sdkTemp);
			log.debug('Emptying SDK_TEMP directory');
			fs.emptyDirSync(getEnv('SDK_TEMP') as string);

			// Load env vars from config
			_.forOwn(this.config.envVars, (value, key) => setEnv(key, value));
			_.forOwn(this.localConfig.envVars, (group, groupKey) => {
				if (group) _.forOwn(group, (value, key) => setEnv(key, value));
			});

			// Resolve env vars in config
			resolveEnvVars(this.config);
			resolveEnvVars(this.localConfig);
			if (this.config.settings.debugConfig === true) {
				log.debug('Local config file: \n' + JSON.stringify(this.localConfig, null, 2));
				log.debug('Config file: \n' + JSON.stringify(this.config, null, 2));
			}

			// Initialize instance settings
			log.setUseColor(this.config.settings.enableLoggerColor === true);
			let resourceRoot = `./resources/sdk/${this.config.settings.swaggerCodegen.resourceLanguage}/`;
			this.resourcePaths = {
				extensions: path.resolve(
					this.config.settings.resourcePaths.extensions
						? this.config.settings.resourcePaths.extensions
						: path.join(resourceRoot, 'extensions')
				),
				samples: path.resolve(
					this.config.settings.resourcePaths.samples
						? this.config.settings.resourcePaths.samples
						: path.join(resourceRoot, 'samples')
				),
				scripts: path.resolve(
					this.config.settings.resourcePaths.scripts ? this.config.settings.resourcePaths.scripts : path.join(resourceRoot, 'scripts')
				),
				templates: path.resolve(
					this.config.settings.resourcePaths.templates ? this.config.settings.resourcePaths.templates : path.join(resourceRoot, 'templates')
				),
			};
			newSwaggerTempFile = path.join(getEnv('SDK_TEMP') as string, 'newSwagger.json');
			this.pureCloud = {
				clientId: getEnv('PURECLOUD_CLIENT_ID') as string,
				clientSecret: getEnv('PURECLOUD_CLIENT_SECRET') as string,
				environment: getEnv('PURECLOUD_ENVIRONMENT', 'mypurecloud.com', true) as string,
			};
			this.releaseNoteTemplatePath = this.config.settings.releaseNoteTemplatePath
				? this.config.settings.releaseNoteTemplatePath
				: './resources/templates/releaseNoteDetail.md';
			this.releaseNoteSummaryTemplatePath = this.config.settings.releaseNoteSummaryTemplatePath
				? this.config.settings.releaseNoteSummaryTemplatePath
				: './resources/templates/releaseNoteSummary.md';

			// Initialize other things
			log.debug('Setting up Git authentication');
			git.authToken = getEnv('GITHUB_TOKEN') as string;
			log.debug('Post-construction setup completed successfully');
			return;
		}
		catch (err: unknown) {
			log.error(`Post-construction setup failed: ${err}`);
			throw err;
		}
	}

	async deref(): Promise<void> {
		log.debug('Starting schema dereferencing');
		await $RefParser.dereference(this.config, (err, schema) => {
			if (err) {
				log.error(`Main config dereferencing failed: ${err}`);
				throw err;
			}
			else {
				log.debug('Main config dereferencing completed');
				this.config = schema as typeof this.config;
			}
		});

		await $RefParser.dereference(this.localConfig, (err, schema) => {
			if (err) {
				log.error(`Local config dereferencing failed: ${err}`);
				throw err;
			}
			else {
				log.debug('Local config dereferencing completed');
				this.localConfig = schema as typeof this.localConfig;
			}
		});

		return;
	}

	async fullBuild(): Promise<void> {
		try {
			log.info('Full build process initiated');
			let fullBuildStartTime = Date.now();
			await this.prebuild();

			log.debug('Prebuild completed, starting build phase');
			await this.build();

			log.debug('Build completed, starting postbuild phase');
			await this.postbuild();

			log.debug('Full build process completed successfully');
			log.info(`Full build complete at ${new Date(Date.now()).toUTCString()} in ${measureDurationFrom(fullBuildStartTime)}`);
			return;

		} catch (err: unknown) {
			if (err instanceof Error) {
				log.error(`Full build process failed: ${err.message}`);
				log.debug(`Stack trace: ${err.stack}`);
			} else {
				log.error(`Full build process failed: ${String(err)}`);
			}
			throw err;
		}
	}

	async prebuild(): Promise<void> {
		try {
			log.debug('Prebuild stage initiated');
			log.writeBox('STAGE: pre-build');
			let prebuildStartTime = Date.now();
			await prebuildImpl(this);

			log.debug('Prebuild implementation completed');
			log.info(`Pre-build complete at ${new Date(Date.now()).toUTCString()} in ${measureDurationFrom(prebuildStartTime)}`);
			return;

		} catch (err: unknown) {
			if (err instanceof Error) {
				log.error(`Prebuild stage failed: ${err.message}`);
				log.debug(`Stack trace: ${err.stack}`);
			} else {
				log.error(`Prebuild stage failed: ${String(err)}`);
			}
			throw err;
		}
	}

	async build(): Promise<void> {
		try {
			log.debug('Build stage initiated');
			log.writeBox('STAGE: build');
			let buildStartTime = Date.now();
			await buildImpl(this);

			log.debug('Build implementation completed');
			log.info(`Build complete at ${new Date(Date.now()).toUTCString()} in ${measureDurationFrom(buildStartTime)}`);
			return;

		} catch (err: unknown) {
			if (err instanceof Error) {
				log.error(`Build stage failed: ${err.message}`);
				log.debug(`Stack trace: ${err.stack}`);
			} else {
				log.error(`Build stage failed: ${String(err)}`);
			}
			throw err;
		}
	}

	async postbuild(): Promise<void> {
		try {
			log.debug('Postbuild stage initiated');
			log.writeBox('STAGE: post-build');
			let postbuildStartTime = Date.now();
			await postbuildImpl(this);

			log.debug('Postbuild implementation completed');
			log.info(`Post-build complete at ${new Date(Date.now()).toUTCString()} in ${measureDurationFrom(postbuildStartTime)}`);
			return;

		} catch (err: unknown) {
			if (err instanceof Error) {
				log.error(`Postbuild stage failed: ${err.message}`);
				log.debug(`Stack trace: ${err.stack}`);
			} else {
				log.error(`Postbuild stage failed: ${String(err)}`);
			}
			throw err;
		}
	}
}

async function prebuildImpl(builder: Builder): Promise<void> {
	try {
		log.debug('Starting prebuild implementation');
		// Pre-run scripts
		log.debug('Executing prebuild pre-run scripts');
		executeScripts(builder, builder.config.stageSettings.prebuild.preRunScripts, 'custom prebuild pre-run');

		// Clone repo
		let startTime = Date.now();
		log.debug(`Starting repository clone operation - Repo: ${builder.config.settings.sdkRepo.repo}, Branch: ${builder.config.settings.sdkRepo.branch}, Target: ${getEnv('SDK_REPO')}`);
		log.info(`Cloning ${builder.config.settings.sdkRepo.repo} (${builder.config.settings.sdkRepo.branch}) to ${getEnv('SDK_REPO')}`);

		await git.clone(builder.config.settings.sdkRepo.repo, builder.config.settings.sdkRepo.branch, getEnv('SDK_REPO') as string);

		log.debug('Repository clone completed successfully');
		log.debug(`Clone operation completed in ${measureDurationFrom(startTime)}`);

		// Diff swagger
		log.debug('Starting swagger diff operation');
		log.info('Diffing swagger files...');
		specificationDiff.useSdkVersioning = true;
		// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
		if (builder.config.settings.swaggerCodegen.codegenLanguage == "webmessagingjava") {
			log.debug('Enabling OpenAPI v3 to Swagger v2 downgrade for webmessagingjava');
			specificationDiff.downgradeToSwaggerV2 = true;
		}
		log.debug(`Swagger diff paths - Old: ${builder.config.settings.swagger.oldSwaggerPath}, New: ${builder.config.settings.swagger.newSwaggerPath}, Preview: ${builder.config.settings.swagger.previewSwaggerPath}`);
		specificationDiff.getAndDiff(
			builder.config.settings.swagger.oldSwaggerPath,
			builder.config.settings.swagger.newSwaggerPath,
			builder.config.settings.swagger.previewSwaggerPath,
			builder.config.settings.swagger.saveOldSwaggerPath,
			builder.config.settings.swagger.saveNewSwaggerPath
		);
		log.debug('Swagger diff completed');

		// For Jenkins only. 
		log.debug('Checking for upstream changes validation');
		if (newSwaggerTempFile.includes('build-platform-sdks-internal-pipeline') && process.argv.includes("build-contains-upstream-changes")) {
			log.debug(`Validating upstream changes - Change count: ${specificationDiff.changeCount}`);
			if (specificationDiff.changeCount == 0) {
				log.debug('No swagger changes detected but upstream changes expected');
				throw new Error('The build contains upstream changes, but the Swagger definition has not changed.');
			}
		}

		// Swagger Preprocessing
		log.debug('Preprocessing Swagger');
		if (specificationDiff.isSwagger === true) {
			await swaggerPreprocessing(builder, specificationDiff.newSpecification as Swagger);
		} else {
			await openapiPreprocessing(builder, specificationDiff.newSpecification as OpenApiSpec);
		}

		// Save new swagger to temp file for build
		log.debug(`Writing processed swagger to temp file: ${newSwaggerTempFile}`);
		log.info(`Writing new swagger file to temp storage path: ${newSwaggerTempFile}`);
		fs.writeFileSync(newSwaggerTempFile, JSON.stringify(specificationDiff.newSpecification));
		log.debug('Swagger file written successfully');

		// Compute ApiVersionData/BuilderVersion
		let apiVersionData: ApiVersionData = await computeVersion(builder);;

		// Sanitize and store API version data
		let apiVersionDataClean = {} as ApiVersionData;
		_.forIn(apiVersionData, function (value, key) {
			apiVersionDataClean[key.replace(/\W+/g, '')] = value;
		});
		builder.apiVersionData = apiVersionDataClean;
		log.debug(`API version data: ${JSON.stringify(apiVersionDataClean, null, 2)}`);
		// Get extra release note data
		const data: Data = {
			extraNotes: getEnv('RELEASE_NOTES') as string,
			hasExtraNotes: false,
			apiVersionData: builder.apiVersionData,
		};
		data.hasExtraNotes = data.extraNotes !== undefined;
		// Get release notes
		log.info('Generating release notes...');
		builder.releaseNotes = specificationDiff.generateReleaseNotes(builder.releaseNoteTemplatePath, data);
		builder.releaseNoteSummary = specificationDiff.generateReleaseNotes(builder.releaseNoteSummaryTemplatePath, data);
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

async function buildImpl(builder: Builder): Promise<void> {
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
		command += `-i ${newSwaggerTempFile} `;
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

async function postbuildImpl(builder: Builder): Promise<void> {
	try {
		log.debug('Starting postbuild implementation');
		// Pre-run scripts
		log.debug('Executing postbuild pre-run scripts');
		executeScripts(builder, builder.config.stageSettings.postbuild.preRunScripts, 'custom postbuild pre-run');

		log.debug('Creating release');
		await createRelease(builder);

		log.debug('Release created, executing postbuild post-run scripts');
		executeScripts(builder, builder.config.stageSettings.postbuild.postRunScripts, 'custom postbuild post-run');

		log.debug('Postbuild implementation completed successfully');
		return;
	} catch (err: unknown) {
		if (err instanceof Error) {
			log.error(`Postbuild implementation failed: ${err.message}`);
			log.debug(`Stack trace: ${err.stack}`);
		} else {
			log.error(`Postbuild implementation failed: ${err}`);
		}
		throw err;
	}
}

/* PRIVATE FUNCTIONS */

function applyOverrides(original: Config, overrides: valueOverides) {
	if (!original || !overrides) return;

	_.forOwn(overrides, function (value: valueOverides, key) {
		if (Array.isArray(value)) {
			log.verbose(`Overriding array ${key}. Length old/new => ${original[key].length}/${value.length}`);
			original[key] = value;
		} else if (typeof value == 'object') {
			// Initialize original to ensure the full path to the override values
			if (!original[key]) original[key] = {};
			applyOverrides(original[key], value);
		} else {
			log.verbose(`Overriding ${key}. Values old/new => ${original[key]}/${value}`);
			original[key] = value;
		}
	});
}

async function createRelease(builder: Builder): Promise<void> {
	try {
		if (!builder.config.settings.sdkRepo.repo || builder.config.settings.sdkRepo.repo === '') {
			log.warn('Skipping github release creation! Repo is undefined.');
			return;
		}
		if (builder.config.stageSettings.postbuild.gitCommit !== true) {
			log.warn('Skipping git commit and github release creation! Set postbuild.gitCommit=true to commit changes.');
			return;
		}

		if (builder.isNewVersion !== true) {
			log.warn('Skipping github release creation! Build did not produce a new version.');
			return;
		}

		await git.saveChanges(builder.config.settings.sdkRepo.repo, getEnv('SDK_REPO') as string, builder.version.displayFull ?? '');
	
		if (builder.config.stageSettings.postbuild.publishRelease !== true) {
			log.warn('Skipping github release creation! Set postbuild.publishRelease=true to release.');
			return;
		}

		// Expected format: https://github.com/grouporuser/reponame
		let repoParts = builder.config.settings.sdkRepo.repo.split('/');
		let repoName = repoParts[repoParts.length - 1];
		let repoOwner = repoParts[repoParts.length - 2];
		if (repoName.endsWith('.git')) repoName = repoName.substring(0, repoName.length - 4);
		log.log.debug(`repoName: ${repoName}`);
		log.log.debug(`repoOwner: ${repoOwner}`);

		githubConfig.repo = repoName;
		githubConfig.owner = repoOwner;

		const tagName = (builder.config.settings.sdkRepo.tagFormat ?? '').replace('{version}', builder.version.displayFull ?? '');
		let createReleaseOptions = {
			tag_name: tagName,
			target_commitish: builder.config.settings.sdkRepo.branch ? builder.config.settings.sdkRepo.branch : 'master',
			name: tagName,
			body: `Release notes for version ${tagName}\n${builder.releaseNoteSummary}`,
			draft: false,
			prerelease: false,
		};

		console.log(createReleaseOptions);
		// Create release
		let release = await git.githubCreateRelease(githubConfig, createReleaseOptions);
		log.info(`Created release #${release}`);
		return;
	} catch (err: unknown) {
		throw err;
	}
}

function loadConfig(configPath: string) {
	configPath = path.resolve(configPath);
	let extension = path.parse(configPath).ext.toLowerCase();
	if (extension == '.yml' || extension == '.yaml') {
		log.info(`Loading YAML config from ${configPath}`);
		const fileContents = fs.readFileSync(configPath, 'utf8');
		return yaml.load(fileContents);
		//return yaml.load(path.resolve(configPath));
	} else {
		log.info(`Loading JSON config from ${configPath}`);
		const fileContents = fs.readFileSync(configPath, 'utf8');
		return JSON.parse(fileContents);
	}
}

function executeScripts(builder: Builder, scripts: Script[], phase: string) {
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
		let oldVersion = specificationDiff.stringifyVersion(builder.version, true);
		log.debug(`Previous version: ${oldVersion}`);
		specificationDiff.incrementVersion(builder.version);
		let newVersion = specificationDiff.stringifyVersion(builder.version, true);

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
		let resString = '';
		log.info(`Getting API version from ${builder.config.settings.apiHealthCheckUrl}`);
		https.get(builder.config.settings.apiHealthCheckUrl, function (res) {
			res.on('data', function (chunk) {
				resString += chunk;
			});
			res.on('end', function () {
				resolve(JSON.parse(resString));
			});
			res.on('error', function (err) {
				reject(err);
			});
		});
	});

}
