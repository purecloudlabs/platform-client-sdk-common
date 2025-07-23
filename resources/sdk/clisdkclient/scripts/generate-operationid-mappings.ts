import fs from 'fs-extra';
import { Swagger } from '../../../../modules/types/swagger';
import log from '../../../../modules/log/logger';

export class GenerateOperationIdMappings {
    init() {
        try {
            log.debug('GenerateOperationIdMappings initialization started');
            const swaggerPath: string = process.argv[2]
            const newSwaggerPath: string = process.argv[3]
            const saveOperationIdMappingsPath: string = process.argv[4]

            log.debug(`Command line arguments parsed - swaggerPath: ${swaggerPath}, newSwaggerPath: ${newSwaggerPath}, saveOperationIdMappingsPath: ${saveOperationIdMappingsPath}`);

            // Validate file paths
            if (!fs.existsSync(swaggerPath)) {
                log.error(`Swagger file not found: ${swaggerPath}`);
                throw new Error(`Swagger file not found: ${swaggerPath}`);
            }
            if (!fs.existsSync(newSwaggerPath)) {
                log.error(`New swagger file not found: ${newSwaggerPath}`);
                throw new Error(`New swagger file not found: ${newSwaggerPath}`);
            }

            log.debug('Loading swagger files');
            const swagger: Swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'))
            const newSwagger: Swagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
            log.debug('Swagger files loaded successfully');

            log.debug('Generating operation ID mappings');
            const operationIdMappings = generateOperationIdMappings(swagger, newSwagger)
            log.debug(`Operation ID mappings generated - count: ${Object.keys(operationIdMappings).length}`);

            if (saveOperationIdMappingsPath) {
                log.debug(`Writing operation ID mappings to file: ${saveOperationIdMappingsPath}`);
                log.info(`Writing operationId mappings to ${saveOperationIdMappingsPath}`)
                fs.writeFileSync(saveOperationIdMappingsPath, JSON.stringify(operationIdMappings))
                log.debug('Operation ID mappings file written successfully');
            } else {
                log.debug('No save path provided, skipping file write');
            }
            log.info('GenerateOperationIdMappings completed successfully');
        } catch (err) {
            log.error(`GenerateOperationIdMappings failed: ${err instanceof Error ? err.message : err}`);
            if (err instanceof Error && err.stack) {
                log.debug(`Stack trace: ${err.stack}`);
            }
            process.exitCode = 1
        }
    }
    ;
}


function generateOperationIdMappings(swagger: Swagger, newSwagger: Swagger) {
    log.debug('Starting operation ID mappings generation');
    let operationIdMappings = {}
    let processedCount = 0;
    
    for (const path of Object.keys(newSwagger['paths'])) {
        log.debug(`Processing path: ${path}`);
        for (let method of Object.keys(newSwagger['paths'][path])) {
            const oldOperationId = swagger['paths'][path][method].operationId;
            const newOperationId = newSwagger['paths'][path][method].operationId;
            const command = toCommand(path, newOperationId);
            
            operationIdMappings[oldOperationId] = command;
            processedCount++;
            
            log.debug(`Mapped operation ID - path: ${path}, method: ${method}, old: ${oldOperationId}, new: ${newOperationId}, command: ${command}`);
        }
    }

    log.debug(`Operation ID mappings generation completed - total mappings: ${processedCount}`);
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
log.info('Starting GenerateOperationIdMappings script execution');
const operationIdMappings = new GenerateOperationIdMappings();
operationIdMappings.init();
log.info('GenerateOperationIdMappings script execution completed');