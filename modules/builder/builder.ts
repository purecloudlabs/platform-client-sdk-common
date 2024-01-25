import _ from 'lodash';
import childProcess from 'child_process';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import fs from 'fs-extra';
import githubApi from "github-api-promise";
import https from 'https';
import path from 'path';
import pluralize from 'pluralize';
import { Config, Script, Haystack, PureCloud } from '../types/config'
import { LocalConfig, Overrides, Settings, StageSettings, valueOverides } from '../types/localConfig'
import moment, { Moment } from 'moment-timezone';
import { Resourcepaths, Version, ApiVersionData, Data, Release } from '../types/builderTypes'
import { ItemsType, Format } from '../types/swagger'
import platformClient from 'purecloud-platform-client-v2';
import yaml from 'js-yaml';
import Logger from '../log/logger';
import SwaggerDiff from '../swagger/swaggerDiff';
import GitModule from '../git/gitModule';
import Zip from '../util/zip';
import { Models } from 'purecloud-platform-client-v2';


const log = new Logger();
const swaggerDiff = new SwaggerDiff();
const git = new GitModule();
const zip = new Zip();
const TIMESTAMP_FORMAT = 'h:mm:ss a';
const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;
let _this: Builder;
let newSwaggerTempFile = '';

export class Builder {

	config: Config;
	resourcePaths: Resourcepaths;
	path: string = '';
	version: Version;
	isNewVersion: boolean = false;
	releaseNotes: string = '';
	apiVersionData: ApiVersionData;
	releaseNoteSummary: string = '';
	localConfig: LocalConfig;
	pureCloud: PureCloud;
	releaseNoteTemplatePath: string = '';
	releaseNoteSummaryTemplatePath: string = '';

	init(configPath: string, localConfigPath: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			this.constructBuilder(configPath, localConfigPath)
				.then(() => this.deref()
					.then(() => this.postConstructBuilder()
						.then(() => console.log("Builder construct Completed")))
					.then(() => resolve(""))
					.catch((err: Error) => reject(err)));

		});
	}

	constructBuilder(configPath: string, localConfigPath: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			try {
				log.writeBox('Constructing Builder');

				// Load config files
				if (fs.existsSync(configPath)) {
					this.config = loadConfig(configPath);
				}
				else throw new Error(`Config file doesn't exist! Path: ${configPath}`);

				if (fs.existsSync(localConfigPath)) this.localConfig = loadConfig(localConfigPath);
				else {
					this.localConfig = {} as LocalConfig;
					log.warn(`No local config provided. Path: ${localConfigPath}`);
				}

				// Apply overrides
				log.info('Applying overrides...');
				applyOverrides(this.config, this.localConfig.overrides);
				resolve("");
			}
			catch (err) {
				console.log(err);
				reject(err)
			}
		});
	}

	postConstructBuilder(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			try {
				_this = this;

				// https://github.com/winstonjs/winston#logging-levels
				// silly > debug > verbose > info > warn > error
				if (this.config.settings.logLevel) log.setLogLevel(this.config.settings.logLevel);

				// Checketh thyself before thou wrecketh thyself
				maybeInit(this, 'config', {}, "1 config");
				maybeInit(this, 'localConfig', {}, "1 localConfig");
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
				setEnv('COMMON_ROOT', path.resolve('./'));
				setEnv('SDK_REPO', path.resolve(path.join('./output', this.config.settings.swaggerCodegen.codegenLanguage)));
				fs.removeSync(getEnv('SDK_REPO') as string);
				setEnv('SDK_TEMP', path.resolve(path.join('./temp', this.config.settings.swaggerCodegen.codegenLanguage)));
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
				git.authToken = getEnv('GITHUB_TOKEN') as string;
				resolve("");
			}
			catch (err) {
				console.log(err);
				reject(err)
			}
		});
	}

	deref(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			$RefParser.dereference(this.config, (err, schema) => {
				if (err) {
					console.error(err);
					reject(err);
				}
				else {
					this.config = schema as typeof this.config;
				}
			})

			$RefParser.dereference(this.localConfig, (err, schema) => {
				if (err) {
					console.error(err);
					reject(err);
				}
				else {
					this.localConfig = schema as typeof this.localConfig;
					resolve("");
				}
			})
		});
	}

	fullBuild(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			log.info('Full build initiated!');
			let fullBuildStartTime = moment();
			this.prebuild()
				.then(() => this.build())
				.then(() => this.postbuild())
				.then(() => log.info(`Full build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(fullBuildStartTime)}`))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));
		});
	}

	prebuild(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			log.writeBox('STAGE: pre-build');
			let prebuildStartTime = moment();
			prebuildImpl()
				.then(() => log.info(`Pre-build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(prebuildStartTime)}`))
				.then(() => resolve(""))
				.catch((err) => reject(err));
		});
	}

	build(): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			log.writeBox('STAGE: build');
			let buildStartTime = moment();

			buildImpl()
				.then(() => log.info(`Build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(buildStartTime)}`))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));

		});
	}

	postbuild(): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			log.writeBox('STAGE: post-build');
			let postbuildStartTime = moment();

			postbuildImpl()
				.then(() => log.info(`Post-build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(postbuildStartTime)}`))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));

		});
	}
}

