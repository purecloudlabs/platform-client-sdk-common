const fs = require('fs');
const _ = require('lodash');
const childProcess = require('child_process');
const dot = require('dot');
const pluralize = require('pluralize');
const sleep = require('sleep');

const log = require('./logger');


/* PRIVATE VARS */

const IMPACT_MAJOR = 'major';
const IMPACT_MINOR = 'minor';
const IMPACT_POINT = 'point';
const LOCATION_OPERATION = 'operation';
const LOCATION_PARAMETER = 'parameter';
const LOCATION_RESPONSE = 'response';
const LOCATION_TAG = 'tag';
const LOCATION_MODEL = 'model';
const LOCATION_PROPERTY = 'property';
const LOCATION_PATH = 'path';


/* TYPE EXTENSIONS */

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.pushApply = function(arr) {
    this.push.apply(this, arr);
};


/* CONSTRUCTOR */

function SwaggerDiff() {
    dot.templateSettings.strip = false;
}


/* PUBLIC PROPERTIES */

SwaggerDiff.prototype.changes = {};
SwaggerDiff.prototype.changeCount = 0;
SwaggerDiff.prototype.swaggerInfo = {};
// When [true], considers certain changes to be major changes instead of minor because they're breaking for SDKs
SwaggerDiff.prototype.useSdkVersioning = false;
SwaggerDiff.prototype.oldSwagger = {};
SwaggerDiff.prototype.newSwagger = {};


/* PUBLIC FUNCTIONS */

SwaggerDiff.prototype.getAndDiff = function(oldSwaggerPath, newSwaggerPath, saveOldSwaggerPath, saveNewSwaggerPath) {
    // Retrieve old swagger
    if (fs.existsSync(oldSwaggerPath)) {
        log.info(`Loading old swagger from disk: ${oldSwaggerPath}`);
        this.oldSwagger = JSON.parse(fs.readFileSync(oldSwaggerPath, 'utf8'));
    } else if (oldSwaggerPath.toLowerCase().startsWith('http')) {
        log.info(`Downloading old swagger from: ${oldSwaggerPath}`);
        this.oldSwagger = JSON.parse(downloadFile(oldSwaggerPath));
    } else {
        log.warn(`Invalid oldSwaggerPath: ${oldSwaggerPath}`);
    }

    log.debug(`Old swagger length: ${JSON.stringify(this.oldSwagger).length}`);

    // Retrieve new swagger
    if (fs.existsSync(newSwaggerPath)) {
        log.info(`Loading new swagger from disk: ${newSwaggerPath}`);
        this.newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'));
    } else if (newSwaggerPath.toLowerCase().startsWith('http')) {
        log.info(`Downloading new swagger from: ${newSwaggerPath}`);
        this.newSwagger = JSON.parse(downloadFile(newSwaggerPath));
    } else {
        log.warn(`Invalid newSwaggerPath: ${newSwaggerPath}`);
    }

    log.debug(`New swagger length: ${JSON.stringify(this.newSwagger).length}`);

    // Save files to disk
    if (saveOldSwaggerPath) {
        log.info(`Writing old swagger to ${saveOldSwaggerPath}`);
        fs.writeFileSync(saveOldSwaggerPath, JSON.stringify(this.oldSwagger));
    }
    if (saveNewSwaggerPath) {
        log.info(`Writing new swagger to ${saveNewSwaggerPath}`);
        fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(this.newSwagger));
    }
    
    // Diff swaggers
    this.diff(this.oldSwagger, this.newSwagger);

    // Set instance metadata
    this.swaggerInfo = this.newSwagger.info;
    this.swaggerInfo.swagger = this.newSwagger.swagger;
    this.swaggerInfo.host = this.newSwagger.host;
};

SwaggerDiff.prototype.diff = function(oldSwagger, newSwagger) {
    log.info('Diffing swagger files...');
    checkOperations(oldSwagger, newSwagger);
    checkModels(oldSwagger, newSwagger);
    log.info(`Swagger diff complete. Found ${this.changeCount} changes.`);

    //log.debug(JSON.stringify(this.changes, null, 2));
};

