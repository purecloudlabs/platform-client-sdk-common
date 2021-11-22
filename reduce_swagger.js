const fs = require('fs')
const childProcess = require('child_process')
const maxFileBufferSize = 1024 * 1024 * 1024
let definitions = new Set()

try {
    const newSwaggerPath = process.argv[2]
	const saveNewSwaggerPath = process.argv[3]
	const includedPaths = process.argv[4] || ""

	console.log("includedPaths", includedPaths.split(" "))
	
    let newSwagger = retrieveSwagger(newSwaggerPath)
    newSwagger = processSwagger(newSwagger, includedPaths.split(" "))

	if (saveNewSwaggerPath) {
		console.log(`Writing new swagger to ${saveNewSwaggerPath}`)
		fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger))
	}
} catch (err) {
	process.exitCode = 1
	console.log(err)
}

function processSwagger(swagger, paths) {
	let newPaths = {}
	let definitions = new Set()
    for (const path of Object.keys(swagger['paths'])) {
        for (const p of paths) {
            if (path.includes(p)) {
				newPaths[path] = swagger['paths'][path]

				for (const k1 of Object.keys(swagger['paths'][path])) {
					for (const k2 of Object.keys(swagger['paths'][path][k1]['responses'])) {
						if (swagger['paths'][path][k1]['responses'][k2]['schema'])
						if (swagger['paths'][path][k1]['responses'][k2]['schema']['$ref']) {
							const defName = swagger['paths'][path][k1]['responses'][k2]['schema']['$ref'].replace("#/definitions/", "")
							if (!definitions.has(defName)) {
								for (const def of getDefinitions(swagger, defName)) definitions.add(def)
							}
						}
					}
					for (const k3 of swagger['paths'][path][k1]['parameters']) {
						if (k3['schema'] !== undefined && k3['schema']['$ref'] !== undefined) {
							const defName = k3['schema']['$ref'].replace("#/definitions/", "")
							if (!definitions.has(defName)) {
								for (const def of getDefinitions(swagger, defName)) definitions.add(def)
							}
						}
					}
				}
			}
        }
	}
	swagger['paths'] = newPaths
	
	let newDefinitions = {}
	for (const definition of Object.keys(swagger['definitions'])) {
		if (definitions.has(definition)) {
			newDefinitions[definition] = swagger['definitions'][definition]
		}
	}
	swagger['definitions'] = newDefinitions

    return swagger
}


function getDefinitions(swagger, defName) {
	definitions.add(defName)

	if (swagger['definitions'][defName]['properties'] !== undefined) {
		for (const properties of Object.values(swagger['definitions'][defName]['properties'])) {
			if (properties['$ref']) {
				if (properties['$ref'].replace("#/definitions/", "") !== defName) {
					if (!definitions.has(properties['$ref'].replace("#/definitions/", ""))) {
						for (const def of getDefinitions(swagger, properties['$ref'].replace("#/definitions/", ""))) {
							definitions.add(def)
						}
					}
				}
			}
			if (properties['items'] && properties['items']['$ref']) {
				if (properties['items']['$ref'].replace("#/definitions/", "") !== defName) {
					if (!definitions.has(properties['items']['$ref'].replace("#/definitions/", ""))) {
						for (const def of getDefinitions(swagger, properties['items']['$ref'].replace("#/definitions/", ""))) {
							definitions.add(def)
						}
					}
				}
			}
		}
	}

	return definitions
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
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: maxFileBufferSize })
		if (!file || file === '') {
			console.log(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`)
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' })
		} else {
			return file
		}
	}
	throw 'Failed to get contents for file!'
}
