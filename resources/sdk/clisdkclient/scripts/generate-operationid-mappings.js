const fs = require('fs')

try {
    const swaggerPath = process.argv[2]
    const newSwaggerPath = process.argv[3]
    const saveOperationIdMappingsPath = process.argv[4]

    const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'))
    const newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
    const operationIdMappings = generateOperationIdMappings(swagger, newSwagger)

    if (saveOperationIdMappingsPath) {
		console.log(`Writing operationId mappings to ${saveOperationIdMappingsPath}`)
		fs.writeFileSync(saveOperationIdMappingsPath, JSON.stringify(operationIdMappings))
	}
} catch (err) {
	process.exitCode = 1
	console.log(err)
}

function generateOperationIdMappings(swagger, newSwagger) {
	let operationIdMappings = {}
	for (const path of Object.keys(newSwagger['paths'])) {
        for (let method of Object.keys(newSwagger['paths'][path])) {
            operationIdMappings[swagger['paths'][path][method].operationId] = toCommand(path, newSwagger['paths'][path][method].operationId)
        }
    }

    return operationIdMappings
}

function toCommand(path, operationId) {
    return "gc " + separatePath(path).join(" ") + " " + operationId
}

function separatePath(path) {
	const pathParamRegex = /\{[a-zA-Z0-9]*\}/g
	const trailingSlashRegex = /\/$/g
	path = path.replace(pathParamRegex, "")
	path = processPath(path)
		.replace("/api/v2/", "")
		.replace(trailingSlashRegex, "")

	return path.split("/")
}

function processPath(path) { 
	path = path
        .replace("_", "/")
        .replace(/[\/]{2,}/g, "/")
        .replace("/api/v2/profiles/", "/api/v2/profile/")

    return path
}