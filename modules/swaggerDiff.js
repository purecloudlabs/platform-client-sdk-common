const fs = require('fs');
const childProcess = require('child_process');

const log = require('./logger');
const swaggerDiffImpl = require('./swaggerDiffImpl');

/* CONSTRUCTOR */

function SwaggerDiff() {}

/* PUBLIC PROPERTIES */

SwaggerDiff.prototype.changes = {};
SwaggerDiff.prototype.changeCount = 0;
SwaggerDiff.prototype.swaggerInfo = {};
// When [true], considers certain changes to be major changes instead of minor because they're breaking for SDKs
SwaggerDiff.prototype.useSdkVersioning = false;
SwaggerDiff.prototype.oldSwagger = {};
SwaggerDiff.prototype.newSwagger = {};

/* PUBLIC FUNCTIONS */

SwaggerDiff.prototype.getAndDiff = function(oldSwaggerPath, newSwaggerPath, saveOldSwaggerPath, saveNewSwaggerPath) {
	let oldSwagger, newSwagger;

	// Retrieve old swagger
	if (fs.existsSync(oldSwaggerPath)) {
		log.info(`Loading old swagger from disk: ${oldSwaggerPath}`);
		oldSwagger = JSON.parse(fs.readFileSync(oldSwaggerPath, 'utf8'));
	} else if (oldSwaggerPath.toLowerCase().startsWith('http')) {
		log.info(`Downloading old swagger from: ${oldSwaggerPath}`);
		oldSwagger = JSON.parse(downloadFile(oldSwaggerPath));
	} else {
		log.warn(`Invalid oldSwaggerPath: ${oldSwaggerPath}`);
	}

	log.debug(`Old swagger length: ${JSON.stringify(oldSwagger).length}`);

	// Retrieve new swagger
	if (fs.existsSync(newSwaggerPath)) {
		log.info(`Loading new swagger from disk: ${newSwaggerPath}`);
		newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
	} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
		log.info(`Downloading new swagger from: ${newSwaggerPath}`);
		newSwagger = JSON.parse(downloadFile(newSwaggerPath));
	} else {
		log.warn(`Invalid newSwaggerPath: ${newSwaggerPath}`);
	}

	log.debug(`New swagger length: ${JSON.stringify(newSwagger).length}`);

	// Save files to disk
	if (saveOldSwaggerPath) {
		log.info(`Writing old swagger to ${saveOldSwaggerPath}`);
		fs.writeFileSync(saveOldSwaggerPath, JSON.stringify(oldSwagger));
	}
	if (saveNewSwaggerPath) {
		log.info(`Writing new swagger to ${saveNewSwaggerPath}`);
		fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger));
	}

	// Diff swaggers
	this.diff(oldSwagger, newSwagger);
};

SwaggerDiff.prototype.diff = function(oldSwagger, newSwagger) {
	copyPropertiesToImpl();

	// Diff
	let retval = swaggerDiffImpl.diff(oldSwagger, newSwagger);

	// Set vars from diff impl
	this.changeCount = swaggerDiffImpl.changeCount;
	this.changes = swaggerDiffImpl.changes;
	this.oldSwagger = swaggerDiffImpl.oldSwagger;
	this.newSwagger = swaggerDiffImpl.newSwagger;
	this.swaggerInfo = swaggerDiffImpl.swaggerInfo;

	return retval;
};

SwaggerDiff.prototype.generateReleaseNotes = function(template, data) {
	copyPropertiesToImpl();

	let templateString = template;
	if (fs.existsSync(template) === true) {
		templateString = fs.readFileSync(template, 'utf8');
	}

	return swaggerDiffImpl.generateReleaseNotes(templateString, data);
};

SwaggerDiff.prototype.incrementVersion = function(version) {
	var forceMajor = getEnv('INCREMENT_MAJOR', false, true);
	var forceMinor = getEnv('INCREMENT_MINOR', false, true);
	var forcePoint = getEnv('INCREMENT_POINT', false, true);
	if (forceMajor === true) log.info('Forcing major release!');
	if (forceMinor === true) log.info('Forcing minor release!');
	if (forcePoint === true) log.info('Forcing point release!');

	copyPropertiesToImpl();

	return swaggerDiffImpl.incrementVersion(version, forceMajor, forceMinor, forcePoint);
};

SwaggerDiff.prototype.stringifyVersion = function(version, includePrerelease) {
	copyPropertiesToImpl();

	return swaggerDiffImpl.stringifyVersion(version, includePrerelease);
};

/* EXPORT MODULE */

var self = (module.exports = new SwaggerDiff());

/* PRIVATE FUNCTIONS */

function copyPropertiesToImpl() {
	// Set properties on impl object just to be safe
	swaggerDiffImpl.changes = self.changes;
	swaggerDiffImpl.changeCount = self.changeCount;
	swaggerDiffImpl.swaggerInfo = self.swaggerInfo;
	swaggerDiffImpl.useSdkVersioning = self.useSdkVersioning;
	swaggerDiffImpl.oldSwagger = self.oldSwagger;
	swaggerDiffImpl.newSwagger = self.newSwagger;
}

var downloadFile = function(url, dest, cb) {
	var file = fs.createWriteStream(dest);
	http.get(url, function(response) {
	  	response.pipe(file);
	  	file.on('finish', function() {
			file.close(cb);
	  	});
	}).on('error', function(err) {
	  	fs.unlink(dest);
	  	if (cb) cb(err.message);
	});
};

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