function prebuildImpl(): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		try {
			// Pre-run scripts
			executeScripts(_this.config.stageSettings.prebuild.preRunScripts, 'custom prebuild pre-run');

			// Clone repo
			let startTime = moment();
			log.info(`Cloning ${_this.config.settings.sdkRepo.repo} (${_this.config.settings.sdkRepo.branch}) to ${getEnv('SDK_REPO')}`);
			git
				.clone(_this.config.settings.sdkRepo.repo, _this.config.settings.sdkRepo.branch, getEnv('SDK_REPO') as string)
				.then(function () {
					log.debug(`Clone operation completed in ${measureDurationFrom(startTime)}`);
				})
				.then(function () {
					// Diff swagger
					log.info('Diffing swagger files...');
					swaggerDiff.useSdkVersioning = true;
					swaggerDiff.getAndDiff(
						_this.config.settings.swagger.oldSwaggerPath,
						_this.config.settings.swagger.newSwaggerPath,
						_this.config.settings.swagger.previewSwaggerPath,
						_this.config.settings.swagger.saveOldSwaggerPath,
						_this.config.settings.swagger.saveNewSwaggerPath
					);
				})
				.then(() => {
					// For Jenkins only. 
					if (newSwaggerTempFile.includes('build-platform-sdks-internal-pipeline') && process.argv.includes("build-contains-upstream-changes")) {
						if (swaggerDiff.changeCount == 0) {
							throw new Error('The build contains upstream changes, but the Swagger definition has not changed.');
						}
					}
				})
				.then(() => {
					return addNotifications();
				})
				.then(() => {
					return processPaths();
				})
				.then(() => {
					return processRefs();
				})
				.then(() => {
					return processAnyTypes();
				})
				.then(() => {
					// Save new swagger to temp file for build
					log.info(`Writing new swagger file to temp storage path: ${newSwaggerTempFile}`);
					fs.writeFileSync(newSwaggerTempFile, JSON.stringify(swaggerDiff.newSwagger));
				})
				.then(function (): Promise<string> {
					return new Promise<string>((resolve, reject) => {

						_this.version = {
							major: 0,
							minor: 0,
							point: 0,
							prerelease: 'UNKNOWN',
							apiVersion: 0,
						};

						if (_this.config.settings.versionFile) {
							if (fs.existsSync(_this.config.settings.versionFile)) {
								_this.version = JSON.parse(fs.readFileSync(_this.config.settings.versionFile, 'utf8'));
							} else {
								log.warn(`Version file not found: ${_this.config.settings.versionFile}`);
							}
						} else {
							log.warn('Version file not specified! Defaulting to 0.0.0-UNKNOWN');
						}

						// Increment version in config
						let oldVersion = swaggerDiff.stringifyVersion(_this.version, true);
						log.debug(`Previous version: ${oldVersion}`);
						swaggerDiff.incrementVersion(_this.version);
						let newVersion = swaggerDiff.stringifyVersion(_this.version, true);

						// Determine if new version
						//_this.isNewVersion = getEnv('BRANCH_NAME') !== 'master' ? false : oldVersion !== newVersion;
						//TODO - Change this back to the line above
						_this.isNewVersion = true;
						setEnv('SDK_NEW_VERSION', _this.isNewVersion);
						if (_this.isNewVersion === true) log.info(`New version: ${_this.version.displayFull}`);
						else log.warn('Version was not incremented');

						// Write new version to file
						if (_this.isNewVersion === true && _this.config.settings.versionFile) {
							fs.writeFileSync(_this.config.settings.versionFile, JSON.stringify(_this.version, null, 2));
						}

						// Get API version from health check endpoint
						let resString = '';
						log.info(`Getting API version from ${_this.config.settings.apiHealthCheckUrl}`);
						https.get(_this.config.settings.apiHealthCheckUrl, function (res) {
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

				})
				.then(function (apiVersionData: string) {
					// Sanitize and store API version data
					let apiVersionDataClean = {} as ApiVersionData;
					_.forIn(apiVersionData, function (value, key) {
						apiVersionDataClean[key.replace(/\W+/g, '')] = value;
					});
					_this.apiVersionData = apiVersionDataClean;
					log.debug(`API version data: ${JSON.stringify(apiVersionDataClean, null, 2)}`);


					// Get extra release note data


					const data: Data = {
						extraNotes: getEnv('RELEASE_NOTES') as string,
						hasExtraNotes: false,
						apiVersionData: _this.apiVersionData,
					};

					data.hasExtraNotes = data.extraNotes !== undefined;

					// Get release notes
					log.info('Generating release notes...');
					_this.releaseNotes = swaggerDiff.generateReleaseNotes(_this.releaseNoteTemplatePath, data);
					_this.releaseNoteSummary = swaggerDiff.generateReleaseNotes(_this.releaseNoteSummaryTemplatePath, data);

					let releaseNotePath = path.join(getEnv('SDK_REPO') as string, 'releaseNotes.md');
					log.info(`Writing release notes to ${releaseNotePath}`);
					fs.writeFileSync(releaseNotePath, _this.releaseNotes);
				})
				.then(() => executeScripts(_this.config.stageSettings.prebuild.postRunScripts, 'custom prebuild post-run'))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));
		} catch (err) {
			reject(err);
		}

		// return deferred.promise;
	});
}

