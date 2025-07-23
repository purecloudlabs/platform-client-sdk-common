import fs from 'fs-extra';
import child_process from 'child_process';
import { Swagger } from '../../../../modules/types/swagger';
import { ResourceDefinitions } from './resourceDefinitions';
import childProcess from 'child_process';
import log from '../../../../modules/log/logger';
const maxFileBufferSize = 1024 * 1024 * 1024;


export class PreProcessSwagger {
	init() {
		try {
				log.debug('PreProcessSwagger initialization started');
				const newSwaggerPath: string = process.argv[2];
				const saveNewSwaggerPath: string = process.argv[3];
				const saveSuperCommandsPath: string = process.argv[4];
				const saveResourceDefinitionsPath: string = process.argv[5];
				const overridesPath: string = process.argv[6];
				const previewSwaggerPath: string = process.argv[7];

				log.debug(`Command line arguments parsed: 
					newSwaggerPath=${newSwaggerPath}, 
					saveNewSwaggerPath=${saveNewSwaggerPath}, 
					saveSuperCommandsPath=${saveSuperCommandsPath}, 
					saveResourceDefinitionsPath=${saveResourceDefinitionsPath}, 
					overridesPath=${overridesPath}, 
					previewSwaggerPath=${previewSwaggerPath}`);

				log.debug('Retrieving swagger files');
				let newSwagger: Swagger = retrieveSwagger(newSwaggerPath, previewSwaggerPath);
				log.debug('Swagger files retrieved successfully');

				log.debug('Processing swagger references');
				newSwagger = processRefs(newSwagger);
				log.debug('Swagger references processed');

				log.debug(`Loading overrides file: overridesPath=${overridesPath}`);
				const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
				log.debug(`Overrides loaded: overrideCount=${Object.keys(overrides).length}`);

				log.debug('Creating resource definitions');
				const baseDefinitions = createDefinitions(newSwagger);
				const resourceDefinitions: ResourceDefinitions = overrideDefinitions(baseDefinitions, overrides);
				log.debug(`Resource definitions created: definitionCount=${Object.keys(resourceDefinitions).length}`);

				log.debug('Initial processing of definitions');
				let [superCommands, includedSwaggerPathObjects]: [Set<string>, Swagger["paths"]] = initialProcessOfDefinitions(newSwagger, resourceDefinitions);
				log.debug(`Initial processing completed: superCommandCount=${superCommands.size}, pathCount=${Object.keys(includedSwaggerPathObjects).length}`);

				log.debug('Processing definitions');
				newSwagger['paths'] = processDefinitions(includedSwaggerPathObjects, resourceDefinitions, newSwagger);
				log.debug('Definitions processing completed');

				if (saveNewSwaggerPath) {
					log.debug(`Writing processed swagger to file: saveNewSwaggerPath=${saveNewSwaggerPath}`);
					log.debug(`Writing new swagger to ${saveNewSwaggerPath}`);
					fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger));
					log.debug('New swagger file written successfully');
				}
				if (saveSuperCommandsPath) {
					log.debug(`Writing super commands to file: saveSuperCommandsPath=${saveSuperCommandsPath}, commandCount=${superCommands.size}`);
					log.debug(`Writing top level commands to ${saveSuperCommandsPath}`);
					fs.writeFileSync(saveSuperCommandsPath, JSON.stringify(Array.from(superCommands)));
					log.debug('Super commands file written successfully');
				}
				if (saveResourceDefinitionsPath) {
					log.debug(`Writing resource definitions to file: saveResourceDefinitionsPath=${saveResourceDefinitionsPath}`);
					log.debug(`Writing resource definitions commands to ${saveResourceDefinitionsPath}`);
					fs.writeFileSync(saveResourceDefinitionsPath, JSON.stringify(resourceDefinitions));
					log.debug('Resource definitions file written successfully');
				}
				log.debug('PreProcessSwagger completed successfully');
			} 
			catch (err) {
				log.debug(`PreProcessSwagger failed: error=${err instanceof Error ? err.message : err}, stack=${err instanceof Error ? err.stack : 'N/A'}`);
				process.exitCode = 1;
				log.error(err);
			}
	}
}


