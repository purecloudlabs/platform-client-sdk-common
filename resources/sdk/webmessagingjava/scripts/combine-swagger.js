const fs = require('fs')
const childProcess = require('child_process')

const newSwaggerPath = process.argv[2]
const internalSwaggerPath = process.argv[3]
const saveNewSwaggerPath = process.argv[4]

let internalSwagger, newSwagger

// Retrieve internal swagger
if (fs.existsSync(internalSwaggerPath)) {
    console.log(`Loading internal swagger from disk: ${internalSwaggerPath}`)
    internalSwagger = JSON.parse(fs.readFileSync(internalSwaggerPath, 'utf8'))
} else if (internalSwaggerPath.toLowerCase().startsWith('http')) {
    console.log(`Downloading internal swagger from: ${internalSwaggerPath}`)
    let file = downloadFile(internalSwaggerPath)
    internalSwagger = JSON.parse(file)
} else {
    console.log(`Invalid internalSwaggerPath: ${internalSwaggerPath}`)
}

// Retrieve new swagger
if (fs.existsSync(newSwaggerPath)) {
    console.log(`Loading new swagger from disk: ${newSwaggerPath}`)
    newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
    console.log(`Downloading new swagger from: ${newSwaggerPath}`)
    newSwagger = JSON.parse(downloadFile(newSwaggerPath))
} else {
    console.log(`Invalid newSwaggerPath: ${newSwaggerPath}`)
}

const webmessagingPath = "/api/v2/webmessaging/deployments/{deploymentId}/sessions/{sessionId}/messages"
delete newSwagger["basePath"]
newSwagger["host"] = "api.mypurecloud.com"
newSwagger["paths"][webmessagingPath] = internalSwagger["paths"][webmessagingPath]
newSwagger["responses"] = internalSwagger["responses"]
newSwagger["securityDefinitions"] = internalSwagger["securityDefinitions"]

const responses = internalSwagger.paths[webmessagingPath].get.responses
let existingDefinitions = []
for (const responseValues of Object.values(responses)) {
    let responseValuesSchemaDefinition = responseValues["schema"]["$ref"].replace("#/definitions/", "")
    if (existingDefinitions.includes(responseValuesSchemaDefinition))
        continue
    
    newSwagger["definitions"][responseValuesSchemaDefinition] = internalSwagger.definitions[responseValuesSchemaDefinition]
    addDefinitions(internalSwagger.definitions[responseValuesSchemaDefinition])
    existingDefinitions.push(responseValuesSchemaDefinition)
}

function addDefinitions(definitionBody) {
    for (const propertyValues of Object.values(definitionBody.properties)) {
        let responseValuesSchemaDefinition
        // Get definitions by ref from root level of object
        if (propertyValues["$ref"]) {
            responseValuesSchemaDefinition = propertyValues["$ref"].replace("#/definitions/", "")
            newSwagger["definitions"][responseValuesSchemaDefinition] = internalSwagger.definitions[responseValuesSchemaDefinition]
            existingDefinitions.push(responseValuesSchemaDefinition)
            addDefinitions(internalSwagger.definitions[responseValuesSchemaDefinition])
        }

        // Get definitions by ref from nested objects
        for (const propertyValueKeys of Object.keys(propertyValues)) {
            if (!propertyValues[propertyValueKeys]["$ref"])
                continue

            responseValuesSchemaDefinition = propertyValues[propertyValueKeys]["$ref"].replace("#/definitions/", "")
            if (existingDefinitions.includes(responseValuesSchemaDefinition))
                continue

            let newDefinitionBody = internalSwagger.definitions[responseValuesSchemaDefinition]
            newSwagger["definitions"][responseValuesSchemaDefinition] = newDefinitionBody

            // Get definitions by ref from nested objects
            if (!propertyValues[propertyValueKeys]["$ref"])
                continue

            let newResponseValuesSchemaDefinition = propertyValues.items["$ref"].replace("#/definitions/", "")
            if (existingDefinitions.includes(newResponseValuesSchemaDefinition))
                continue

            existingDefinitions.push(newResponseValuesSchemaDefinition)
            addDefinitions(internalSwagger.definitions[newResponseValuesSchemaDefinition])

            existingDefinitions.push(responseValuesSchemaDefinition)
        }
    }
}

if (saveNewSwaggerPath) {
    console.log(`Writing new swagger to ${saveNewSwaggerPath}`)
    fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger))
}

function downloadFile(url) {
	var i = 0
	while (i < 10) {
		i++
		console.log(`Downloading file: ${url}`)
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 12 })
		if (!file || file === '') {
			console.log(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`)
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' })
		} else {
			return file
		}
	}
	console.log('Failed to get contents for file!')
	return null
}
