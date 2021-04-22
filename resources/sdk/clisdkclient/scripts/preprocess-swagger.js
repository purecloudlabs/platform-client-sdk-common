const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const utils = require('./utilities');
const maxFileBufferSize = 1024 * 1024 * 1024;

try {
	const newSwaggerPath = process.argv[2];
	const saveNewSwaggerPath = process.argv[3];
	const saveSuperCommandsPath = process.argv[4];
	const saveResourceDefinitionsPath = process.argv[5];

	let newSwagger = retrieveSwagger(newSwaggerPath);
	const overridesPath = path.join(path.dirname(require.main.filename), '../resources/resourceDefinitions.json');
	const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
	const resourceDefinitions = overrideDefinitions(createDefinitions(newSwagger), overrides)
	let [superCommands, includedSwaggerPathObjects] = initialProcessOfDefinitions(newSwagger, resourceDefinitions);
	newSwagger['paths'] = processDefinitions(includedSwaggerPathObjects, resourceDefinitions, newSwagger);

	if (saveNewSwaggerPath) {
		console.log(`Writing new swagger to ${saveNewSwaggerPath}`);
		fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger));
	}
	if (saveSuperCommandsPath) {
		console.log(`Writing top level commands to ${saveSuperCommandsPath}`);
		fs.writeFileSync(saveSuperCommandsPath, JSON.stringify(Array.from(superCommands)));
	}

	if (saveResourceDefinitionsPath) {
		console.log(`Writing resource definitions commands to ${saveResourceDefinitionsPath}`);
		fs.writeFileSync(saveResourceDefinitionsPath, JSON.stringify(resourceDefinitions));
	}
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}

function processDefinitions(includedSwaggerPathObjects, resourceDefinitions, newSwagger) {
	let paths = {};
	for (const path of Object.keys(includedSwaggerPathObjects)) {
		// Override tags if possible
		for (let value of Object.values(includedSwaggerPathObjects[path])) {
			if (value.operationId.startsWith("get")) {
				console.log("PATH", path)
				const successResponse = value.responses["200"]
				if (successResponse) {
					const schema = successResponse.schema['$ref'] || ''
					if (canPanginate(schema, newSwagger)) {
						value.operationId = "SWAGGER_OVERRIDE_list"
						value.responses["200"].schema['$ref'] = "SWAGGER_OVERRIDE_list"
					} else if (canList(path, successResponse.schema, newSwagger)) {
						value.operationId = "SWAGGER_OVERRIDE_list"
					}
				}
			}

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
				includedSwaggerPathObjects[path][method].operationId = `SWAGGER_OVERRIDE_${resourceDefinitions[path][method].name}`;
			}
		}

		paths[path] = includedSwaggerPathObjects[path];
	}

	return paths;
}

function initialProcessOfDefinitions(newSwagger, resourceDefinitions) {
	let superCommands = new Set();
	let includedSwaggerPathObjects = {};
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
		const name = getName(path),
			supercommand = getSuperCommand(path),
			description = getDescription(path, supercommand)

        definitions[path] = {
            name: name,
			supercommand: supercommand,
			description: description
        }
    }

    return definitions
}

function separatePath(path) {
    const pathParamRegex = /\{[a-zA-Z]*\}/g
    const trailingSlashRegex = /\/$/g
	path = path.replace(pathParamRegex, "")
	path = utils.processPath(path)
		.replace("/api/v2/", "")
		.replace(trailingSlashRegex, "");

			// .replace("/api/v2/documentation/", "/api/v2/documentationfile/")
			// .replace("/api/v2/profiles/", "/api/v2/profile/")
			// .replace("/api/v2/", "")
            
			// .replace(/[\/]{2,}/g, "/")
			
	
	console.log("separatePath", path)

    return path.split("/")
}

function getName(path) {
    let names = separatePath(path)

    return names[names.length -1]
}

function getSuperCommand(path) {
    let names = separatePath(path)
    names.pop()
    return names.join(".")
}

function getDescription(path, supercommand) {
	// return `/api/v2/${supercommand.replace(/\./g, "/")}/${name}/`
	// 	.replace(/[\/]{2,}/g, "/")
	// 	.replace("documentationfile", "documentation")
	// 	.replace("/api/v2/profile", "/api/v2/profiles")
	path = path.replace(/\{[a-zA-Z]*\}$/g, "")
		.replace(/\/$/g, "")
	// if (!path.endsWith("/"))
		// path = `${path}/`
	return `${path}`

	// let name = getName(path)
	// let description = `/api/v2/${supercommand.replace(/\./g, "/")}/${name}`

	// description = utils.processPath(description)
	// 	.replace("documentationfile", "documentation")

	// if (path.includes("/{"))
	// 	return `${description} ${path}`
	// return description
}

function canPanginate(schema, newSwagger) {
	if (schema === '') return false
	const definitionName = schema.split("/").pop()
	// TODO check for other pagination forms
	return newSwagger.definitions[definitionName].properties.pageNumber !== undefined 
			|| newSwagger.definitions[definitionName].properties.cursor !== undefined
			|| newSwagger.definitions[definitionName].properties.nextUri !== undefined
			|| newSwagger.definitions[definitionName].properties.startIndex !== undefined
}

function canList(path, successResponse, newSwagger) {
	if (!path.endsWith("s")) return false
	if (successResponse.type === "array") return true

	const schema = successResponse['$ref'] || ''
	if (schema === '') return false

	const definitionName = schema.split("/").pop()
	return definitionName.endsWith("List")
			|| newSwagger.definitions[definitionName].properties.entities !== undefined
}

function overrideDefinitions(resourceDefinitions, overrides) {
	for (const path of Object.keys(resourceDefinitions)) {
		if (overrides[path]) {
			resourceDefinitions[path] = Object.assign(resourceDefinitions[path], overrides[path])
		}
	}
	return resourceDefinitions
}

function retrieveSwagger(newSwaggerPath) {
	let newSwagger;
	// Retrieve new swagger
	if (fs.existsSync(newSwaggerPath)) {
		console.log(`Loading new swagger from disk: ${newSwaggerPath}`);
		newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
	} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
		console.log(`Downloading new swagger from: ${newSwaggerPath}`);
		newSwagger = JSON.parse(downloadFile(newSwaggerPath));
	} else {
		throw `Invalid newSwaggerPath: ${newSwaggerPath}`;
	}

	return newSwagger;
}

function downloadFile(url) {
	var i = 0;
	while (i < 10) {
		i++;
		console.log(`Downloading file: ${url}`);
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: maxFileBufferSize });
		if (!file || file === '') {
			console.log(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`);
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' });
		} else {
			return file;
		}
	}
	throw 'Failed to get contents for file!';
}
