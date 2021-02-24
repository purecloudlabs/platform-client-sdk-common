const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

try {
	const newSwaggerPath = process.argv[2]
	const saveNewSwaggerPath = process.argv[3]
	const saveDuplicateMappingsPath = process.argv[4]
	const saveSuperCommandsPath = process.argv[5]

	let newSwagger = retrieveSwagger(newSwaggerPath)
	const definitionsPath = path.join(path.dirname(require.main.filename), "../resources/resourceDefinitions.json")
	const resourceDefinitions = JSON.parse(fs.readFileSync(definitionsPath, 'utf8'))

	let [superCommands, includedSwaggerPathObjects] = initialProcessOfDefinitions(newSwagger, resourceDefinitions)
	let duplicateCommandMappings = findDuplicateCommandMappings(superCommands, includedSwaggerPathObjects, resourceDefinitions)
	newSwagger["paths"] = processDefinitions(duplicateCommandMappings, includedSwaggerPathObjects, resourceDefinitions)

	if (saveNewSwaggerPath) {
		console.log(`Writing new swagger to ${saveNewSwaggerPath}`)
		fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger))
	}

	if (saveDuplicateMappingsPath) {
		console.log(`Writing duplicate mappings to ${saveDuplicateMappingsPath}`)
		// from https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
		const mapToObj = m => {
			return Array.from(m).reduce((obj, [key, value]) => {
				obj[key] = value
				return obj
			}, {})
		}
		fs.writeFileSync(saveDuplicateMappingsPath, JSON.stringify(mapToObj(duplicateCommandMappings)))
	}

	if (saveSuperCommandsPath) {
		console.log(`Writing top level commands to ${saveSuperCommandsPath}`)
		fs.writeFileSync(saveSuperCommandsPath, JSON.stringify(Array.from(superCommands)))
	}
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}

function processDefinitions(duplicateCommandMappings, includedSwaggerPathObjects, resourceDefinitions) {
	let paths = {}
	for (const path of Object.keys(includedSwaggerPathObjects)) {
		// Override tags if possible
		for (let value of Object.values(includedSwaggerPathObjects[path])) {
			let commandName = resourceDefinitions[path].name || value.tags[0]
			commandName = commandName.toLowerCase().replace(" ", "")

			const supercommand = resourceDefinitions[path].supercommand
			if (supercommand) {
				// Custom commandName if it's a duplicate
				if (duplicateCommandMappings.get(`${commandName}_${supercommand}`)) {
					commandName = `${commandName}_${supercommand}`
				}
			}
			value.tags = [commandName]
		}

		// Override operationId if possible
		for (const method of Object.keys(includedSwaggerPathObjects[path])) {
			if (!Object.keys(resourceDefinitions[path]).includes(method)) continue
			if (resourceDefinitions[path][method].name !== undefined) {
				includedSwaggerPathObjects[path][method].operationId = `SWAGGER_OVERRIDE_${resourceDefinitions[path][method].name}`
			}
		}

		// Exclude HTTP methods if possible
		let includedMethods = []
		const httpMethods = ["get", "delete", "put", "patch", "post"]
		for (const httpMethod of Object.keys(resourceDefinitions[path])) {
			if (!httpMethods.includes(httpMethod)) continue
			includedMethods.push(httpMethod)
		}

		paths[path] = {}
		if (includedMethods.length > 0) {
			for (const method of includedMethods) {
				paths[path][method] = includedSwaggerPathObjects[path][method]
			}
		} else {
			paths[path] = includedSwaggerPathObjects[path]
		}
	}

	return paths
}

function findDuplicateCommandMappings(superCommands, includedSwaggerPathObjects, resourceDefinitions) {
	let duplicateCommandMappings = new Map()
	for (const path of Object.keys(includedSwaggerPathObjects)) {
		for (let value of Object.values(includedSwaggerPathObjects[path])) {
			let commandName = resourceDefinitions[path].name || value.tags[0]
			commandName = commandName.toLowerCase().replace(" ", "")

			const supercommand = resourceDefinitions[path].supercommand
			// Only need to work on duplicate subcommands, no one would try to create 2 `gc users` commands for example
			if (supercommand) {
				const existingCommandName = duplicateCommandMappings.get(commandName)
				// Duplicate found
				if (superCommands.has(commandName) || (existingCommandName && existingCommandName !== supercommand)) {
					duplicateCommandMappings.set(`${commandName}_${existingCommandName}`, existingCommandName)
					commandName = `${commandName}_${supercommand}`
				}
				duplicateCommandMappings.set(commandName, supercommand)
			}
		}
	}

	// Remove all non-duplicates from the mappings now
	duplicateCommandMappings.forEach((values, keys)=> {
		if (!keys.includes("_"))
			duplicateCommandMappings.delete(keys)
	})

	return duplicateCommandMappings
}

function initialProcessOfDefinitions(newSwagger, resourceDefinitions) {
	let superCommands = new Set()
	let includedSwaggerPathObjects = {}
	for (const path of Object.keys(newSwagger["paths"])) {
		if (Object.keys(resourceDefinitions).includes(path)) {
			includedSwaggerPathObjects[path] = newSwagger["paths"][path]

			for (let value of Object.values(includedSwaggerPathObjects[path])) {
				let commandName = resourceDefinitions[path].name || value.tags[0]
				commandName = commandName.toLowerCase().replace(" ", "")
				const supercommand = resourceDefinitions[path].supercommand
				if (!supercommand)
					superCommands.add(commandName)
				else
					superCommands.add(supercommand.toLowerCase())
			}
		}
	}

	return [superCommands, includedSwaggerPathObjects]
}

function retrieveSwagger(newSwaggerPath) {
	let newSwagger
	// Retrieve new swagger
	if (fs.existsSync(newSwaggerPath)) {
		console.log(`Loading new swagger from disk: ${newSwaggerPath}`)
		newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
	} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
		console.log(`Downloading new swagger from: ${newSwaggerPath}`)
		newSwagger = JSON.parse(downloadFile(newSwaggerPath))
	} else {
		throw `Invalid newSwaggerPath: ${newSwaggerPath}`
	}

	return newSwagger
}

function downloadFile(url) {
	var i = 0
	while (i < 10) {
		i++
		console.log(`Downloading file: ${url}`)
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 })
		if (!file || file === '') {
			console.log(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`)
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' })
		} else {
			return file
		}
	}
	throw 'Failed to get contents for file!'
}