SwaggerDiff.prototype.generateReleaseNotes = function(template, data) {
    var changesObject = {
        'major': {},
        'minor': {},
        'point': {}
    };

    // Organize data for templating
    _.forEach(this.changes, function (changeItem, entity) {
        if (changeItem.major) {
            if (!changesObject.major[entity]) 
                changesObject.major[entity] = { key: entity, changes: [] };

            changesObject.major[entity].changes.pushApply(changeItem.major);
        }

        if (changeItem.minor) {
            if (!changesObject.minor[entity]) 
                changesObject.minor[entity] = { key: entity, changes: [] };

            changesObject.minor[entity].changes.pushApply(changeItem.minor);
        }

        if (changeItem.point) {
            if (!changesObject.point[entity]) 
                changesObject.point[entity] = { key: entity, changes: [] };

            changesObject.point[entity].changes.pushApply(changeItem.point);
        }
    });

    // Calculate metadata
    var changesData = {
        'majorCount': 0,
        'minorCount': 0,
        'pointCount': 0,
    };
    _.forOwn(changesObject, function(impactGroup, key) {
        _.forOwn(impactGroup, function(changeGroup) {
            changesData[`${key}Count`] += changeGroup.changes.length;
            changeGroup.changeCount = changeGroup.changes.length;
        });
    });

    // Flatten to arrays
    changesData.major = _.values(changesObject.major);
    changesData.minor = _.values(changesObject.minor);
    changesData.point = _.values(changesObject.point);

    //log.info(JSON.stringify(changesData, null, 2));

    // Load template
    var templateString = template;
    if (fs.existsSync(template) === true) {
        templateString = fs.readFileSync(template, 'utf8');
    }

    // Construct template data definition object
    var defs = {
        changes: changesData,
        swaggerInfo: this.swaggerInfo,
        data: data,
        pluralize: pluralize
    };

    // Compile template
    log.info('Compiling template...');
    var compiledTemplate = dot.template(templateString, null, defs);

    // Execute template
    log.info('Executing template...');
    return compiledTemplate(defs);
};

SwaggerDiff.prototype.incrementVersion = function(version) {
    var forceMajor = getEnv('INCREMENT_MAJOR', false, true);
    var forceMinor = getEnv('INCREMENT_MINOR', false, true);
    var forcePoint = getEnv('INCREMENT_POINT', false, true);
    if (forceMajor === true) log.warn('Forcing major release!');
    if (forceMinor === true) log.warn('Forcing minor release!');
    if (forcePoint === true) log.warn('Forcing point release!');

    // Major
    if (forceMajor === true || _.find(this.changes, function(changeGroup) {
        return changeGroup[IMPACT_MAJOR] ? changeGroup[IMPACT_MAJOR].length > 0 : false;
    })) {
        log.info('Increment version: major');
        version.major++;
        version.minor = 0;
        version.point = 0;
    }
    // Minor
    else if (forceMinor === true || _.find(this.changes, function(changeGroup) {
        return changeGroup[IMPACT_MINOR] ? changeGroup[IMPACT_MINOR].length > 0 : false;
    })) {
        log.info('Increment version: minor');
        version.minor++;
        version.point = 0;
    }
    // Point
    else if (forcePoint === true || _.find(this.changes, function(changeGroup) {
        return changeGroup[IMPACT_POINT] ? changeGroup[IMPACT_POINT].length > 0 : false;
    })) {
        log.info('Increment version: point');
        version.point++;
    }

    version.display = this.stringifyVersion(version);
    version.displayFull = this.stringifyVersion(version, true);

    return version;
};

SwaggerDiff.prototype.stringifyVersion = function(version, includePrerelease) {
    return `${version.major}.${version.minor}.${version.point}` + 
        (includePrerelease === true && version.prerelease && version.prerelease.length > 0 ? 
            `-${version.prerelease}` : 
            '');
};


/* EXPORT MODULE */

var self = module.exports = new SwaggerDiff();


/* PRIVATE FUNCTIONS */