function buildImpl(): Promise<string> {
	return new Promise<string>((resolve, reject) => {

		try {
			// Pre-run scripts
			executeScripts(_this.config.stageSettings.build.preRunScripts, 'custom build pre-run');

			let outputDir = path.join(getEnv('SDK_REPO') as string, 'build');
			log.debug(`SDK build dir -> ${outputDir}`);
			fs.emptyDirSync(outputDir);

			let command = '';
			// Java command and options
			command += 'java ';
			command += `-DapiTests=${_this.config.settings.swaggerCodegen.generateApiTests} `;
			command += `-DmodelTests=${_this.config.settings.swaggerCodegen.generateModelTests} `;
			command += `${getEnv('JAVA_OPTS', '')} -XX:MaxMetaspaceSize=256M -Xmx2g -DloggerPath=conf/log4j.properties `;
			// Swagger-codegen jar file
			command += `-jar ${_this.config.settings.swaggerCodegen.jarPath} `;
			// Swagger-codegen options
			command += 'generate ';
			command += `-i ${newSwaggerTempFile} `;
			command += `-g ${_this.config.settings.swaggerCodegen.codegenLanguage} `;
			command += `-o ${outputDir} `;
			command += `-c ${_this.config.settings.swaggerCodegen.configFile} `;
			command += '--skip-validate-spec ';
			// Don't append empty templates directory
			if (getFileCount(_this.resourcePaths.templates) > 0) command += `-t ${_this.resourcePaths.templates} `;

			_.forEach(_this.config.settings.swaggerCodegen.extraGeneratorOptions, (option) => (command += ' ' + option));

			log.info('Running swagger-codegen...');
			log.debug(`command: ${command}`);
			let code = childProcess.execSync(command, { stdio: 'inherit' });

			if (fs.existsSync(_this.resourcePaths.extensions)) {
				log.info('Copying extensions...');
				fs.copySync(_this.resourcePaths.extensions, _this.config.settings.extensionsDestination);
			} else {
				log.warn(`Extensions path does not exist! Path: ${_this.resourcePaths.extensions}`);
			}

			// Ensure compile scripts fail on error
			_.forEach(_this.config.stageSettings.build.compileScripts, function (script) {
				script.failOnError = true;
			});

			// Run compile scripts
			executeScripts(_this.config.stageSettings.build.compileScripts, 'compile');

			// Copy readme from build to docs and repo root
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

			log.info('Zipping docs...');
			zip
				.zipDir(path.join(outputDir, 'docs'), path.join(getEnv('SDK_TEMP') as string, 'docs.zip'))
				.then(() => executeScripts(_this.config.stageSettings.build.postRunScripts, 'custom build post-run'))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));
		} catch (err: unknown) {
			reject(err);
		}
	});
}

