import fs from 'fs-extra';
import {Swagger} from '../../../../modules/types/swagger';

export class GenerateOperationIdMappings {
    init() {
		try {
            const swaggerPath: string = process.argv[2]
            const newSwaggerPath: string = process.argv[3]
            const saveOperationIdMappingsPath: string = process.argv[4]
        
            const swagger: Swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'))
            const newSwagger: Swagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
            const operationIdMappings = generateOperationIdMappings(swagger, newSwagger)
        
            if (saveOperationIdMappingsPath) {
                console.log(`Writing operationId mappings to ${saveOperationIdMappingsPath}`)
                fs.writeFileSync(saveOperationIdMappingsPath, JSON.stringify(operationIdMappings))
            }
        } catch (err) {
            process.exitCode = 1
            console.log(err)
        }
    }
    ;
}


function generateOperationIdMappings(swagger : Swagger, newSwagger: Swagger) {
	let operationIdMappings = {}
	for (const path of Object.keys(newSwagger['paths'])) {
        for (let method of Object.keys(newSwagger['paths'][path])) {
            operationIdMappings[swagger['paths'][path][method].operationId] = toCommand(path, newSwagger['paths'][path][method].operationId)
        }
    }

    return operationIdMappings
}

function toCommand(path: string, operationId: string) {
    return "gc " + separatePath(path).join(" ") + " " + operationId
}

function separatePath(path: string) {
	const pathParamRegex = /\{[a-zA-Z0-9]*\}/g
	const trailingSlashRegex = /\/$/g
	path = path.replace(pathParamRegex, "")
	path = processPath(path)
		.replace("/api/v2/", "")
		.replace(trailingSlashRegex, "")

	return path.split("/")
}

function processPath(path: string) { 
	path = path
        .replace("_", "/")
        .replace(/[\/]{2,}/g, "/")
        .replace("/api/v2/profiles/", "/api/v2/profile/")

    return path
}

// Call the method directly
const operationIdMappings = new GenerateOperationIdMappings();
operationIdMappings.init();