function downloadFile(url) {
    var i = 0;
    while (i < 10) {
        i++;
        log.info(`Downloading file: ${url}`);
        // Source: https://www.npmjs.com/package/download-file-sync
        var file = childProcess.execFileSync('curl', ['--silent', '-L', url], {encoding: 'utf8'});
        if (!file || file === '') {
            log.info(`File was empty! sleeping for 5 seconds. Retries left: ${10-i}`);
            sleep.sleep(5);
        } else {
            return file;
        }
    }
    log.warn('Failed to get contents for file!');
    return null;
}

function addChange(id, key, location, impact, oldValue, newValue, description) {
    // Generate default description
    if (!description) {
        if (!oldValue && newValue)
            description = `${location.capitalizeFirstLetter()} ${key} was added`;
        else if (oldValue && !newValue)
            description = `${location.capitalizeFirstLetter()} ${key} was removed`;
        else
            description = `${location.capitalizeFirstLetter()} ${key} was changed from ${oldValue} to ${newValue}`;
    }

    // Initialize
    if (!self.changes[id])
        self.changes[id] = {};
    if (!self.changes[id][impact])
        self.changes[id][impact] = [];

    // Add
    self.changes[id][impact].push({
        "parent": id,
        "impact": impact,
        "key": key,
        "location": location,
        "oldValue": oldValue,
        "newValue": newValue,
        "description": description
    });

    // Increment change count
    self.changeCount++;
}

function checkForChange(id, key, location, impact, property, oldObject, newObject, description) {
    // Initialize property values
    // Use property=undefined for direct object comparison
    var oldPropertyValue = property ? oldObject ? oldObject[property] : undefined : oldObject;
    var newPropertyValue = property ? newObject ? newObject[property] : undefined : newObject;

    // Have one but not the other, or properties aren't equal
    if ((!oldObject && newObject) || (oldObject && !newObject) || (oldPropertyValue !== newPropertyValue))
        addChange(id, key ? key : property, location, impact, oldPropertyValue, newPropertyValue, description);
}

