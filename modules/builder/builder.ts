import _ from 'lodash';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { Config, PureCloud, LocalConfig, valueOverides } from '../types/config.js';
import { Resourcepaths, Version, ApiVersionData } from '../types/builderTypes.js';
import { GCApiSpecification } from '../specification/gcApiSpecification.js';
import { GitModule, GithubConfig } from '../git/gitModule.js';
import { log } from '../log/logger.js';
import { maybeInit, checkAndThrow, getEnv, setEnv, resolveEnvVars, measureDurationFrom } from '../util/utils.js'
import { prebuildImpl } from './impl/prebuildImpl.js';
import { buildImpl } from './impl/buildImpl.js';
import { postbuildImpl } from './impl/postbuildImpl.js';


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
	// Specific
	gcApiSpecification: GCApiSpecification = new GCApiSpecification();
	git: GitModule = new GitModule();
	newSwaggerTempFile: string = '';
	// Alternative to github-api-promise until update
	githubConfig: GithubConfig = {
		owner: "github_username",
		repo: "repo_name",
		host: "https://api.github.com",
		debug: false,
	};


	public async init(configPath: string, localConfigPath: string): Promise<void> {
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

	private constructBuilder(configPath: string, localConfigPath: string): void {
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

	private postConstructBuilder(): void {
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
			this.newSwaggerTempFile = path.join(getEnv('SDK_TEMP') as string, 'newSwagger.json');
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
			this.git.authToken = getEnv('GITHUB_TOKEN') as string;
			log.debug('Post-construction setup completed successfully');
			return;
		}
		catch (err: unknown) {
			log.error(`Post-construction setup failed: ${err}`);
			throw err;
		}
	}

	private async deref(): Promise<void> {
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

	public async fullBuild(): Promise<void> {
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

	private async prebuild(): Promise<void> {
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

	private async build(): Promise<void> {
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

	private async postbuild(): Promise<void> {
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
