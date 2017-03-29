const _ = require('lodash');
const childProcess = require('child_process');
const deref = require('json-schema-deref-sync');
const fs = require('fs-extra');
const githubApi = require('github-api-promise');
const moment = require('moment-timezone');
const path = require('path');
const pluralize = require('pluralize');
const purecloud = require('purecloud_api_sdk_javascript');
const Q = require('q');
const yaml = require('yamljs');

const log = require('./logger');
const swaggerDiff = require('./swaggerDiff');
const git = require('./gitModule');
const zip = require('./zip');


/* PRIVATE VARS */

const TIMESTAMP_FORMAT = "h:mm:ss a";

var newSwaggerTempFile = '';


/* PUBLIC PROPERTIES */

Builder.prototype.config = {};
Builder.prototype.repository = {};
Builder.prototype.resourcePaths = {};
Builder.prototype.repository = {};
Builder.prototype.releaseNoteTemplatePath = '';


/* CONSTRUCTOR */

function Builder(configPath, localConfigPath) {
	try {
		log.writeBox('Constructing Builder');

		// Load config files
		if (fs.existsSync(configPath))
			this.config = loadConfig(configPath);
		else
			throw new Error(`Config file doesn't exist! Path: ${configPath}`);

		if (fs.existsSync(localConfigPath))
			this.localConfig = loadConfig(localConfigPath);
		else
			log.warn(`No local config provided. Path: ${localConfigPath}`);

		// Apply overrides
		log.info('Applying overrides...');
		applyOverrides(this.config, this.localConfig.overrides);

		// Dereference config files
		log.info('Dereferencing config files...');
		this.config = deref(this.config);
		this.localConfig = deref(this.localConfig);

		// Initialize self reference
		self = this;

		// https://github.com/winstonjs/winston#logging-levels
		// silly > debug > verbose > info > warn > error
		if (this.config.settings.logLevel)
			log.setLogLevel(this.config.settings.logLevel);

		// Checketh thyself before thou wrecketh thyself
		maybeInit(this, 'config', {});
		maybeInit(this, 'localConfig', {});
		maybeInit(this.config, 'settings', {});
		maybeInit(this.config.settings, 'swagger', {});
		maybeInit(this.config.settings, 'swaggerCodegen', {});
		maybeInit(this.config.settings.swaggerCodegen, 'generateApiTests', false);
		maybeInit(this.config.settings.swaggerCodegen, 'generateModelTests', false);
		maybeInit(this.config.settings, 'resourcePaths', {});
		maybeInit(this.config, 'stageSettings', {});
		maybeInit(this.config.stageSettings, 'prebuild', {});
		maybeInit(this.config.stageSettings, 'build', {});
		maybeInit(this.config.stageSettings, 'postbuild', {});

		// Check for required settings
		checkAndThrow(this.config.settings, 'sdkRepo');
		checkAndThrow(this.config.settings.swagger, 'oldSwaggerPath');
		checkAndThrow(this.config.settings.swagger, 'newSwaggerPath');
		checkAndThrow(this.config.settings, 'swaggerCodegen');
		checkAndThrow(this.config.settings.swaggerCodegen, 'codegenLanguage');
		checkAndThrow(this.config.settings.swaggerCodegen, 'resourceLanguage');
		checkAndThrow(this.config.settings.swaggerCodegen, 'configFile');

		// Normalize sdkRepo
		if (typeof(this.config.settings.sdkRepo) === 'string') {
			this.config.settings.sdkRepo = {
				repo: this.config.settings.sdkRepo,
				branch: ''
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
			if (group.groupDisabled !== true)
				_.forOwn(group, (value, key) => setEnv(key, value));
		});

		// Resolve env vars in config
		resolveEnvVars(this.config);
		resolveEnvVars(this.localConfig);
		if (this.config.settings.debugConfig === true) {
			if (this.localConfig)
				log.debug('Local config file: \n' + JSON.stringify(this.localConfig,null,2));
			log.debug('Config file: \n' + JSON.stringify(this.config,null,2));
		}

		// Initialize instance settings
		log.setUseColor(this.config.settings.enableLoggerColor === true);
		var resourceRoot = `./resources/sdk/${this.config.settings.swaggerCodegen.resourceLanguage}/`;
		this.resourcePaths = {
			extensions: path.resolve(this.config.settings.resourcePaths.extensions ? 
				this.config.settings.resourcePaths.extensions : 
				path.join(resourceRoot, 'extensions')),
			scripts: path.resolve(this.config.settings.resourcePaths.scripts ? 
				this.config.settings.resourcePaths.scripts : 
				path.join(resourceRoot, 'scripts')),
			templates: path.resolve(this.config.settings.resourcePaths.templates ? 
				this.config.settings.resourcePaths.templates : 
				path.join(resourceRoot, 'templates'))
		};
		log.debug(`Resource paths: ${JSON.stringify(this.resourcePaths, null, 2)}`);
		newSwaggerTempFile = path.join(getEnv('SDK_TEMP'), 'newSwagger.json');
		this.pureCloud = {
			clientId: getEnv('PURECLOUD_CLIENT_ID'),
			clientSecret: getEnv('PURECLOUD_CLIENT_SECRET'),
			environment: getEnv('PURECLOUD_ENVIRONMENT', 'mypurecloud.com', true)
		};
		this.notificationDefinitions = {};
		this.releaseNoteTemplatePath = this.config.settings.releaseNoteTemplatePath ? 
			this.config.settings.releaseNoteTemplatePath : 
			'./resources/templates/releaseNoteDetail.md';
		this.releaseNoteSummaryTemplatePath = this.config.settings.releaseNoteSummaryTemplatePath ? 
			this.config.settings.releaseNoteSummaryTemplatePath : 
			'./resources/templates/releaseNoteSummary.md';

		// Initialize other things
		git.authToken = getEnv('GITHUB_TOKEN');
	} catch(err) {
		console.log(err);
		throw err;
	}
}