function checkOperations(oldSwagger, newSwagger) {
    // Check for removed paths
    _.forEach(oldSwagger.paths, function(oldPath, pathKey) {
        var newPath = newSwagger.paths[pathKey];
        if (!newPath) {
            addChange(pathKey, pathKey, LOCATION_PATH, IMPACT_MAJOR, pathKey, undefined);
        }
    });

    // Check for changed and added paths
    _.forEach(newSwagger.paths, function(newPath, pathKey) {
        var oldPath = oldSwagger.paths[pathKey];
        if (!oldPath) {
            // Add note about the new path itself
            addChange(pathKey, pathKey, LOCATION_PATH, IMPACT_MINOR, undefined, pathKey, `Path was added`);

            // Add each operation
            _.forEach(newPath, function(newOperation, methodKey) {
                addChange(pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MINOR, undefined, pathKey);
            });
        } else {
            // Check for removed operations
            _.forEach(oldPath, function(oldOperation, methodKey) {
                var newOperation = newPath[methodKey];
                if (!newOperation) {
                    addChange(pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MAJOR, methodKey, undefined);
                }
            });

            // Check for changed and added operations
            _.forEach(newPath, function(newOperation, methodKey) {
                var oldOperation = oldPath[methodKey];
                if (!oldOperation) {
                    // Operation was added
                    addChange(pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MINOR, undefined, methodKey);
                } else {
                    var operationMethodAndPath = `${methodKey.toUpperCase()} ${pathKey}`;

                    // Check operation properties
                    checkForChange(operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_MAJOR, 'operationId', oldOperation, newOperation);
                    checkForChange(operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_MAJOR, 'x-purecloud-method-name', oldOperation, newOperation);
                    checkForChange(operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_POINT, 'description', oldOperation, newOperation, 'Description was changed');
                    checkForChange(operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_POINT, 'summary', oldOperation, newOperation, 'Summary was changed');
                    // Check for deprecated
                    if (newOperation.deprecated === true && oldOperation.deprecated !== true) {
                        addChange(operationMethodAndPath, 'deprecated', LOCATION_OPERATION, IMPACT_MAJOR, oldOperation.deprecated, newOperation.deprecated, `Has been deprecated`);
                    } else if (newOperation.deprecated !== true && oldOperation.deprecated === true) {
                        // This condition should never happen, but let's be thorough
                        addChange(operationMethodAndPath, 'deprecated', LOCATION_OPERATION, IMPACT_MAJOR, oldOperation.deprecated, newOperation.deprecated, `Has been undeprecated`);
                    }



                    // Make parameters KVPs
                    var oldParams = {};
                    var newParams = {};
                    _.forEach(oldOperation.parameters, function(p) { oldParams[p.name] = p; });
                    _.forEach(newOperation.parameters, function(p) { newParams[p.name] = p; }); 

                    // Check for removed parameters
                    _.forEach(oldParams, function(oldParam) {
                        if (!newParams[oldParam.name]) {
                            addChange(operationMethodAndPath, oldParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, oldParam.name, undefined);
                        }
                    });

                    // Check for changed and added parameters
                    _.forEach(newParams, function(newParam) {
                        var oldParam = oldParams[newParam.name];
                        if (!oldParam) {
                            // Parameter was added, major change if in path or required
                            var i = self.useSdkVersioning || newParam.in.toLowerCase() === 'path' || newParam.required === true;
                            addChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, i ? IMPACT_MAJOR : IMPACT_MINOR, undefined, newParam.name);
                        } else {
                            checkForChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'in', oldParam, newParam);
                            checkForChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'type', oldParam, newParam);
                            checkForChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_POINT, 'description', oldParam, newParam, `Description was changed for parameter ${newParam.name}`);

                            // Major if made required
                            if (oldParam.required !== newParam.required) {
                                if (newParam.required === true) {
                                    addChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, oldParam.required, newParam.required, `Parameter ${newParam.name} was made required`);
                                } else {
                                    addChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MINOR, oldParam.required, newParam.required, `Parameter ${newParam.name} was made optional`);
                                }
                            }
                        }
                    });



                    // Check for removed responses
                    _.forEach(oldOperation.responses, function(oldResponse, oldResponseCode) {
                        if (!newOperation.responses[oldResponseCode]) {
                            addChange(operationMethodAndPath, oldResponseCode, LOCATION_RESPONSE, IMPACT_MAJOR, oldResponseCode, undefined);
                        }
                    });

                    // Check for changed and added responses
                    _.forEach(newOperation.responses, function(newResponse, newResponseCode) {
                        var oldResponse = oldOperation.responses[newResponseCode];
                        if (!oldResponse) {
                            // Response was added
                            addChange(operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_MINOR, undefined, newResponseCode);
                        } else {
                            checkForChange(operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_POINT, 'description', oldResponse, newResponse);
                            checkForChange(operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_MAJOR, '$ref', oldResponse.schema, newResponse.schema, 
                                `Response ${newResponseCode} type was changed from ${getSchemaType(oldResponse.schema)} to ${getSchemaType(newResponse.schema)}`);
                        }
                    });



                    // Check for removed tags
                    _.forEach(_.difference(oldOperation.tags, newOperation.tags), function(tag) {
                        addChange(operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, tag, undefined);
                    });

                    // Check for added tags
                    _.forEach(_.difference(newOperation.tags, oldOperation.tags), function(tag) {
                        addChange(operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, undefined, tag);
                    });
                }
            }); // end operation iteration
        }
    }); // end path iteration
}

function getSchemaType(schema) {
    if (schema && schema['$ref'])
        return schema['$ref'].replace('#/definitions/', '');

    if (schema && schema.type) {
        if (schema.type.toLowerCase() == 'array' && schema.items) {
            if (schema.items['$ref'])
                return `${schema.items['$ref'].replace('#/definitions/', '')}[]`;
            if (schema.items.type)
                return `${schema.items.type}[]`;
        }
        if (schema.type.toLowerCase() == 'object' && schema.additionalProperties) {
            return `Map<${schema.type}, ${getSchemaType(schema.additionalProperties)}>`;
        }

        return schema.type;
    }

    return '_undefined_';
}