function postbuildImpl(): Promise<string> {
	return new Promise<string>((resolve, reject) => {

		try {
			// Pre-run scripts
			executeScripts(_this.config.stageSettings.postbuild.preRunScripts, 'custom postbuild pre-run');

			createRelease()
				.then(() => executeScripts(_this.config.stageSettings.postbuild.postRunScripts, 'custom postbuild post-run'))
				.then(() => resolve(""))
				.catch((err: Error) => reject(err));
		} catch (err) {
			reject(err);
		}
	});
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

function createRelease(): Promise<string> {
	return new Promise<string>((resolve, reject) => {

		if (!_this.config.settings.sdkRepo.repo || _this.config.settings.sdkRepo.repo === '') {
			log.warn('Skipping github release creation! Repo is undefined.');
			resolve("");
			return;
		}
		if (_this.config.stageSettings.postbuild.gitCommit !== true) {
			log.warn('Skipping git commit and github release creation! Set postbuild.gitCommit=true to commit changes.');
			resolve("");
			return;
		}

		if (_this.isNewVersion !== true) {
			log.warn('Skipping github release creation! Build did not produce a new version.');
			resolve("");
			return;
		}

		git
			.saveChanges(_this.config.settings.sdkRepo.repo, getEnv('SDK_REPO') as string, _this.version.displayFull)
			.then(() => {
				if (_this.config.stageSettings.postbuild.publishRelease !== true) {
					log.warn('Skipping github release creation! Set postbuild.publishRelease=true to release.');
					resolve("");
				}

				// Expected format: https://github.com/grouporuser/reponame
				let repoParts = _this.config.settings.sdkRepo.repo.split('/');
				let repoName = repoParts[repoParts.length - 1];
				let repoOwner = repoParts[repoParts.length - 2];
				if (repoName.endsWith('.git')) repoName = repoName.substring(0, repoName.length - 4);
				log.debug(`repoName: ${repoName}`);
				log.debug(`repoOwner: ${repoOwner}`);

				githubApi.config.repo = repoName;
				githubApi.config.owner = repoOwner;
				githubApi.config.token = getEnv('GITHUB_TOKEN') as string;

				const tagName = _this.config.settings.sdkRepo.tagFormat.replace('{version}', _this.version.displayFull);
				let createReleaseOptions = {
					tag_name: tagName,
					target_commitish: _this.config.settings.sdkRepo.branch ? _this.config.settings.sdkRepo.branch : 'master',
					name: tagName,
					body: `Release notes for version ${tagName}\n${_this.releaseNoteSummary}`,
					draft: false,
					prerelease: false,
				};

				console.log(createReleaseOptions);
				// Create release
				return githubApi.repos.releases.createRelease(createReleaseOptions);
			})
			.then((release) => {
				log.info(`Created release #${release}`);
			})
			.then(() => resolve(""))
			.catch((err: Error) => reject(err));
	});
}

function addNotifications(): Promise<string> {
	return new Promise<string>((resolve, reject) => {

		try {
			// Skip notifications
			if (getEnv('EXCLUDE_NOTIFICATIONS') === true) {
				log.info('Not adding notifications to schema');
				resolve("");
			}

			// Check PureCloud settings
			checkAndThrow(_this.pureCloud, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
			checkAndThrow(_this.pureCloud, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
			checkAndThrow(_this.pureCloud, 'environment', 'PureCloud environment was blank!');

			const client = platformClient.ApiClient.instance;
			client.setEnvironment(_this.pureCloud.environment);
			let notificationsApi = new platformClient.NotificationsApi();

			client.loginClientCredentialsGrant(_this.pureCloud.clientId, _this.pureCloud.clientSecret)
				.then(() => {
					return notificationsApi.getNotificationsAvailabletopics({ 'expand': ['schema'] });
				})
				.then((notifications: Models.AvailableTopicEntityListing) => {
					//let notificationMappings = { notifications: [] };

					type Notification = {
						topic: string; // Replace 'string' with the appropriate type for the 'topic' property
						class: string;
					}


					type NotificationMappings = {
						notifications: Notification[];
					};


					const notificationMappings: NotificationMappings = { notifications: [] };

					// Process schemas
					log.info(`Processing ${notifications.entities.length} notification schemas...`);
					_.forEach(notifications.entities, (entity) => {
						if (!entity.schema) {
							log.warn(`Notification ${entity.id} does not have a defined schema!`);
							return;
						}

						const schemaName = getNotificationClassName(entity.schema.id.toString());
						log.info(`Notification mapping: ${entity.id} (${schemaName})`);
						notificationMappings.notifications.push({ topic: entity.id, class: schemaName });
						extractDefinitons(entity.schema);
						swaggerDiff.newSwagger.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
					});

					// Write mappings to file
					let mappingFilePath = path.resolve(path.join(getEnv('SDK_REPO') as string, 'notificationMappings.json'));
					log.info(`Writing Notification mappings to ${mappingFilePath}`);
					fs.writeFileSync(mappingFilePath, JSON.stringify(notificationMappings, null, 2));

					resolve("");
				})
				.catch((err: Error) => {
					reject(err)
				});
		} catch (err: unknown) {
			reject(err);
		}
	});
}

function getNotificationClassName(id: string) {
	// Normalize to include v2. Architect topics just have to be different and don't have v2...
	let parts = id.split(':');
	if (parts[parts.length - 2] !== 'v2') parts.splice(parts.length - 2, 0, 'v2');
	const normalizedId = parts.join(':');

	// Regex match the URN parts we want
	let className = '';
	let matches = NOTIFICATION_ID_REGEX.exec(normalizedId);
	if (!matches) {
		log.warn('No regex matches!');
		log.warn(`id: ${id}`);
		log.warn(`normalizedId: ${normalizedId}`);
	}
	if (matches !== null) {
		for (let i = 1; i < matches.length; i++) {
			matches[i].split(':').forEach((part) => {
				className += part.charAt(0).toUpperCase() + part.slice(1);
			});
		}
	}

	return className;
}

function processAnyTypes() {
	const keys = Object.keys(swaggerDiff.newSwagger.definitions);
	keys.forEach((key, index) => {
		let obj = swaggerDiff.newSwagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(swaggerDiff.newSwagger.definitions[key].properties);
			keys.forEach((key2, index) => {
				let obj2 = swaggerDiff.newSwagger.definitions[key].properties[key2];
				if (obj2) {
					if (obj2.hasOwnProperty("type") && obj2["type"] === "any") {
						obj2.type = "string" as ItemsType;
						obj2.format = "date-time" as Format;
					}
				}
			});
		}
	});
}

function processPaths() {
	const paths = Object.keys(swaggerDiff.newSwagger.paths);
	for (const path of paths) {
		if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && _this.config.settings.swaggerCodegen.codegenLanguage === "purecloudpython")) {
			delete swaggerDiff.newSwagger.paths[path]
		}
	}

	if (_this.config.settings.swaggerCodegen.codegenLanguage !== "purecloudpython") return

	const definitions = Object.keys(swaggerDiff.newSwagger.definitions);
	for (const definition of definitions) {
		if (definition.endsWith("_")) {
			delete swaggerDiff.newSwagger.definitions[definition]
		}
	}
}