/* PUBLIC FUNCTIONS */

Builder.prototype.fullBuild = function() {
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

Builder.prototype.prebuild = function() {
	var deferred = Q.defer();

	log.writeBox('STAGE: pre-build');
	var prebuildStartTime = moment();

	prebuildImpl()
		.then(() => log.info(`Pre-build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(prebuildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

Builder.prototype.build = function() {
	var deferred = Q.defer();

	log.writeBox('STAGE: build');
	var buildStartTime = moment();

	buildImpl()
		.then(() => log.info(`Build complete at ${moment().format(TIMESTAMP_FORMAT)} in ${measureDurationFrom(buildStartTime)}`))
		.then(() => deferred.resolve())
		.catch((err) => deferred.reject(err));

	return deferred.promise;
};

Builder.prototype.postbuild = function() {
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

		//log.debug(self);

		// Pre-run scripts
		executeScripts(self.config.stageSettings.prebuild.preRunScripts, 'custom prebuild pre-run');

		// Clone repo
		var startTime = moment();
		log.info(`Cloning ${self.config.settings.sdkRepo.repo} (${self.config.settings.sdkRepo.branch}) to ${getEnv('SDK_REPO')}`);
		git.clone(self.config.settings.sdkRepo.repo, self.config.settings.sdkRepo.branch, getEnv('SDK_REPO'))
			.then(function(repository) {
				log.debug(`Clone operation completed in ${measureDurationFrom(startTime)}`);
				self.repository = repository;
			})
			.then(function() {
				// Diff swagger
				log.info('Diffing swagger files...');
				swaggerDiff.useSdkVersioning = true;
				swaggerDiff.getAndDiff(
					self.config.settings.swagger.oldSwaggerPath, 
					self.config.settings.swagger.newSwaggerPath, 
					self.config.settings.swagger.saveOldSwaggerPath,
					self.config.settings.swagger.saveNewSwaggerPath);
			})
			.then(() => {
				return addNotifications();
			})
			.then(() => {
				// Save new swagger to temp file for build
				log.info(`Writing new swagger file to temp storage path: ${newSwaggerTempFile}`);
				fs.writeFileSync(newSwaggerTempFile, JSON.stringify(swaggerDiff.newSwagger));
			})
			.then(function() {
				self.version = {
					"major": 0,
					"minor": 0,
					"point": 0,
					"prerelease": "UNKNOWN",
					"apiVersion": 0
				};

				if (self.config.settings.versionFile) {
					if (fs.existsSync(self.config.settings.versionFile)) {
						self.version = JSON.parse(fs.readFileSync(self.config.settings.versionFile, 'utf8'));
					} else {
						log.warn(`Version file not found: ${self.config.settings.versionFile}`);
					}
				} else {
					log.warn('Version file not specified! Defaulting to 0.0.0-UNKNOWN');
				}

				// Increment version in config
				var oldVersion = swaggerDiff.stringifyVersion(self.version, true);
				log.debug(`Previous version: ${oldVersion}`);
				swaggerDiff.incrementVersion(self.version);
				var newVersion = swaggerDiff.stringifyVersion(self.version, true);
				
				// Determine if new version
				self.isNewVersion = oldVersion !== newVersion;
				setEnv('SDK_NEW_VERSION', self.isNewVersion);
				if (self.isNewVersion === true)
					log.info(`New version: ${self.version.displayFull}`);
				else
					log.warn('Version was not incremented');

				// Write new version to file
				if (self.isNewVersion === true && self.config.settings.versionFile) {
					fs.writeFileSync(self.config.settings.versionFile, JSON.stringify(self.version, null, 2));
				}
			})
			.then(function() {
				// Get extra release note data
				var data = { extraNotes: getEnv('RELEASE_NOTES') };
				data.hasExtraNotes = data.extraNotes !== undefined;

				// Get release notes
				log.info('Generating release notes...');
				self.releaseNotes = swaggerDiff.generateReleaseNotes(self.releaseNoteTemplatePath, data);
				self.releaseNoteSummary = swaggerDiff.generateReleaseNotes(self.releaseNoteSummaryTemplatePath, data);

				var releaseNotePath = path.join(getEnv('SDK_REPO'), 'releaseNotes.md');
				log.info(`Writing release notes to ${releaseNotePath}`);
				fs.writeFileSync(releaseNotePath, self.releaseNotes);
			})
			.then(() => executeScripts(self.config.stageSettings.prebuild.postRunScripts, 'custom prebuild post-run'))
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

function buildImpl() {
	var deferred = Q.defer();

	try {
		// Pre-run scripts
		executeScripts(self.config.stageSettings.build.preRunScripts, 'custom build pre-run');

		var outputDir = path.join(getEnv('SDK_REPO'), 'build');
		log.debug(`SDK build dir -> ${outputDir}`);
		fs.emptyDirSync(outputDir);


		var command = '';
		// Java command and options
		command += `java `;
		command += `-DapiTests=${self.config.settings.swaggerCodegen.generateApiTests} `;
		command += `-DmodelTests=${self.config.settings.swaggerCodegen.generateModelTests} `;
		command += `${getEnv('JAVA_OPTS', '')} -XX:MaxPermSize=256M -Xmx1024M -DloggerPath=conf/log4j.properties `;
		// Swagger-codegen jar file
		command += `-jar ${self.config.settings.swaggerCodegen.jarPath} `;
		// Swagger-codegen options
		command += `generate `;
		command += `-i ${newSwaggerTempFile} `;
		command += `-l ${self.config.settings.swaggerCodegen.codegenLanguage} `;
		command += `-o ${outputDir} `;
		command += `-c ${self.config.settings.swaggerCodegen.configFile} `;
		command += `-t ${self.resourcePaths.templates} `;
		_.forEach(self.config.settings.swaggerCodegen.extraGeneratorOptions, (option) => command += ' ' + option);

		log.info('Running swagger-codegen...');
		log.debug(`command: ${command}`);
		var code = childProcess.execSync(command, {stdio:'inherit'});

		log.info('Copying extensions...');
		fs.copySync(self.resourcePaths.extensions, self.config.settings.extensionsDestination);

		// Ensure compile scripts fail on error
		_.forEach(self.config.stageSettings.build.compileScripts, function(script) {
			script.failOnError = true;
		});

		// Run compile scripts
		executeScripts(self.config.stageSettings.build.compileScripts, 'compile');

		log.info('Copying readme...');
		fs.createReadStream(path.join(getEnv('SDK_REPO'), 'README.md'))
			.pipe(fs.createWriteStream(path.join(getEnv('SDK_REPO'), 'build/docs/index.md')));

		log.info('Zipping docs...');
		zip.zipDir(path.join(outputDir, 'docs'), path.join(getEnv('SDK_TEMP'), 'docs.zip'))
			.then(() => executeScripts(self.config.stageSettings.build.postRunScripts, 'custom build post-run'))
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

function postbuildImpl() {
	var deferred = Q.defer();

	try {
		// Pre-run scripts
		executeScripts(self.config.stageSettings.postbuild.preRunScripts, 'custom postbuild pre-run');

		createRelease()
			.then(() => executeScripts(self.config.stageSettings.postbuild.postRunScripts, 'custom postbuild post-run'))
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
}


/* PRIVATE FUNCTIONS */

function applyOverrides(original, overrides) {
	if (!original || !overrides)
		return;

	_.forOwn(overrides, function(value, key) {
		if (Array.isArray(value)) {
			log.verbose(`Overriding array ${key}. Length old/new => ${original[key].length}/${value.length}`);
			original[key] = value;
		}
		else if (typeof(value) == 'object') {
			// Initialize original to ensure the full path to the override values
			if (!original[key])
				original[key] = {};
			applyOverrides(original[key], value);
		} else {
			log.verbose(`Overriding ${key}. Values old/new => ${original[key]}/${value}`);
			original[key] = value;
		}
	});
}

function createRelease() {
	var deferred = Q.defer();

	if (self.config.stageSettings.postbuild.gitCommit !== true) {
		log.warn('Skipping git commit and github release creation! Set postbuild.gitCommit=true to commit changes.');
		deferred.resolve();
		return deferred.promise;
	}

	git.saveChanges(self.config.settings.sdkRepo.repo, getEnv('SDK_REPO'), self.version.displayFull)
		.then(() => {
			if (self.config.stageSettings.postbuild.publishRelease !== true) {
				log.warn('Skipping github release creation! Set postbuild.publishRelease=true to release.');
				deferred.resolve();
				return deferred.promise;
			}

			if (self.isNewVersion !== true) {
				log.warn('Skipping github release creation! Build did not produce a new version.');
				deferred.resolve();
				return deferred.promise;
			}

			// Expected format: https://github.com/grouporuser/reponame
			var repoParts = self.config.settings.sdkRepo.repo.split('/');
			var repoName = repoParts[repoParts.length - 1];
			var repoOwner = repoParts[repoParts.length - 2];
			if (repoName.endsWith('.git'))
				repoName = repoName.substring(0, repoName.length - 4);
			log.debug(`repoName: ${repoName}`);
			log.debug(`repoOwner: ${repoOwner}`);

			githubApi.config.repo = repoName;
			githubApi.config.owner = repoOwner;
			githubApi.config.token = getEnv('GITHUB_TOKEN');

		    var createReleaseOptions = {
				"tag_name": self.version.displayFull,
				"target_commitish": self.config.settings.sdkRepo.branch ? self.config.settings.sdkRepo.branch : 'master',
				"name": self.version.displayFull,
				"body": `Release notes for version ${self.version.displayFull}\n${self.releaseNoteSummary}`,
				"draft": false,
				"prerelease": false
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
		checkAndThrow(self.pureCloud, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
		checkAndThrow(self.pureCloud, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
		checkAndThrow(self.pureCloud, 'environment', 'PureCloud environment was blank!');

        var pureCloudSession = purecloud.PureCloudSession({
            strategy: 'client-credentials',
            timeout: 20000,
            clientId: self.pureCloud.clientId,
            clientSecret: self.pureCloud.clientSecret,
            environment: self.pureCloud.environment
        });
        var notificationsApi = new purecloud.NotificationsApi(pureCloudSession);

        pureCloudSession.login()
        	.then(() => {
        		return notificationsApi.getAvailabletopics(['schema']);
        	})
        	.then((notifications) => {
                var notificationMappings = {'notifications':[]};

                // Process schemas
                log.info(`Processing ${notifications.entities.length} notification schemas...`);
                _.forEach(notifications.entities, (entity) => {
                    if (!entity.schema) {
                        log.warn(`Notification ${entity.id} does not have a defined schema!`);
                        return;
                    }

                    var schemaIdArray = entity.schema.id.split(':');
                    var schemaName = schemaIdArray[schemaIdArray.length - 1] + 'Notification';
                    log.silly(`Notification mapping: ${entity.id} (${schemaName})`);
                    notificationMappings.notifications.push({'topic':entity.id, 'class':schemaName});
                    extractDefinitons(schemaName, entity.schema);
                });

                // Fix references (make standard JSON Pointers instead of URI) and add to swagger
                _.forOwn(self.notificationDefinitions, (definition) => {
                	fixRefs(definition); 
                	swaggerDiff.newSwagger.definitions[definition.name] = definition.schema;
                });

                // Write mappings to file
                var mappingFilePath = path.resolve(path.join(getEnv('SDK_REPO'), 'notificationMappings.json'));
                log.info(`Writing Notification mappings to ${mappingFilePath}`);
                fs.writeFileSync(mappingFilePath, JSON.stringify(notificationMappings, null, 2));

                deferred.resolve();
        	})
			.catch((err) => deferred.reject(err));
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

function extractDefinitons(schemaName, entity) {
    try {
    	_.forOwn(entity, (value, key) => {
            if (key == 'id' && typeof(value) == 'string') {
                var entityIdArray = entity.id.split(':');
                var lastPart = entityIdArray[entityIdArray.length - 1];
                var entityName = schemaName;
                if (schemaName != (lastPart + 'Notification')) {
                    entityName += lastPart;
                }
                self.notificationDefinitions[entity.id] = {
                    'name': entityName,
                    'schema': entity
                };
            }

            if (typeof(value) == 'object') {
                extractDefinitons(schemaName, value);
            }
        });
    } catch (e) {
        console.log(e);
        console.log(e.stack);
    }
}

function fixRefs(entity) {
    // replace $ref values with "#/definitions/type" instead of uri
    try {
    	_.forOwn(entity, (property, key) => {
            if (key == '$ref' && !property.startsWith('#')) {
                entity[key] = '#/definitions/' + self.notificationDefinitions[property].name;
            } else if (typeof(property) == 'object') {
                entity[key] = fixRefs(property);
            }
        });
        return entity;
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
	_.forEach(scripts, function(script) { executeScript(script); });
}

function executeScript(script) {
	var code = -100;
	var startTime = moment();

	try {
		var args = script.args ? script.args.slice() : [];
		var options = {stdio:'inherit'};
		if (script.cwd)
			options['cwd'] = path.resolve(script.cwd);

		if (script.appendIsNewReleaseArg === true)
			args.push(self.isNewVersion);

		if (script.appendVersionArg === true)
			args.push(self.version.displayFull);

		switch (script.type.toLowerCase()) {
			case 'node': {
				args.unshift(getScriptPath(script));
				log.verbose(`Executing node script: ${args.join(' ')}`);
				code = childProcess.execFileSync('node', args, options);
				break;
			}
			case 'shell': {
				args.unshift(getScriptPath(script));
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

		if (!code || code === null)
			code = 0;
	} catch (err) {
		if (err.message)
			log.error(err.message);

		if (err.error)
			log.error(err.error);

		if (err.status)
			code = err.status;
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
		scriptPath = path.join('./resources/sdk', self.config.settings.swaggerCodegen.resourceLanguage, 'scripts', script.path);
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
		if (warning) 
			log.warn(warning);

		haystack[needle] = defaultValue;
	}
}

function checkAndThrow(haystack, needle, message) {
	if (!haystack[needle] || haystack[needle] === '')
		throw new Error(message ? message : `${needle} must be set!`);
}

function getEnv(varname, defaultValue, isDefaultValue) {
	varname = varname.trim();
	var envVar = process.env[varname];
	log.silly(`ENV: ${varname}->${envVar}`);
	if (!envVar && defaultValue) {
		envVar = defaultValue;
		if (isDefaultValue === true)
			log.info(`Using default value for ${varname}: ${envVar}`);
		else
			log.warn(`Using override for ${varname}: ${envVar}`);
	}
	if (envVar) {
		if (envVar.toLowerCase() === 'true')
			return true;
		else if (envVar.toLowerCase() === 'true')
			return false;
		else 
			return envVar;
	}

	return defaultValue;
}

function setEnv(varname, value) {
	var values = [ value ];
	resolveEnvVars(values);
	varname = varname.trim();
	log.silly(`ENV: ${varname}=${values[0]}`);
	process.env[varname] = values[0];
}

function resolveEnvVars(config) {
	_.forOwn(config, function(value, key) {
		if (typeof(value) == 'string') {
			config[key] = value.replace(/\$\{(.+?)\}/gi, function(match, p1, offset, string) {
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