function processRefs(swagger: Swagger) {
	const keys = Object.keys(swagger.definitions);
	keys.forEach((key, index) => {
		let obj = swagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(swagger.definitions[key].properties);
			keys.forEach((key2, index) => {
				let obj2 = swagger.definitions[key].properties[key2];
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
	return swagger
}

function firstIndexOfCapital(str) {
	for (let i = 0; i < str.length; i++) {
		if (str[i] === str[i].toUpperCase()) {
			return i;
		}
	}
	return -1;
}

function processDefinitions(includedSwaggerPathObjects: Swagger["paths"], resourceDefinitions: ResourceDefinitions, newSwagger: Swagger) {
	let paths = {};
	for (const path of Object.keys(includedSwaggerPathObjects)) {
		// Override tags if possible
		for (let value of Object.values(includedSwaggerPathObjects[path])) {
			value['x-genesys-original-operation-id'] = value.operationId;
			if (value.operationId.startsWith("get")) {
				const successResponse = value.responses["200"]
				if (successResponse) {
					const schema = successResponse.schema['$ref'] || ''
					if (canPaginate(schema, newSwagger)) {
						value.operationId = "list"
						value.responses["200"].schema['$ref'] = "SWAGGER_OVERRIDE_list"
					} else if (canList(path, successResponse.schema, newSwagger)) {
						value.operationId = "list"
					}
				}
			}

			if (value.operationId !== "list") {
				value.operationId = value.operationId.substring(0, firstIndexOfCapital(value.operationId));
			}
			// post -> create
			// patch or put -> update (will cause a clash if a resource has both, this would have to be resolved by overriding one or both operationIds)
			value.operationId = value.operationId
				.replace(/^post/g, "create")
				.replace(/^patch|^put/g, "update");
			value.operationId = value.operationId.replace(/s*$/g, "");

			value['x-purecloud-category'] = value.tags[0];

			let commandName = resourceDefinitions[path].name || value.tags[0];
			commandName = commandName.toLowerCase().replace(' ', '');

			let supercommandList = resourceDefinitions[path].supercommand;
			if (supercommandList) commandName = `${supercommandList}_${commandName}`.replace(/\./g, "_")
			value.tags = [commandName];
			// Add description if possible
			if (!value.description.includes("SWAGGER_OVERRIDE") && resourceDefinitions[path].description)
				value.description = `SWAGGER_OVERRIDE_${resourceDefinitions[path].description}`;
			else
				value.description = "";
		}

		// Override operationId if possible
		for (const method of Object.keys(includedSwaggerPathObjects[path])) {
			if (!Object.keys(resourceDefinitions[path]).includes(method)) continue;
			if (resourceDefinitions[path][method].name !== undefined) {
				includedSwaggerPathObjects[path][method].operationId = `${resourceDefinitions[path][method].name}`;
			}
		}

		paths[path] = includedSwaggerPathObjects[path];
	}

	return paths;
}

function initialProcessOfDefinitions(newSwagger: Swagger, resourceDefinitions: ResourceDefinitions): [Set<string>, Swagger["paths"]] {
	let superCommands = new Set<string>();
	let includedSwaggerPathObjects: Swagger["paths"] = {};
	for (const path of Object.keys(newSwagger['paths'])) {
		if (Object.keys(resourceDefinitions).includes(path)) {
			includedSwaggerPathObjects[path] = newSwagger['paths'][path];

			for (let value of Object.values(includedSwaggerPathObjects[path])) {
				let commandName = resourceDefinitions[path].name || value.tags[0];
				commandName = commandName.toLowerCase().replace(' ', '');
				const supercommandList = resourceDefinitions[path].supercommand;
				if (!supercommandList) superCommands.add(commandName);
				else {
					const supercommandArray = supercommandList.split('.');
					superCommands.add(supercommandArray[0].toLowerCase());
				}
			}
		}
	}

	return [superCommands, includedSwaggerPathObjects];
}

function createDefinitions(swagger) {
	let definitions = {};

	for (const path of Object.keys(swagger['paths'])) {
		if (!path.startsWith("/api/v2")) continue;

		const name = getName(path),
			supercommand = getSuperCommand(path),
			description = getDescription(path)

		definitions[path] = {
			name: name,
			supercommand: supercommand,
			description: description
		}
	}

	return definitions
}

function separatePath(path) {
	const pathParamRegex = /\{[a-zA-Z0-9]*\}/g
	const trailingSlashRegex = /\/$/g
	path = path.replace(pathParamRegex, "")
	path = processPath(path)
		.replace("/api/v2/", "")
		.replace(trailingSlashRegex, "");

	return path.split("/")
}

function processPath(path) {
	return path
		.replace("_", "/")
		.replace(/[\/]{2,}/g, "/")
		.replace("/api/v2/documentation/", "/api/v2/documentationfile/")
		.replace("/api/v2/profiles/", "/api/v2/profile/")
}

function getName(path) {
	let names = separatePath(path)

	return names[names.length - 1].replace(/-/g, "")
}

function getSuperCommand(path) {
	let names = separatePath(path)
	names.pop()
	return names.join(".").replace(/-/g, "")
}

function getDescription(path) {
	return path.replace(/\{[a-zA-Z0-9]*\}$/g, "")
		.replace(/\/$/g, "")
}

function canPaginate(schema, newSwagger) {
	if (schema === '') return false
	const definitionName = schema.split("/").pop()

	const properties = newSwagger.definitions[definitionName].properties
	if (properties == undefined) return false

	return properties.pageNumber !== undefined
		|| properties.cursor !== undefined
		|| properties.nextUri !== undefined
		|| properties.startIndex !== undefined
}

function canList(path, successResponse, newSwagger) {
	if (!path.endsWith("s")) return false
	if (successResponse.type === "array") return true

	const schema = successResponse['$ref'] || ''
	if (schema === '') return false

	const definitionName = schema.split("/").pop()
	const properties = newSwagger.definitions[definitionName].properties
	if (properties == undefined) return false

	return definitionName.endsWith("List")
		|| properties.entities !== undefined
}

function overrideDefinitions(resourceDefinitions, overrides) {
	for (const path of Object.keys(resourceDefinitions)) {
		if (overrides[path]) {
			resourceDefinitions[path] = Object.assign(resourceDefinitions[path], overrides[path])
		}
	}
	return resourceDefinitions
}

function retrieveSwagger(newSwaggerPath: string, previewSwaggerPath: string) {
	log.debug('Starting swagger retrieval process');
	let newSwagger;
	let previewSwagger

	// Retrieve new swagger
	log.debug(`Retrieving main swagger file, ${newSwaggerPath}`);
	if (fs.existsSync(newSwaggerPath)) {
		log.debug('Loading swagger from local file system');
		log.debug(`Loading new swagger from disk: ${newSwaggerPath}`);
		newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
		log.debug('Local swagger file loaded successfully');
	} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
		log.debug('Downloading swagger from URL');
		log.debug(`Downloading new swagger from: ${newSwaggerPath}`);
		newSwagger = JSON.parse(downloadFile(newSwaggerPath));
		log.debug('Swagger download completed successfully');
	} else {
		log.debug(`Invalid swagger path provided', ${newSwaggerPath}`);
		throw `Invalid newSwaggerPath: ${newSwaggerPath}`;
	}

	// Check to see if preview swagger path is present. Internal builds do not need the preview swagger
	if (previewSwaggerPath) {
		log.debug(`Preview swagger path provided, retrieving preview swagger, ${previewSwaggerPath}`);
		// Retrieve preview swagger
		if (fs.existsSync(previewSwaggerPath)) {
			log.debug('Loading preview swagger from local file system');
			log.debug(`Loading preview swagger from disk: ${previewSwaggerPath}`);
			previewSwagger = JSON.parse(fs.readFileSync(previewSwaggerPath, 'utf8'));
			log.debug('Local preview swagger file loaded successfully');
		} else if (previewSwaggerPath.toLowerCase().startsWith('http')) {
			log.debug('Downloading preview swagger from URL');
			log.debug(`Downloading preview swagger from: ${previewSwaggerPath}`);
			previewSwagger = JSON.parse(downloadFile(previewSwaggerPath));
			log.debug('Preview swagger download completed successfully');
		} else {
			log.debug(`Invalid preview swagger path provided', ${previewSwaggerPath}`);
			throw `Invalid previewSwaggerPath: ${previewSwaggerPath}`;
		}

		// Add the preview swagger and the public swagger together to create the full new swagger
		log.debug('Combining public and preview swagger files');
		newSwagger = combineSwagger(newSwagger, previewSwagger);
		log.debug('Swagger files combined successfully');
	} else {
		log.debug('No preview swagger path provided, using only main swagger');
	}

	return newSwagger;
}

// This function will combine the public swagger with the preview swagger
function combineSwagger(publicSwagger: Swagger, preview: Swagger) {
	// Set new file equal to public file for now
	let newSwaggerFile = publicSwagger;

	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	preview.tags.forEach((previewTag) => {
		let duplicate = publicSwagger.tags.some((publicTag) => publicTag.name === previewTag.name);
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
	let publicPaths = Object.keys(publicSwagger.paths);
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
	let publicDefinitions = Object.keys(publicSwagger.definitions);
	for (let i = 0; i < previewDefinitions.length; i++) {
		if (!publicDefinitions.includes(previewDefinitions[i])) {
			newSwaggerFile.definitions[previewDefinitions[i]] = preview.definitions[previewDefinitions[i]];
		}
	}

	return newSwaggerFile
}

function downloadFile(url: string) {
	var i = 0;
	while (i < 10) {
		i++;
		log.debug(`Downloading file: ${url}`);
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: maxFileBufferSize });
		if (!file || file === '') {
			log.debug(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`);
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' });
		} else {
			return file;
		}
	}
	throw 'Failed to get contents for file!';
}


// Call the method directly
log.debug('Starting PreProcessSwagger script execution');
const preProcessSwagger = new PreProcessSwagger();
preProcessSwagger.init();
log.debug('PreProcessSwagger script execution completed');