function processRefs() {
	const keys = Object.keys(swaggerDiff.newSwagger.definitions);
	keys.forEach((key, index) => {
		let obj = swaggerDiff.newSwagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(swaggerDiff.newSwagger.definitions[key].properties);
			keys.forEach((key2, index) => {
				let obj2 = swaggerDiff.newSwagger.definitions[key].properties[key2];
				if (obj2) {
					if (obj2.hasOwnProperty("$ref") && (obj2.hasOwnProperty("readOnly") || obj2.hasOwnProperty("description"))) {
						if (obj2.readOnly === true && obj2.hasOwnProperty("description")) {
							obj2.description = `${obj2.description} readOnly`
						}

						let refObj = { "$ref": obj2.$ref };
						obj2.allOf = [refObj];
						delete obj2.$ref;
					}
				}
			});
		}
	});
}

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function extractDefinitons(entity: { [key: string]: any }) {
	try {
		_.forOwn(entity, (property, key) => {
			// Rewrite URN refs to JSON refs
			if (key == '$ref' && !property.startsWith('#')) {
				entity[key] = '#/definitions/' + getNotificationClassName(property);
			}

			// Recurse on objects
			if (typeof property !== 'object') return;
			extractDefinitons(property);

			// Update object to ref
			if (property.id && typeof property.id === 'string') {
				let className = getNotificationClassName(property.id);

				// Store definition
				swaggerDiff.newSwagger.definitions[className] = JSON.parse(JSON.stringify(property));

				// Set reference
				entity[key] = {
					type: 'object',
					$ref: `#/definitions/${className}`,
				};
			}
		});
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.log(err);
			console.log(err.stack);
		}
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

function executeScripts(scripts: Script[], phase: string) {
	if (!scripts) return;
	let scriptCount = scripts ? scripts.length : 0;
	log.info(`Executing ${scriptCount} ${phase ? phase.trim() + ' ' : ''}${pluralize('scripts', scriptCount)}...`);
	_.forEach(scripts, function (script) {
		executeScript(script);
	});
}

function executeScript(script: Script) {
	let code: Buffer;
	let startTime = moment();
	let bufferCode: Number;

	try {
		let args = script.args ? script.args.slice() : [];
		let options: { [key: string]: string } = { stdio: 'inherit' };
		if (script.cwd) {
			log.debug('cwd: ' + script.cwd);
			options['cwd'] = path.resolve(script.cwd);
		}

		if (script.appendIsNewReleaseArg === true) args.push(_this.isNewVersion.toString());

		if (script.appendVersionArg === true) args.push(_this.version.displayFull);

		switch (script.type.toLowerCase()) {
			case 'tsx': {
				args.unshift(getScriptPath(script));
				log.verbose(`Executing node script: ${args.join(' ')}`);
				code = childProcess.execFileSync('tsx', args, options);

				break;
			}
			case 'shell': {
				args.unshift(getScriptPath(script));
				args.unshift('-e');
				log.verbose(`Executing shell script: ${args.join(' ')}`);
				code = childProcess.execFileSync('sh', args, options);
				break;
			}
			case 'command': {
				log.verbose(`Executing command: ${script.command} ${args.join(' ')}`);
				code = childProcess.execFileSync(script.command, args, options);

				break;
			}
			default: {
				log.warn(`UNSUPPORTED SCRIPT TYPE: ${script.type}`);
				return 1;
			}
		}

		if (!code || code === null) {
			bufferCode = 0;
		} else {
			bufferCode = parseInt(code.toString(), 10);
		}
	} catch (err: unknown) {
		if (err instanceof Error) {
			if (err.message) log.error(err.message);
		}
	}

	let completedMessage = `Script completed with return code ${bufferCode} in ${measureDurationFrom(startTime)}`;
	if (bufferCode !== 0) {
		log.error(completedMessage);
		if (script.failOnError === true) {
			throw new Error(`Script failed! Aborting. Script: ${JSON.stringify(script, null, 2)}`);
		}
	} else {
		log.verbose(completedMessage);
		return bufferCode;
	}
}

function getScriptPath(script: Script) {
	let scriptPath = script.path;
	if (!path.parse(scriptPath).dir)
		scriptPath = path.join('./resources/sdk', _this.config.settings.swaggerCodegen.resourceLanguage, 'scripts', script.path);
	scriptPath = path.resolve(scriptPath);

	if (!fs.existsSync(scriptPath)) {
		let msg = `Script not found: ${scriptPath}`;
		throw new Error(msg);
	}

	return scriptPath;
}


function maybeInit(haystack: Builder | Haystack, needle: string, defaultValue: Haystack, warning: string = "Haystack was undefined!"): void {
	if (!haystack) {
		log.warn(warning);
		return;
	}
	if (!haystack[needle]) {
		haystack[needle] = defaultValue;
	}
}

function checkAndThrow(haystack: Builder | Haystack, needle: string, message: string = `${needle} must be set!`): void {
	if (!haystack[needle] || haystack[needle] === '') {
		throw new Error(message);
	}
}

function getEnv(
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

function setEnv(varname: string, value: any) {
	let values = [value];
	resolveEnvVars(values);
	varname = varname.trim();
	log.silly(`ENV: ${varname}=${values[0]}`);
	process.env[varname] = values[0];
}

//recursive for config, localconfig, enVars, Settings
function resolveEnvVars(config: { [key: string]: any }) {
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

function measureDurationFrom(startTime: Moment, endTime: Moment = moment()) {
	if (!startTime) return 'no time';

	return moment.duration(endTime.diff(startTime)).humanize();
}

function getFileCount(dir: fs.PathLike) {
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