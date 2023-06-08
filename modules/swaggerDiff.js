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

SwaggerDiff.prototype.getAndDiff = function(oldSwaggerPath, newSwaggerPath, previewSwaggerPath ,saveOldSwaggerPath, saveNewSwaggerPath) {
	let oldSwagger, newSwagger, previewSwagger;

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

	log.debug(`Old swagger length: ${(JSON.stringify(oldSwagger) || []).length}`);

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

	// Check to see if preview swagger path is present. Internal builds do not need the preview swagger
	if (previewSwaggerPath){
		// Retrieve preview swagger
		if (fs.existsSync(previewSwaggerPath)) {
			log.info(`Loading preview swagger from disk: ${previewSwaggerPath}`);
			previewSwagger = JSON.parse(fs.readFileSync(previewSwaggerPath, 'utf8'));
		} else if (previewSwaggerPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading preview swagger from: ${previewSwaggerPath}`);
			previewSwagger = JSON.parse(downloadFile(previewSwaggerPath));
		} else {
			log.warn(`Invalid newSwaggerPath: ${previewSwaggerPath}`);
		}

		// Add the preview swagger and the public swagger together to create the full new swagger
		newSwagger = combineSwagger(newSwagger, previewSwagger);
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

function downloadFile(url) {
	var i = 0;
	while (i < 10) {
		i++;
		log.info(`Downloading file: ${url}`);
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 });
		if (!file || file === '') {
			log.info(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`);
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' });
		} else {
			return file;
		}
	}
	log.warn('Failed to get contents for file!');
	return null;
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

// This function will combine the public swagger with the preview swagger
function combineSwagger(public, preview){
	log.info('Combining public and preview swagger docs into one');
	
	// Set new file equal to public file for now
	let newSwaggerFile = public;

	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	preview.tags.forEach((previewTag) => {
		let duplicate = public.tags.some((publicTag) => publicTag.name === previewTag.name);
		if (!duplicate) {
			newSwaggerFile.tags.push(previewTag);
		}
	});

	// mark preview paths as preview(similar to marking as deprecated)
	for (const [key1, value1] of Object.entries(preview.paths)) {
		for (const [key, value] of Object.entries(value1)) {
			preview.paths[key1][key]['x-genesys-preview'] = true;
		}
	}

	// Search for paths in the preview swagger not in the public swagger(should be all paths) and add preview paths to new JSON object
	let previewPaths = Object.keys(preview.paths);
	let publicPaths = Object.keys(public.paths);
	for (let i = 0; i < previewPaths.length; i++) {
		if (publicPaths.includes(previewPaths[i])) {
			// Path does exist in public swagger, add the preview HTTP method to the existing path in the new JSON object
			for (const [key, value] of Object.entries(preview.paths[previewPaths[i]])) {
				newSwaggerFile.paths[previewPaths[i]][key] = value;
			}
		} else {
			// Path does not exist in public swagger, add the preview path to the new JSON objects paths
			newSwaggerFile.paths[previewPaths[i]] = preview.paths[previewPaths[i]];
		}
	}

	// Search for definitions in the preview swagger not in the public swagger and add preview definitions to new JSON object
	let previewDefinitions = Object.keys(preview.definitions);
	let publicDefinitions = Object.keys(public.definitions);
	for (let i = 0; i < previewDefinitions.length; i++) {
		if (!publicDefinitions.includes(previewDefinitions[i])) {
			newSwaggerFile.definitions[previewDefinitions[i]] = preview.definitions[previewDefinitions[i]];
		}
	}

	return newSwaggerFile
}
