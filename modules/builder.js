const _ = require('lodash');
const childProcess = require('child_process');
const deref = require('json-schema-deref-sync');
const fs = require('fs-extra');
const githubApi = require('github-api-promise');
const https = require('https');
const moment = require('moment-timezone');
const path = require('path');
const pluralize = require('pluralize');
const platformClient = require('purecloud-platform-client-v2');
const Q = require('q');
const yaml = require('yamljs');

const log = require('./logger');
const swaggerDiff = require('./swaggerDiff');
const git = require('./gitModule');
const zip = require('./zip');
const proxy = require('./proxy-npm');

/* PRIVATE VARS */

let _this;
const TIMESTAMP_FORMAT = 'h:mm:ss a';
const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;

var newSwaggerTempFile = '';

/* PUBLIC PROPERTIES */

Builder.prototype.config = {};
Builder.prototype.resourcePaths = {};
Builder.prototype.releaseNoteTemplatePath = '';

/* CONSTRUCTOR */

function Builder(configPath, localConfigPath) {
	try {
		
		log.writeBox('Constructing Builder');

		// Load config files
		if (fs.existsSync(configPath)) this.config = loadConfig(configPath);
		else throw new Error(`Config file doesn't exist! Path: ${configPath}`);

		if (fs.existsSync(localConfigPath)) this.localConfig = loadConfig(localConfigPath);
		else {
			this.localConfig = {};
			log.warn(`No local config provided. Path: ${localConfigPath}`);
		}

		// Apply overrides
		log.info('Applying overrides...');
		applyOverrides(this.config, this.localConfig.overrides);

		// Dereference config files
		log.info('Dereferencing config files...');
		this.config = deref(this.config);
		this.localConfig = deref(this.localConfig);

		// Initialize self reference
		_this = this;

		// https://github.com/winstonjs/winston#logging-levels
		// silly > debug > verbose > info > warn > error
		if (this.config.settings.logLevel) log.setLogLevel(this.config.settings.logLevel);

		// Checketh thyself before thou wrecketh thyself
		maybeInit(this, 'config', {});
		maybeInit(this, 'localConfig', {});
		maybeInit(this.config, 'settings', {});
		maybeInit(this.config.settings, 'swagger', {});
		maybeInit(this.config.settings, 'sdkRepo', { repo: undefined, branch: undefined });
		maybeInit(this.config.settings, 'swaggerCodegen', {});
		maybeInit(this.config.settings.swaggerCodegen, 'generateApiTests', false);
		maybeInit(this.config.settings.swaggerCodegen, 'generateModelTests', false);
		maybeInit(this.config.settings, 'resourcePaths', {});
		maybeInit(this.config, 'stageSettings', {});
		maybeInit(this.config.stageSettings, 'prebuild', {});
		maybeInit(this.config.stageSettings, 'build', {});
		maybeInit(this.config.stageSettings, 'postbuild', {});
		maybeInit(this.config.settings.sdkRepo, 'tagFormat', '{version}');

		// Check for required settings
		checkAndThrow(this.config.settings.swagger, 'oldSwaggerPath');
		checkAndThrow(this.config.settings.swagger, 'newSwaggerPath');
		checkAndThrow(this.config.settings, 'swaggerCodegen');
		checkAndThrow(this.config.settings.swaggerCodegen, 'codegenLanguage');
		checkAndThrow(this.config.settings.swaggerCodegen, 'resourceLanguage');
		checkAndThrow(this.config.settings.swaggerCodegen, 'configFile');

		// Normalize sdkRepo
		if (typeof this.config.settings.sdkRepo === 'string') {
			this.config.settings.sdkRepo = {
				repo: this.config.settings.sdkRepo,
				branch: '',
			};
		}

		// Set env vars
		setEnv('COMMON_ROOT', path.resolve('./'));
		setEnv('SDK_REPO', path.resolve(path.join('./output', this.config.settings.swaggerCodegen.codegenLanguage)));
		fs.removeSync(getEnv('SDK_REPO'));
		setEnv('SDK_TEMP', path.resolve(path.join('./temp', this.config.settings.swaggerCodegen.codegenLanguage)));
		fs.emptyDirSync(getEnv('SDK_TEMP'));

		// Load env vars from config
		_.forOwn(this.config.envVars, (value, key) => setEnv(key, value));
		_.forOwn(this.localConfig.envVars, (group, groupKey) => {
			if (group && group.groupDisabled !== true) _.forOwn(group, (value, key) => setEnv(key, value));
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
		var resourceRoot = `./resources/sdk/${this.config.settings.swaggerCodegen.resourceLanguage}/`;
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
		newSwaggerTempFile = path.join(getEnv('SDK_TEMP'), 'newSwagger.json');
		this.pureCloud = {
			clientId: getEnv('PURECLOUD_CLIENT_ID'),
			clientSecret: getEnv('PURECLOUD_CLIENT_SECRET'),
			environment: getEnv('PURECLOUD_ENVIRONMENT', 'mypurecloud.com', true),
		};
		this.notificationDefinitions = {};
		this.releaseNoteTemplatePath = this.config.settings.releaseNoteTemplatePath
			? this.config.settings.releaseNoteTemplatePath
			: './resources/templates/releaseNoteDetail.md';
		this.releaseNoteSummaryTemplatePath = this.config.settings.releaseNoteSummaryTemplatePath
			? this.config.settings.releaseNoteSummaryTemplatePath
			: './resources/templates/releaseNoteSummary.md';

		// Initialize other things
		git.authToken = getEnv('GITHUB_TOKEN');
	} catch (err) {
		console.log(err);
		throw err;
	}
}

/* PUBLIC FUNCTIONS */

Builder.prototype.fullBuild = function () {
	var deferred = Q.defer();

	log.info('Full build initiated!');
	var fullBuildStartTime = moment();

	this.prebuild()
		.then(() => this.build())
		.then(() => this.postbuild())
		.then(() => log.info(`Full build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(fullBuildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

Builder.prototype.prebuild = function () {
	var deferred = Q.defer();

	log.writeBox('STAGE: pre-build');
	var prebuildStartTime = moment();

	prebuildImpl()
		.then(() => log.info(`Pre-build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(prebuildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

Builder.prototype.build = function () {
	var deferred = Q.defer();

	log.writeBox('STAGE: build');
	var buildStartTime = moment();

	buildImpl()
		.then(() => log.info(`Build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(buildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

Builder.prototype.postbuild = function () {
	var deferred = Q.defer();

	log.writeBox('STAGE: post-build');
	var postbuildStartTime = moment();

	postbuildImpl()
		.then(() => log.info(`Post-build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(postbuildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

/* EXPORT MODULE */

module.exports = Builder;

/* IMPL FUNCTIONS */

function prebuildImpl() {
	var deferred = Q.defer();

	try {
		// Pre-run scripts
		executeScripts(_this.config.stageSettings.prebuild.preRunScripts, 'custom prebuild pre-run');

		// Clone repo
		var startTime = moment();
		log.info(`Cloning ${_this.config.settings.sdkRepo.repo} (${_this.config.settings.sdkRepo.branch}) to ${getEnv('SDK_REPO')}`);
		git
			.clone(_this.config.settings.sdkRepo.repo, _this.config.settings.sdkRepo.branch, getEnv('SDK_REPO'))
			.then(function (repository) {
				log.debug(`Clone operation completed in ${measureDurationFrom(startTime)}`);
			})
			.then(function () {
				// Diff swagger
				log.info('Diffing swagger files...');
				swaggerDiff.useSdkVersioning = true;
				swaggerDiff.getAndDiff(
					_this.config.settings.swagger.oldSwaggerPath,
					_this.config.settings.swagger.newSwaggerPath,
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
			.then(function () {
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
				var oldVersion = swaggerDiff.stringifyVersion(_this.version, true);
				log.debug(`Previous version: ${oldVersion}`);
				swaggerDiff.incrementVersion(_this.version);
				var newVersion = swaggerDiff.stringifyVersion(_this.version, true);

				// Determine if new version
				_this.isNewVersion = getEnv('BRANCH_NAME') !== 'master' ? false : oldVersion !== newVersion;
				setEnv('SDK_NEW_VERSION', _this.isNewVersion);
				if (_this.isNewVersion === true) log.info(`New version: ${_this.version.displayFull}`);
				else log.warn('Version was not incremented');

				// Write new version to file
				if (_this.isNewVersion === true && _this.config.settings.versionFile) {
					fs.writeFileSync(_this.config.settings.versionFile, JSON.stringify(_this.version, null, 2));
				}

				// Get API version from health check endpoint
				var deferred = Q.defer();
				var resString = '';
				log.info(`Getting API version from ${_this.config.settings.apiHealthCheckUrl}`);
				https.get(_this.config.settings.apiHealthCheckUrl, function (res) {
					res.on('data', function (chunk) {
						resString += chunk;
					});
					res.on('end', function () {
						deferred.resolve(JSON.parse(resString));
					});
					res.on('error', function (err) {
						deferred.reject(err);
					});
				});

				return deferred.promise;
			})
			.then(function (apiVersionData) {
				// Sanitize and store API version data
				var apiVersionDataClean = {};
				_.forIn(apiVersionData, function (value, key) {
					apiVersionDataClean[key.replace(/\W+/g, '')] = value;
				});
				_this.apiVersionData = apiVersionDataClean;
				log.debug(`API version data: ${JSON.stringify(apiVersionDataClean, null, 2)}`);

				// Get extra release note data
				var data = { extraNotes: getEnv('RELEASE_NOTES') };
				data.hasExtraNotes = data.extraNotes !== undefined;
				data.apiVersionData = _this.apiVersionData;

				// Get release notes
				log.info('Generating release notes...');
				_this.releaseNotes = swaggerDiff.generateReleaseNotes(_this.releaseNoteTemplatePath, data);
				_this.releaseNoteSummary = swaggerDiff.generateReleaseNotes(_this.releaseNoteSummaryTemplatePath, data);

				var releaseNotePath = path.join(getEnv('SDK_REPO'), 'releaseNotes.md');
				log.info(`Writing release notes to ${releaseNotePath}`);
				fs.writeFileSync(releaseNotePath, _this.releaseNotes);
			})
			.then(() => executeScripts(_this.config.stageSettings.prebuild.postRunScripts, 'custom prebuild post-run'))
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch (err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

function buildImpl() {
	var deferred = Q.defer();

	try {
		// Pre-run scripts
		executeScripts(_this.config.stageSettings.build.preRunScripts, 'custom build pre-run');

		var outputDir = path.join(getEnv('SDK_REPO'), 'build');
		log.debug(`SDK build dir -> ${outputDir}`);
		fs.emptyDirSync(outputDir);

		var command = '';
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
		var code = childProcess.execSync(command, { stdio: 'inherit' });

		if (fs.existsSync(_this.resourcePaths.extensions)) {
			log.info('Copying extensions...');
			fs.copySync(_this.resourcePaths.extensions, _this.config.settings.extensionsDestination);
		} else {
			log.warn(`Extensions path does not exist! Path: ${_this.resourcePaths.extensions}`);
		}
 
		// Set Up Proxy for Testcases in Compile-Build 
		proxy.setupProxy();
		// Ensure compile scripts fail on error
		_.forEach(_this.config.stageSettings.build.compileScripts, function (script) {
			script.failOnError = true;
		});

		// Run compile scripts
		executeScripts(_this.config.stageSettings.build.compileScripts, 'compile');

		// Copy readme from build to docs and repo root
		log.info('Copying readme...');
		fs.ensureDirSync(path.join(getEnv('SDK_REPO'), 'build/docs'));
		fs.createReadStream(path.join(getEnv('SDK_REPO'), 'build/README.md')).pipe(
			fs.createWriteStream(path.join(getEnv('SDK_REPO'), 'build/docs/index.md'))
		);
		fs.createReadStream(path.join(getEnv('SDK_REPO'), 'build/README.md')).pipe(
			fs.createWriteStream(path.join(getEnv('SDK_REPO'), 'README.md'))
		);

		//Copy the release notes from the build directory to the docs directory
		log.info('Copying releaseNotes.md...');
		fs.createReadStream(path.join(getEnv('SDK_REPO'), 'releaseNotes.md')).pipe(
			fs.createWriteStream(path.join(getEnv('SDK_REPO'), 'build/docs/releaseNotes.md'))
		);

		log.info('Zipping docs...');
		zip
			.zipDir(path.join(outputDir, 'docs'), path.join(getEnv('SDK_TEMP'), 'docs.zip'))
			.then(() => executeScripts(_this.config.stageSettings.build.postRunScripts, 'custom build post-run'))
			.then(() => proxy.stopProxy())
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch (err) {
		proxy.stopProxy()
		deferred.reject(err);
	}

	return deferred.promise;
}

function postbuildImpl() {
	var deferred = Q.defer();

	try {
		// Pre-run scripts
		executeScripts(_this.config.stageSettings.postbuild.preRunScripts, 'custom postbuild pre-run');

		createRelease()
			.then(() => executeScripts(_this.config.stageSettings.postbuild.postRunScripts, 'custom postbuild post-run'))
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch (err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

/* PRIVATE FUNCTIONS */

function applyOverrides(original, overrides) {
	if (!original || !overrides) return;

	_.forOwn(overrides, function (value, key) {
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

function createRelease() {
	var deferred = Q.defer();

	if (!_this.config.settings.sdkRepo.repo || _this.config.settings.sdkRepo.repo === '') {
		log.warn('Skipping github release creation! Repo is undefined.');
		deferred.resolve();
		return deferred.promise;
	}
	if (_this.config.stageSettings.postbuild.gitCommit !== true) {
		log.warn('Skipping git commit and github release creation! Set postbuild.gitCommit=true to commit changes.');
		deferred.resolve();
		return deferred.promise;
	}

	if (_this.isNewVersion !== true) {
		log.warn('Skipping github release creation! Build did not produce a new version.');
		deferred.resolve();
		return deferred.promise;
	}

	git
		.saveChanges(_this.config.settings.sdkRepo.repo, getEnv('SDK_REPO'), _this.version.displayFull)
		.then(() => {
			if (_this.config.stageSettings.postbuild.publishRelease !== true) {
				log.warn('Skipping github release creation! Set postbuild.publishRelease=true to release.');
				deferred.resolve();
				return deferred.promise;
			}

			// Expected format: https://github.com/grouporuser/reponame
			var repoParts = _this.config.settings.sdkRepo.repo.split('/');
			var repoName = repoParts[repoParts.length - 1];
			var repoOwner = repoParts[repoParts.length - 2];
			if (repoName.endsWith('.git')) repoName = repoName.substring(0, repoName.length - 4);
			log.debug(`repoName: ${repoName}`);
			log.debug(`repoOwner: ${repoOwner}`);

			githubApi.config.repo = repoName;
			githubApi.config.owner = repoOwner;
			githubApi.config.token = getEnv('GITHUB_TOKEN');

			const tagName = _this.config.settings.sdkRepo.tagFormat.replace('{version}', _this.version.displayFull);
			var createReleaseOptions = {
				tag_name: tagName,
				target_commitish: _this.config.settings.sdkRepo.branch ? _this.config.settings.sdkRepo.branch : 'master',
				name: tagName,
				body: `Release notes for version ${tagName}\n${_this.releaseNoteSummary}`,
				draft: false,
				prerelease: false,
			};

			// Create release
			return githubApi.repos.releases.createRelease(createReleaseOptions);
		})
		.then((release) => {
			log.info(`Created release #${release.id}, \
				${release.name}, tag: ${release.tag_name}, \
				published on ${release.published_at}`);
		})
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
}

function addNotifications() {
	var deferred = Q.defer();

	try {
		// Skip notifications
		if (getEnv('EXCLUDE_NOTIFICATIONS') === true) {
			log.info('Not adding notifications to schema');
			deferred.resolve();
			return deferred.promise;
		}

		// Check PureCloud settings
		checkAndThrow(_this.pureCloud, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
		checkAndThrow(_this.pureCloud, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
		checkAndThrow(_this.pureCloud, 'environment', 'PureCloud environment was blank!');

		const client = platformClient.ApiClient.instance;
		client.setEnvironment(_this.pureCloud.environment);
		var notificationsApi = new platformClient.NotificationsApi();

		client.loginClientCredentialsGrant(_this.pureCloud.clientId, _this.pureCloud.clientSecret)
		.then(()=> {
			return notificationsApi.getNotificationsAvailabletopics({'expand': ['schema']});
		})
		.then((notifications) => {
			var notificationMappings = { notifications: [] };

			// Process schemas
			log.info(`Processing ${notifications.entities.length} notification schemas...`);
			_.forEach(notifications.entities, (entity) => {
				if (!entity.schema) {
					log.warn(`Notification ${entity.id} does not have a defined schema!`);
					return;
				}

				const schemaName = getNotificationClassName(entity.schema.id);
				log.info(`Notification mapping: ${entity.id} (${schemaName})`);
				notificationMappings.notifications.push({ topic: entity.id, class: schemaName });
				extractDefinitons(entity.schema);
				swaggerDiff.newSwagger.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
			});

			// Write mappings to file
			var mappingFilePath = path.resolve(path.join(getEnv('SDK_REPO'), 'notificationMappings.json'));
			log.info(`Writing Notification mappings to ${mappingFilePath}`);
			fs.writeFileSync(mappingFilePath, JSON.stringify(notificationMappings, null, 2));

			deferred.resolve();
		})
		.catch((err) => {
			deferred.reject(err)
		});
	} catch (err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

function getNotificationClassName(id) {
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
	for (let i = 1; i < matches.length; i++) {
		matches[i].split(':').forEach((part) => {
			className += part.charAt(0).toUpperCase() + part.slice(1);
		});
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
						obj2.type = "string";
						obj2.format = "date-time";
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

function extractDefinitons(entity) {
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
	} catch (e) {
		console.log(e);
		console.log(e.stack);
	}
}

function loadConfig(configPath) {
	configPath = path.resolve(configPath);
	var extension = path.parse(configPath).ext.toLowerCase();
	if (extension == '.yml' || extension == '.yaml') {
		log.info(`Loading YAML config from ${configPath}`);
		return yaml.load(path.resolve(configPath));
	} else {
		log.info(`Loading JSON config from ${configPath}`);
		return require(path.resolve(configPath));
	}
}

function executeScripts(scripts, phase) {
	if (!scripts) return;
	var scriptCount = lenSafe(scripts);
	log.info(`Executing ${scriptCount} ${phase ? phase.trim() + ' ' : ''}${pluralize('scripts', scriptCount)}...`);
	_.forEach(scripts, function (script) {
		executeScript(script);
	});
}

function executeScript(script) {
	var code = -100;
	var startTime = moment();

	try {
		var args = script.args ? script.args.slice() : [];
		var options = { stdio: 'inherit' };
		if (script.cwd) {
			log.debug('cwd: ' + script.cwd);
			options['cwd'] = path.resolve(script.cwd);
		}

		if (script.appendIsNewReleaseArg === true) args.push(_this.isNewVersion);

		if (script.appendVersionArg === true) args.push(_this.version.displayFull);

		switch (script.type.toLowerCase()) {
			case 'node': {
				args.unshift(getScriptPath(script));
				log.verbose(`Executing node script: ${args.join(' ')}`);
				code = childProcess.execFileSync('node', args, options);
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

		if (!code || code === null) code = 0;
	} catch (err) {
		if (err.message) log.error(err.message);

		if (err.error) log.error(err.error);

		if (err.status) code = err.status;
	}

	var completedMessage = `Script completed with return code ${code} in ${measureDurationFrom(startTime)}`;
	if (code !== 0) {
		log.error(completedMessage);
		if (script.failOnError === true) {
			throw new Error(`Script failed! Aborting. Script: ${JSON.stringify(script, null, 2)}`);
		}
	} else {
		log.verbose(completedMessage);
		return code;
	}
}

function getScriptPath(script) {
	var scriptPath = script.path;
	if (!path.parse(scriptPath).dir)
		scriptPath = path.join('./resources/sdk', _this.config.settings.swaggerCodegen.resourceLanguage, 'scripts', script.path);
	scriptPath = path.resolve(scriptPath);

	if (!fs.existsSync(scriptPath)) {
		var msg = `Script not found: ${scriptPath}`;
		var error = new Error(msg);
		error.error = msg;
		error.status = 999;
		throw error;
	}

	return scriptPath;
}

function lenSafe(arr) {
	return arr ? arr.length : 0;
}

function maybeInit(haystack, needle, defaultValue, warning) {
	if (!haystack) {
		log.warn('Haystack was undefined!');
		return;
	}
	if (!haystack[needle]) {
		if (warning) log.warn(warning);

		haystack[needle] = defaultValue;
	}
}

function checkAndThrow(haystack, needle, message) {
	if (!haystack[needle] || haystack[needle] === '') throw new Error(message ? message : `${needle} must be set!`);
}

function getEnv(varname, defaultValue, isDefaultValue) {
	varname = varname.trim();
	var envVar = process.env[varname];
	log.silly(`ENV: ${varname}->${envVar}`);
	if (!envVar && defaultValue) {
		envVar = defaultValue;
		if (isDefaultValue === true) log.info(`Using default value for ${varname}: ${envVar}`);
		else log.warn(`Using override for ${varname}: ${envVar}`);
	}
	if (envVar) {
		if (envVar.toLowerCase() === 'true') return true;
		else if (envVar.toLowerCase() === 'true') return false;
		else return envVar;
	}

	return defaultValue;
}

function setEnv(varname, value) {
	var values = [value];
	resolveEnvVars(values);
	varname = varname.trim();
	log.silly(`ENV: ${varname}=${values[0]}`);
	process.env[varname] = values[0];
}

function resolveEnvVars(config) {
	_.forOwn(config, function (value, key) {
		if (typeof value == 'string') {
			config[key] = value.replace(/\$\{(.+?)\}/gi, function (match, p1, offset, string) {
				return getEnv(p1);
			});
		} else {
			resolveEnvVars(value);
		}
	});
}

function measureDurationFrom(startTime, endTime) {
	if (!startTime) return 'no time';
	if (!endTime) endTime = moment();

	return moment.duration(endTime.diff(startTime)).humanize();
}

function getFileCount(dir) {
	if (!fs.existsSync(dir)) {
		log.silly(`Directory doesn't exist: ${dir}`);
		return 0;
	}
	var files = fs.readdirSync(dir);
	log.silly(`There are ${files.length} files in ${dir}`);

	if (files.length == 1 && files[0] === '.DS_Store') {
		log.silly("...and it's named .DS_Store   ಠ_ಠ");
		return 0;
	}

	return files.length;
}