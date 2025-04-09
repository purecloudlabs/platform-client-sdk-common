import fs from 'fs';
import childProcess from 'child_process';
import { Swagger , Definition, Property, ProduceElement, ItemsType} from '../../../../modules/types/swagger';

export class CombineSwagger {
    internalSwagger: Swagger;
    newSwagger: Swagger;
    existingDefinitions : { [key: string]: Definition }[]=[];

    init() {
        try {

            const newSwaggerPath = process.argv[2];
            const internalSwaggerPath = process.argv[3];
            const saveNewSwaggerPath = process.argv[4];

            // Retrieve internal swagger
            if (fs.existsSync(internalSwaggerPath)) {
                console.log(`Loading internal swagger from disk: ${internalSwaggerPath}`);
                this.internalSwagger = JSON.parse(fs.readFileSync(internalSwaggerPath, 'utf8'));
            } else if (internalSwaggerPath.toLowerCase().startsWith('http')) {
                console.log(`Downloading internal swagger from: ${internalSwaggerPath}`);
                let file = this.downloadFile(internalSwaggerPath);
                this.internalSwagger = JSON.parse(file);
            } else {
                console.log(`Invalid internalSwaggerPath: ${internalSwaggerPath}`);
            }

            // Retrieve new swagger
            if (fs.existsSync(newSwaggerPath)) {
                console.log(`Loading new swagger from disk: ${newSwaggerPath}`);
                // Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
                let newSwaggerRaw: any = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
                if (newSwaggerRaw && newSwaggerRaw.openapi && newSwaggerRaw.openapi.startsWith("3")) {
                    this.newSwagger = this.convertToV2(newSwaggerRaw);
                } else {
                    this.newSwagger = newSwaggerRaw;
                }
            } else if (newSwaggerPath.toLowerCase().startsWith('http')) {
                console.log(`Downloading new swagger from: ${newSwaggerPath}`);
                // Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
                let newSwaggerRaw: any = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
                if (newSwaggerRaw && newSwaggerRaw.openapi && newSwaggerRaw.openapi.startsWith("3")) {
                    this.newSwagger = this.convertToV2(newSwaggerRaw);
                } else {
                    this.newSwagger = newSwaggerRaw;
                }
            } else {
                console.log(`Invalid newSwaggerPath: ${newSwaggerPath}`);
            }

            this.internalSwagger = this.processRefs(this.internalSwagger);
            this.newSwagger = this.processRefs(this.newSwagger);

            const webmessagingPath = "/api/v2/webmessaging/messages";
            delete this.newSwagger["basePath"];
            this.newSwagger["host"] = "api.mypurecloud.com";
            this.newSwagger["paths"][webmessagingPath] = this.internalSwagger["paths"][webmessagingPath];
            this.newSwagger["responses"] = this.internalSwagger["responses"];
            this.newSwagger["securityDefinitions"] = this.internalSwagger["securityDefinitions"];

            const responses = this.internalSwagger.paths[webmessagingPath].get.responses;

            for (const responseValues of Object.values(responses)) {
                let responseValuesSchemaDefinition = responseValues["schema"]["$ref"].replace("#/definitions/", "");
                if (this.existingDefinitions !== undefined && this.existingDefinitions.includes(responseValuesSchemaDefinition))
                    continue;

                this.newSwagger["definitions"][responseValuesSchemaDefinition] = this.internalSwagger.definitions[responseValuesSchemaDefinition];
                this.addDefinitions(this.internalSwagger.definitions[responseValuesSchemaDefinition]);
                this.existingDefinitions.push(responseValuesSchemaDefinition);
            }

            if (saveNewSwaggerPath) {
                console.log(`Writing new swagger to ${saveNewSwaggerPath}`);
                fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(this.newSwagger));
            }


        } catch (err) {
            process.exitCode = 1;
            console.log(err);
        }
    }

    convertToV2(swaggerV3 : any) {
        let swaggerV2: Swagger = {
            swagger: '2.0',
            host: '',
            info: {
                description: '',
                    version: '',
                    title: '',
                    contact: {
                        name: '',
                        url: '',
                        email: ''
                    }
            },
            externalDocs: {
                description: '',
                url: ''
            },
            consumes: [ProduceElement.ApplicationJSON],
            produces: [ProduceElement.ApplicationJSON],
            tags: [],
            definitions: {},
            paths: {},
            responses: {},
            schemes: [],
            securityDefinitions: {}
        };
        swaggerV2["basePath"] = '/';
        swaggerV2["info"] = swaggerV3["info"];

        // At this time, web messaging specification only includes definitions/schemas (no API operation)
		// We only take care of the schemas (v3) to definitions migration (v2)
		if (swaggerV3 && swaggerV3.components && swaggerV3.components.schemas) {
            // Change #/components/schemas/ to #/definitions/ using string replace
			let allSwaggerV3SchemasAsStr = JSON.stringify(swaggerV3.components.schemas);
            const regexConvertSchemas = /#\/components\/schemas\//g;
            allSwaggerV3SchemasAsStr = allSwaggerV3SchemasAsStr.replace(regexConvertSchemas, '#/definitions/');
            swaggerV2["definitions"] = JSON.parse(allSwaggerV3SchemasAsStr);

            // Clean unwanted attributes from the migrated schemas
			const keys = Object.keys(swaggerV2.definitions);
            keys.forEach((key, index) => {
                let obj: any = swaggerV2.definitions[key];
                if (obj) {
                    // Update "additionalProperties: { additionalProperties: true }"" and "additionalProperties: {}"" to "additionalProperties: true"
					if (obj && obj.additionalProperties && (typeof obj.additionalProperties == 'object') && obj.additionalProperties.additionalProperties && obj.additionalProperties.additionalProperties == true) {
                        obj.additionalProperties = true;
                    } else if (obj && obj.additionalProperties && (typeof obj.additionalProperties == 'object') && Object.keys(obj.additionalProperties).length == 0) {
                        obj.additionalProperties = true;
                    }
                    // anyOf not supported at definition level - update to generic { type: object }
					if (obj.hasOwnProperty("anyOf")) {
                        obj["type"] = ItemsType.Object;
                        delete obj["anyOf"];
                    }

                    if (obj && obj.properties) {
                        const keys = Object.keys(swaggerV2.definitions[key].properties);
                        keys.forEach((key2, index) => {
                            let obj2 = swaggerV2.definitions[key].properties[key2];
                            if (obj2) {
                                // Remove nullable attribute (not supported in v2)
								if (obj2.hasOwnProperty("nullable")) {
                                    delete obj2["nullable"];
                                }
                                // Remove anyOf attribute (not supported in v2)
								// Interpret as string (date, time) - [{"type": "string"},{"type": "number","format": "double"}]
								// Interpret as generic object otherwise
								if (obj2.hasOwnProperty("anyOf")) {
                                    if (obj2["anyOf"].length == 2) {
                                        if (obj2["anyOf"][0] && obj2["anyOf"][0].type && obj2["anyOf"][0].type == "string" &&
                                            obj2["anyOf"][1] && obj2["anyOf"][1].type && obj2["anyOf"][1].type == "number") {
                                            obj2["type"] = ItemsType.String;
                                        } else if (obj2["anyOf"][0] && obj2["anyOf"][0].type && obj2["anyOf"][0].type == "number" &&
                                            obj2["anyOf"][1] && obj2["anyOf"][1].type && obj2["anyOf"][1].type == "string") {
                                            obj2["type"] = ItemsType.String;
                                        } else {
                                            obj2["type"] = ItemsType.Object;
                                        }
                                    } else {
                                        obj2["type"] = ItemsType.Object;
                                    }
                                    delete obj2["anyOf"];
                                }
                                // Remove allOf with single element and replace with $ref
								// This is to facilitate swagger diff comparison
								if (obj2.hasOwnProperty("allOf")) {
									if (obj2["allOf"].length == 1) {
										if (obj2["allOf"][0]["$ref"]) {
											obj2["$ref"] = obj2["allOf"][0]["$ref"];
											delete obj2["allOf"];
										}
									}
								}
                            }
                        });
                    }
                }
            });
        }

        return swaggerV2;
    }

    addDefinitions(definitionBody:  Definition ) {
        let propertyValues;
        for (propertyValues of Object.values(definitionBody.properties)) {
            let responseValuesSchemaDefinition
            // Get definitions by ref from root level of object
            if (propertyValues["allOf"]) {
                responseValuesSchemaDefinition = propertyValues["allOf"][0]["$ref"].replace("#/definitions/", "")
                this.newSwagger["definitions"][responseValuesSchemaDefinition] = this.internalSwagger.definitions[responseValuesSchemaDefinition]
                this.existingDefinitions.push(responseValuesSchemaDefinition)
                this.addDefinitions(this.internalSwagger.definitions[responseValuesSchemaDefinition])
            }

            if (propertyValues["$ref"]) {
                responseValuesSchemaDefinition = propertyValues["$ref"].replace("#/definitions/", "")
                this.newSwagger["definitions"][responseValuesSchemaDefinition] = this.internalSwagger.definitions[responseValuesSchemaDefinition]
                this.existingDefinitions.push(responseValuesSchemaDefinition)
                this.addDefinitions(this.internalSwagger.definitions[responseValuesSchemaDefinition])
            }
    
            // Get definitions by ref from nested objects
            for (const propertyValueKeys of Object.keys(propertyValues)) {
                if (!propertyValues[propertyValueKeys]["$ref"])
                    continue
    
                responseValuesSchemaDefinition = propertyValues[propertyValueKeys]["$ref"].replace("#/definitions/", "")
                
                if (this.existingDefinitions !== undefined && this.existingDefinitions.includes(responseValuesSchemaDefinition))
                    continue
    
                let newDefinitionBody = this.internalSwagger.definitions[responseValuesSchemaDefinition]
                this.newSwagger["definitions"][responseValuesSchemaDefinition] = newDefinitionBody
    
                // Get definitions by ref from nested objects
                if (!propertyValues[propertyValueKeys]["$ref"])
                    continue
    
                let newResponseValuesSchemaDefinition = propertyValues.items["$ref"].replace("#/definitions/", "") 
                if (this.existingDefinitions !== undefined && this.existingDefinitions.includes(newResponseValuesSchemaDefinition))
                    continue
    
                this.existingDefinitions.push(newResponseValuesSchemaDefinition)
                this.addDefinitions(this.internalSwagger.definitions[newResponseValuesSchemaDefinition])
    
                this.existingDefinitions.push(responseValuesSchemaDefinition)
            }
        }
    }
    
    processRefs(swagger : Swagger) {
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
        return swagger;
    }
    
    downloadFile(url : string) {
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
        console.log('Failed to get contents for file!')
        return null
    }
}

// Call the method directly
const combineSwagger = new CombineSwagger();
combineSwagger.init();