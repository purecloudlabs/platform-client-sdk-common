import fs from 'fs';
import childProcess from 'child_process';
import { Swagger , Definition, Property} from '../../../../modules/types/swagger';
export class CombineSwagger {
    internalSwagger: Swagger;
    newSwagger: Swagger;
    existingDefinitions : { [key: string]: Definition }[]=[];

    init() {
        try {

            const newSwaggerPath = process.argv[2]
            const internalSwaggerPath = process.argv[3]
            const saveNewSwaggerPath = process.argv[4];

            // Retrieve internal swagger
            if (fs.existsSync(internalSwaggerPath)) {
                console.log(`Loading internal swagger from disk: ${internalSwaggerPath}`)
                this.internalSwagger = JSON.parse(fs.readFileSync(internalSwaggerPath, 'utf8'))
            } else if (internalSwaggerPath.toLowerCase().startsWith('http')) {
                console.log(`Downloading internal swagger from: ${internalSwaggerPath}`)
                let file = this.downloadFile(internalSwaggerPath)
                this.internalSwagger = JSON.parse(file)
            } else {
                console.log(`Invalid internalSwaggerPath: ${internalSwaggerPath}`)
            }

            // Retrieve new swagger
            if (fs.existsSync(newSwaggerPath)) {
                console.log(`Loading new swagger from disk: ${newSwaggerPath}`)
                this.newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
            } else if (newSwaggerPath.toLowerCase().startsWith('http')) {
                console.log(`Downloading new swagger from: ${newSwaggerPath}`)
                this.newSwagger = JSON.parse(this.downloadFile(newSwaggerPath))
            } else {
                console.log(`Invalid newSwaggerPath: ${newSwaggerPath}`)
            }

            this.internalSwagger = this.processRefs(this.internalSwagger)
            this.newSwagger = this.processRefs(this.newSwagger)

            const webmessagingPath = "/api/v2/webmessaging/messages"
            delete this.newSwagger["basePath"]
            this.newSwagger["host"] = "api.mypurecloud.com"
            this.newSwagger["paths"][webmessagingPath] = this.internalSwagger["paths"][webmessagingPath]
            this.newSwagger["responses"] = this.internalSwagger["responses"]
            this.newSwagger["securityDefinitions"] = this.internalSwagger["securityDefinitions"]

            const responses = this.internalSwagger.paths[webmessagingPath].get.responses

            for (const responseValues of Object.values(responses)) {
                let responseValuesSchemaDefinition = responseValues["schema"]["$ref"].replace("#/definitions/", "")
                if (this.existingDefinitions !== undefined && this.existingDefinitions.includes(responseValuesSchemaDefinition))
                    continue

                this.newSwagger["definitions"][responseValuesSchemaDefinition] = this.internalSwagger.definitions[responseValuesSchemaDefinition]
                this.addDefinitions(this.internalSwagger.definitions[responseValuesSchemaDefinition])
                this.existingDefinitions.push(responseValuesSchemaDefinition)
            }

            if (saveNewSwaggerPath) {
                console.log(`Writing new swagger to ${saveNewSwaggerPath}`)
                fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(this.newSwagger))
            }


        } catch (err) {
            process.exitCode = 1;
            console.log(err);
        }
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