function checkModels(oldSwagger, newSwagger) {
    // Check for removed models
    _.forEach(oldSwagger.definitions, function(oldModel, modelKey) {
        var newModel = newSwagger.definitions[modelKey];
        if (!newModel) {
            addChange(modelKey, modelKey, LOCATION_MODEL, IMPACT_MAJOR, modelKey, undefined);
        }
    });

    // Check for changed and added models
    _.forEach(newSwagger.definitions, function(newModel, modelKey) {
        var oldModel = oldSwagger.definitions[modelKey];
        if (!oldModel) {
            // Add note about the new model
            addChange(modelKey, modelKey, LOCATION_MODEL, IMPACT_MINOR, undefined, modelKey, 'Model was added');
        } else {
            // Check for removed properties
            _.forEach(oldModel.properties, function(oldProperty, propertyKey) {
                var newProperty = newModel.properties[propertyKey];
                if (!newProperty) {
                    addChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, propertyKey, undefined);
                }
            });

            // Check for changed and added properties
            _.forEach(newModel.properties, function(newProperty, propertyKey) {
                var oldProperty = oldModel.properties[propertyKey];
                if (!oldProperty) {
                    // Property was added
                    var type = newProperty.type;
                    if (!type)
                        type = newProperty['$ref'] ? newProperty['$ref'].replace('#/definitions/', '') : undefined;

                    addChange(modelKey, propertyKey, LOCATION_PROPERTY, self.useSdkVersioning ? IMPACT_MAJOR : IMPACT_MINOR, undefined, type);
                } else {
                    /*
                    checkForChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, 'type', oldProperty, newProperty);
                    checkForChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, 'format', oldProperty, newProperty);
                    */
                    checkForChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, undefined, getSchemaType(oldProperty), getSchemaType(newProperty));

                    // Check enums
                    var oldEnums = oldProperty.items ? oldProperty.items.enum ? oldProperty.items.enum : undefined : undefined;
                    var newEnums = newProperty.items ? newProperty.items.enum ? newProperty.items.enum : undefined : undefined;
                    if (!oldEnums && newEnums) {
                        // Is an enum now
                        addChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, oldEnums, newEnums, `Values are now constrained by enum members`);
                    }
                    if (oldEnums && !newEnums) {
                        // Not an enum anymore
                        addChange(modelKey, propertyKey, LOCATION_PROPERTY, self.useSdkVersioning ? IMPACT_MINOR : IMPACT_MINOR, oldEnums, newEnums, `Values are no longer constrained by enum members`);
                    }
                    if (oldEnums && newEnums) {
                        // Removed enum values
                        _.forEach(oldEnums, function(oldEnumValue) {
                            if (newEnums.indexOf(oldEnumValue) == -1) {
                                addChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, oldEnumValue, undefined, 
                                    `Enum value ${oldEnumValue} was removed from property ${propertyKey}`);
                            }
                        });

                        // Added enum values
                        _.forEach(newEnums, function(newEnumValue) {
                            if (oldEnums.indexOf(newEnumValue) == -1) {
                                addChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MINOR, undefined, newEnumValue, 
                                    `Enum value ${newEnumValue} was added to property ${propertyKey}`);
                            }
                        });
                    }
                }
            });
        }
    });
}

function getEnv(varname, defaultValue, isDefaultValue) {
    varname = varname.trim();
    var envVar = process.env[varname];
    log.silly(`ENV: ${varname}->${envVar}`);
    if (!envVar && defaultValue) {
        envVar = defaultValue;
        if (isDefaultValue === true)
            log.info(`Using default value for ${varname}: ${envVar}`);
        else
            log.warn(`Using override for ${varname}: ${envVar}`);
    }
    if (envVar) {
        if (envVar.toLowerCase() === 'true')
            return true;
        else if (envVar.toLowerCase() === 'true')
            return false;
        else 
            return envVar;
    }

    return defaultValue;
}