import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { Swagger, ItemsType, Format, Property } from '../types/swagger.js'
import { log } from '../log/logger.js';
import { gcLoginClientCredentialsGrant, AvailableTopicEntityListing, gcGetNotificationsAvailabletopics } from '../util/http.js';
import { PureCloud, Haystack, Config } from '../types/config.js'

/************************************************************************************
 * Preprocessing of the Swagger specification
 *************************************************************************************/

const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;

// Quarantine Operations
const quarantineOperationIds: string[] = ['postGroupImages', 'postUserImages', 'postLocationImages'];
const quarantineModels: string[] = [];
// Keep, Quarantine or Override Discriminator and Polymorphism (possible values: keep, quarantine, override)
const defaultDiscriminatorManagement: string = 'quarantine';
const keepDiscriminatorModels: string[] = ['ListValues'];
// Override OperationId due to name conflict ("operationId", "x-purecloud-method-name")
const overrideOperationIds: any = {};
const aliasOperationIds: any = {
    "/api/v2/presence/definitions/{definitionId}": {
        "get": "getDivisionBasedPresenceDefinition",
        "put": "putDivisionBasedPresenceDefinition",
        "delete": "deleteDivisionBasedPresenceDefinition"
    },
    "/api/v2/presence/definitions": {
        "get": "getDivisionBasedPresenceDefinitions",
        "post": "postDivisionBasedPresenceDefinitions"
    }
};
// Override available topics schema properties from type: "integer" to type: "integer", format: "int64"
let forceInt64Integers = true;
// Remove duplicates in topics enumerations
let removeEnumDuplicates = true;
// Add info (vendor extensions) - follow redirect body property
const followRedirectBodyOperations = {
    "/api/v2/audits/query/{transactionId}/results": {
        "get": [{ "status": 302, "property": "downloadUrl" }]
    }
};

export function swaggerPreprocessing(newSwagger: Swagger, pureCloud: PureCloud, config: Config): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        try {
            log.debug('Adding notifications to schema');
            addNotifications(newSwagger, pureCloud)
                .then(() => {
                    log.debug('Processing swagger paths');
                    return processPaths(newSwagger, config.settings.swaggerCodegen.codegenLanguage);
                })
                .then(() => {
                    log.debug('Processing any types in schema');
                    return processAnyTypes(newSwagger);
                })
                .then(() => {
                    let forceCSVCollectionFormatInTags: string[] = [];
                    if (config.settings.swagger) {
                        let allSwaggerSettings: any = config.settings.swagger;
                        if (allSwaggerSettings.forceCSVCollectionFormatOnTags) {
                            forceCSVCollectionFormatInTags = allSwaggerSettings.forceCSVCollectionFormatOnTags;
                        }
                    }
                    return forceCSVCollectionFormat(newSwagger, forceCSVCollectionFormatInTags);
                })
                .then(() => {
                    return quarantineOperationsAndModels(newSwagger, quarantineOperationIds, quarantineModels);
                })
                .then(() => {
                    let discriminatorManagement: string = defaultDiscriminatorManagement;
                    if (config.settings.swagger) {
                        let allSwaggerSettings: any = config.settings.swagger;
                        if (allSwaggerSettings.discriminatorManagement !== null && allSwaggerSettings.discriminatorManagement !== undefined) {
                            if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'keep') {
                                discriminatorManagement = 'keep';
                            } else if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'quarantine') {
                                discriminatorManagement = 'quarantine';
                            } else if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'override') {
                                discriminatorManagement = 'override';
                            } else if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'extensions') {
                                discriminatorManagement = 'extensions';
                            } else {
                                discriminatorManagement = defaultDiscriminatorManagement;
                            }
                        }
                    }
                    return manageDiscriminator(newSwagger, config.settings.swaggerCodegen.codegenLanguage, discriminatorManagement, keepDiscriminatorModels);
                })
                .then(() => {
                    return overrideOperations(newSwagger, overrideOperationIds);
                })
                .then(() => {
                    return addExtensions_followRedirectBody(newSwagger, followRedirectBodyOperations);
                })
                .then(() => {
                    log.debug('Processing swagger references');
                    return processRefs(newSwagger);
                })
                .then(() => {
                    resolve("");
                })
                .catch((err: unknown) => {
					reject(err);
				});
        } catch (err: unknown) {
            reject(err);
        }
    });
}

//#region Preprocessing Steps

function addNotifications(newSwagger: Swagger, pureCloud: PureCloud): Promise<string> {
    return new Promise<string>((resolve, reject) => {

        try {
            // Skip notifications
            if (getEnv('EXCLUDE_NOTIFICATIONS') === true) {
                log.info('Not adding notifications to schema');
                resolve("");
            }

            // Check PureCloud settings
            checkAndThrow(pureCloud, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
            checkAndThrow(pureCloud, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
            checkAndThrow(pureCloud, 'environment', 'PureCloud environment was blank!');

            gcLoginClientCredentialsGrant(pureCloud.environment, pureCloud.clientId, pureCloud.clientSecret)
                .then((access_token) => {
                    return gcGetNotificationsAvailabletopics(pureCloud.environment, access_token);
                })
                .then((notifications: AvailableTopicEntityListing) => {
                    //let notificationMappings = { notifications: [] };

                    type Notification = {
                        topic: string; // Replace 'string' with the appropriate type for the 'topic' property
                        class: string;
                    }


                    type NotificationMappings = {
                        notifications: Notification[];
                    };


                    const notificationMappings: NotificationMappings = { notifications: [] };

                    // Process schemas
                    log.info(`Processing ${notifications.entities.length} notification schemas...`);
                    _.forEach(notifications.entities, (entity) => {
                        if (!entity.schema) {
                            log.warn(`Notification ${entity.id} does not have a defined schema!`);
                            return;
                        }

                        const schemaName = getNotificationClassName(entity.schema.id.toString());
                        log.info(`Notification mapping: ${entity.id} (${schemaName})`);
                        notificationMappings.notifications.push({ topic: entity.id, class: schemaName });
                        extractDefinitons(newSwagger, entity.schema);
                        newSwagger.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
                    });

                    // Write mappings to file
                    let mappingFilePath = path.resolve(path.join(getEnv('SDK_REPO') as string, 'notificationMappings.json'));
                    log.info(`Writing Notification mappings to ${mappingFilePath}`);
                    fs.writeFileSync(mappingFilePath, JSON.stringify(notificationMappings, null, 2));

                    resolve("");
                })
                .catch((err: Error) => {
                    reject(err)
                });
        } catch (err: unknown) {
            reject(err);
        }
    });
}

function getNotificationClassName(id: string) {
    // Normalize to include v2. Architect topics just have to be different and don't have v2...
    let parts = id.split(':');
    if (parts[parts.length - 2] !== 'v2') parts.splice(parts.length - 2, 0, 'v2');
    const normalizedId = parts.join(':');

    // Regex match the URN parts we want
    let className = '';
    let matches = NOTIFICATION_ID_REGEX.exec(normalizedId);
    if (!matches) {
        log.warn('No regex matches!');
        log.warn(`id: ${id}`);
        log.warn(`normalizedId: ${normalizedId}`);
    }
    if (matches !== null) {
        for (let i = 1; i < matches.length; i++) {
            matches[i].split(':').forEach((part) => {
                className += part.charAt(0).toUpperCase() + part.slice(1);
            });
        }
    }

    return className;
}

function processAnyTypes(newSwagger: Swagger) {
    const keys = Object.keys(newSwagger.definitions);
    keys.forEach((key, index) => {
        let obj = newSwagger.definitions[key].properties;
        if (obj) {
            const keys = Object.keys(newSwagger.definitions[key].properties);
            keys.forEach((key2, index) => {
                let obj2 = newSwagger.definitions[key].properties[key2];
                if (obj2) {
                    if (obj2.hasOwnProperty("type") && obj2["type"] === "any") {
                        obj2.type = "string" as ItemsType;
                        obj2.format = "date-time" as Format;
                    }
                }
            });
        }
    });
}

function forceCSVCollectionFormat(newSwagger: Swagger, forceCSVCollectionFormatInTags: string[]) {
    if (forceCSVCollectionFormatInTags && forceCSVCollectionFormatInTags.length > 0) {
        log.info(`Updating CollectionFormat from multi to csv for operations with tags: ${forceCSVCollectionFormatInTags.toString()}`);
        const paths = Object.keys(newSwagger.paths);
        for (const path of paths) {
            const methods = Object.keys(newSwagger.paths[path]);
            for (const method of methods) {
                let operation = newSwagger.paths[path][method];
                let overrideOperation = false;
                for (let overrideTag of forceCSVCollectionFormatInTags) {
                    if (operation && operation.tags && operation.tags.includes(overrideTag)) {
                        overrideOperation = true;
                        break;
                    }
                }
                if (overrideOperation === true) {
                    if (operation.parameters && operation.parameters.length > 0) {
                        for (let opParameter of operation.parameters) {
                            if (opParameter.in && opParameter.in === "query" && opParameter.type && opParameter.type === "array" && opParameter.collectionFormat && opParameter.collectionFormat === "multi") {
                                opParameter.collectionFormat = "csv";
                            }
                        }
                    }
                }
            }
        }
    }
    return;
}

function addExtensions_followRedirectBody(newSwagger: Swagger, followRedirectBodyOperations: Record<string, any>) {
    // Add vendor extensions in swagger
    // Operations which can return a 302 status, with no Location header set
    // Url to follow is in the body of the 302 Response - as a JSON Object property.
    if (followRedirectBodyOperations && Object.keys(followRedirectBodyOperations).length > 0) {
        for (let path in followRedirectBodyOperations) {
            if (newSwagger.paths[path]) {
                let followPath = followRedirectBodyOperations[path];
                if (followPath && Object.keys(followPath).length > 0) {
                    for (let method in followPath) {
                        if (newSwagger.paths[path][method]) {
                            newSwagger.paths[path][method]["x-gc-is-follow-redirect-body"] = true;
                            newSwagger.paths[path][method]["x-gc-follow-redirect-body-values"] = followPath[method];
                        }
                    }
                }
            }
        }
    }
    return;
}

interface oneofInfo {
    parentName: string;
    childrenNames: string[];
    defaultChildName: string;
}

function addExtensions_oneOf(newSwagger: Swagger, codegenLanguage: string) {
	// Add vendor extensions in swagger
	const SUFFIX_DEFAULT_CHILD = 'OutdatedSdkVersion';
	let swagger = newSwagger;

	let oneofInfoArray: oneofInfo[] = [];

	// Find models, identified as being a oneOf emulation ("parent" class)
	// - "x-genesys-one-of": [{"$ref": "#/definitions/..."},{"$ref": "#/definitions/..."}]
    for (let defKey in swagger.definitions) {
        if (swagger.definitions[defKey]["x-genesys-one-of"]) {
			let oneOfParentModel = swagger.definitions[defKey];
			let oneOfParentName = defKey;

            swagger.definitions[defKey]["oneOf"] = swagger.definitions[defKey]["x-genesys-one-of"];

			let oneOfChildren: string[] = oneOfParentModel["x-genesys-one-of"].map((x: any) => x["$ref"].replace('#/definitions/', ''));

			// Add default class: used in SDK to prevent deserialization error
			let oneOfDefaultChild = oneOfParentName + SUFFIX_DEFAULT_CHILD;
			let oneOfDefaultModel = {
				"allOf": [
					{
						"$ref": `#/definitions/${oneOfParentName}`
					},
					{
						"type": ItemsType.Object,
						"description": `Class for unknown/unexpected ${oneOfDefaultChild}. This class is used to avoid deserialization issue if a new ${oneOfDefaultChild} is added to the API (with an older SDK version).`,
						"additionalProperties": {
							"type": ItemsType.Object
						}
					}
				],
				"x-gc-class-complex": true,
				"x-gc-class-one-of": true,
				"x-gc-is-one-of-child": true,
				"x-gc-one-of-parent": oneOfParentName,
				"x-gc-is-outdated-sdk-version": true
			};
			swagger.definitions[oneOfDefaultChild] = oneOfDefaultModel;
			// Not necessary but to be compliant
			swagger.definitions[defKey]["x-genesys-one-of"].push({ "$ref": `#/definitions/${oneOfDefaultChild}`});

			// Add vendor extensions to "parent" class
			oneOfParentModel["x-gc-class-complex"] = true;
			oneOfParentModel["x-gc-class-one-of"] = true;
			oneOfParentModel["x-gc-is-one-of-parent"] = true;
			oneOfParentModel["x-gc-one-of-children"] = oneOfChildren;
			oneOfParentModel["x-gc-one-of-default"] = oneOfDefaultChild;
			if (!oneOfParentModel.properties) oneOfParentModel.properties = {};
			if (!oneOfParentModel.properties["emulateProperty"]) {
				oneOfParentModel.properties["emulateProperty"] = {
					"type": ItemsType.String,
					"description": `Emulate property.`
				};
				oneOfParentModel.properties["emulateProperty"]["x-gc-ignore-property"] = true;
			}

			// Add vendor extensions to children classes
			for (let childName of oneOfChildren) {
				let oneOfChildModel = swagger.definitions[childName];
				oneOfChildModel["x-gc-class-complex"] = true;
				oneOfChildModel["x-gc-class-one-of"] = true;
				oneOfChildModel["x-gc-is-one-of-child"] = true;
				oneOfChildModel["x-gc-one-of-parent"] = oneOfParentName;
			}

			oneofInfoArray.push({
				parentName: oneOfParentName,
				childrenNames: oneOfChildren,
				defaultChildName: oneOfDefaultChild
			});
        }
    }

	// All OneOf details ("parents" and "children") made available at swagger root level
	swagger["x-gc-one-of-details"] = oneofInfoArray;

	return oneofInfoArray;
}

interface discriminatorInfo {
    parentName: string;
    propertyName: string;
    defaultChildName: string;
    defaultValue: string;
    mapping: any[]
}

function addExtensions_discriminator(newSwagger: Swagger, codegenLanguage: string) {
	// Add vendor extensions in swagger
	const SUFFIX_DEFAULT_CHILD = 'OutdatedSdkVersion';
	let swagger = newSwagger;

	let discriminatorInfoArray: discriminatorInfo[] = [];

	// Find all discriminator children - Get all models with "x-discriminator-value" property
	let discriminatorValueModels = {};
	for (let modelName in swagger.definitions) {
		let model = swagger.definitions[modelName];
		if (model && model["x-discriminator-value"]) {
			discriminatorValueModels[modelName] = model;
		}
	}

	// Find models, identified as being a discriminator ("parent" class)
	// Get all models with "discriminator" property
	for (let modelName in swagger.definitions) {
		let model = swagger.definitions[modelName];
		if (model && model.discriminator) {
			let discriminatorParentModel = model;
			let discriminatorParentName = modelName;
			let discriminatorPropertyName = model.discriminator;

			// Fix ListValues model bug - create discriminator property
			if (!discriminatorParentModel.properties || !discriminatorParentModel.properties[discriminatorPropertyName]) {
				// Add property to swagger model
				if (!discriminatorParentModel.properties) discriminatorParentModel.properties = {};
				if (!discriminatorParentModel.properties[discriminatorPropertyName]) {
					discriminatorParentModel.properties[discriminatorPropertyName] = {
						"type": ItemsType.String,
						"description": `Validation ${discriminatorPropertyName} discriminator.`,
                	};
				}
			}

			// Children, Values, Mapping (without Default Class/Value)
			let discriminatorChildren: string[] = [];
			let discriminatorValues: string[] = [];
			let discriminatorMapping: any[] = [];

			// Find children of discriminatorParentName/modelName (in the filtered discriminatorValueModels map)
			for (let childName of Object.keys(discriminatorValueModels)) {
				let childModel = discriminatorValueModels[childName];
				if (childModel["allOf"]) {
					for (let allOfElement of childModel["allOf"]) {
						if (allOfElement["$ref"] && allOfElement["$ref"].endsWith('/' + discriminatorParentName)) {
							discriminatorChildren.push(childName);
							if (childModel["x-discriminator-value"]) {
								discriminatorValues.push(childModel["x-discriminator-value"]);
								discriminatorMapping.push({ "name": childName, "value": childModel["x-discriminator-value"]})
							}
							break;
						}
					}
				}
			}

			// Add default class: used in SDK to prevent deserialization error
			let discriminatorDefaultChild = discriminatorParentName + SUFFIX_DEFAULT_CHILD;
			let discriminatorDefaultValue = SUFFIX_DEFAULT_CHILD;
			let discriminatorDefaultModel = {
				"allOf": [
					{
						"$ref": `#/definitions/${discriminatorParentName}`
					},
					{
						"type": ItemsType.Object,
						"description": `Class for unknown/unexpected ${discriminatorDefaultChild}. This class is used to avoid deserialization issue if a new ${discriminatorDefaultChild} is added to the API (with an older SDK version).`,
						"additionalProperties": {
							"type": ItemsType.Object
						}
					}
				],
				"x-discriminator-value": discriminatorDefaultValue,
				"x-gc-class-complex": true,
				"x-gc-class-discriminator": true,
				"x-gc-is-discriminator-child": true,
				"x-gc-discriminator-parent": discriminatorParentName,
				"x-gc-is-outdated-sdk-version": true
			};
			swagger.definitions[discriminatorDefaultChild] = discriminatorDefaultModel;

			// Add vendor extensions to "parent" class
			discriminatorParentModel["x-gc-class-complex"] = true;
			discriminatorParentModel["x-gc-class-discriminator"] = true;
			discriminatorParentModel["x-gc-is-discriminator-parent"] = true;
			discriminatorParentModel["x-gc-discriminator-default"] = discriminatorDefaultChild;
			discriminatorParentModel["x-gc-discriminator-default-value"] = discriminatorDefaultValue;
			discriminatorParentModel["x-gc-discriminator-children"] = discriminatorChildren;
			discriminatorParentModel["x-gc-discriminator-values"] = discriminatorValues;
			discriminatorParentModel["x-gc-discriminator-mapping"] = discriminatorMapping;
			discriminatorParentModel["x-gc-discriminator-property"] = discriminatorPropertyName;
			// Inside discriminator property
			discriminatorParentModel.properties[discriminatorPropertyName]["x-gc-is-discriminator-property"] = true;
			
			// Add vendor extensions to children classes
			for (let childName of discriminatorChildren) {
				let discriminatorChildModel = swagger.definitions[childName];
				discriminatorChildModel["x-gc-class-complex"] = true;
				discriminatorChildModel["x-gc-class-discriminator"] = true;
				discriminatorChildModel["x-gc-is-discriminator-child"] = true;
				discriminatorChildModel["x-gc-discriminator-parent"] = discriminatorParentName;

				// Delete discriminator property (e.g. "type") at children level, if it exists
				if (discriminatorChildModel.allOf) {
					for (let allOfElement of discriminatorChildModel.allOf) {
						if (allOfElement.properties && allOfElement.properties[discriminatorPropertyName]) {
							delete allOfElement.properties[discriminatorPropertyName];
						}
					}
				}
			}

			// Fix ListValues model bug - compute enum
			if (!discriminatorParentModel.properties[discriminatorPropertyName].enum) {
				discriminatorParentModel.properties[discriminatorPropertyName].enum = [ ...discriminatorValues ];
			}
			
			// Add DefaultValue to enum
			discriminatorParentModel.properties[discriminatorPropertyName].enum.push(discriminatorDefaultValue);

			discriminatorInfoArray.push({
				parentName: discriminatorParentName,
				propertyName: discriminatorPropertyName,
				defaultChildName: discriminatorDefaultChild,
				defaultValue: discriminatorDefaultValue,
				mapping: discriminatorMapping
			});
		}
	}

	newSwagger["x-gc-discriminator-details"] = discriminatorInfoArray;

	return discriminatorInfoArray;
}

function addPolymorphismDescriptionToProperty(prop: Property, oneofInfoParents: string[], oneofInfoDocMap: Record<string, string>, discriminatorInfoParents: string[], discriminatorInfoDocMap: Record<string, string>) {
	if (prop["$ref"]) {
		let modelName = prop["$ref"].replace('#/definitions/', '');
		if (oneofInfoParents.includes(modelName)) {
			prop["allOf"] = [ { "$ref": prop["$ref"] }];
			if (prop.description) {
				prop.description = prop.description + ' ' + oneofInfoDocMap[modelName];
			} else {
				prop.description = oneofInfoDocMap[modelName];
			}
			delete prop["$ref"];
		} else if (discriminatorInfoParents.includes(modelName)) {
			prop["allOf"] = [ { "$ref": prop["$ref"] }];
			if (prop.description) {
				prop.description = prop.description + ' ' + discriminatorInfoDocMap[modelName];
			} else {
				prop.description = discriminatorInfoDocMap[modelName];
			}
			delete prop["$ref"];
		}
	} else if (prop.type === "array" && prop.items && prop.items["$ref"]) {
		let modelName = prop.items["$ref"].replace('#/definitions/', '');
		if (oneofInfoParents.includes(modelName)) {
			if (prop.description) {
				prop.description = prop.description + ' ' + oneofInfoDocMap[modelName];
			} else {
				prop.description = oneofInfoDocMap[modelName];
			}
		} else if (discriminatorInfoParents.includes(modelName)) {
			if (prop.description) {
				prop.description = prop.description + ' ' + discriminatorInfoDocMap[modelName];
			} else {
				prop.description = discriminatorInfoDocMap[modelName];
			}
		}
	} else if (prop.additionalProperties && prop.additionalProperties["$ref"]) {
		let modelName = prop.additionalProperties["$ref"].replace('#/definitions/', '');
		if (oneofInfoParents.includes(modelName)) {
			if (prop.description) {
				prop.description = prop.description + ' ' + oneofInfoDocMap[modelName];
			} else {
				prop.description = oneofInfoDocMap[modelName];
			}
		} else if (discriminatorInfoParents.includes(modelName)) {
			if (prop.description) {
				prop.description = prop.description + ' ' + discriminatorInfoDocMap[modelName];
			} else {
				prop.description = discriminatorInfoDocMap[modelName];
			}
		}
	}
}

function addPolymorphismDescription(newSwagger: Swagger, codegenLanguage: string, oneofInfoArray: oneofInfo[], discriminatorInfoArray: discriminatorInfo[]) {
	// Special treatment for documentation at property level (referencing a discriminator "parent" class)
	let swagger = newSwagger;

	let skipDocForLanguages = ["purecloudjavascript", "clisdkclient"];
	if (!skipDocForLanguages.includes(codegenLanguage)) {
		let oneofInfoParents: string[] = oneofInfoArray.map((oInfo) => oInfo.parentName);
		let oneofInfoDocMap: Record<string, string> = {};
		oneofInfoArray.forEach((oInfo) => {
			let refDoc = `${oInfo.parentName} is defined as an interface (abstract class). In this context, it means the property value is an instance of one of the following class variants: ${oInfo.childrenNames.join(', ')} or ${oInfo.defaultChildName}. ${oInfo.defaultChildName} is added in this SDK to prevent deserialization errors - e.g. outdated SDK version: a new class variant has been introduced in the Platform API (compared to the version of the Platform API used to build this version of the SDK).`;
			if (codegenLanguage === "purecloudpython") {
				refDoc = `${oInfo.parentName} is defined as a union type (abstract). In this context, it means the property value is an instance of one of the following class variants: ${oInfo.childrenNames.join(', ')} or ${oInfo.defaultChildName}. ${oInfo.defaultChildName} is added in this SDK to prevent deserialization errors - e.g. outdated SDK version: a new class variant has been introduced in the Platform API (compared to the version of the Platform API used to build this version of the SDK).`;
			}
			oneofInfoDocMap[oInfo.parentName] = refDoc;
		});

		let discriminatorInfoParents: string[] = discriminatorInfoArray.map((dInfo) => dInfo.parentName);
		let discriminatorInfoDocMap: Record<string, string> = {};
		discriminatorInfoArray.forEach((dInfo) => {
			let refDoc = `${dInfo.parentName} is a parent class (using ${dInfo.propertyName} property as discriminator). In this context, it means the property value is an instance of one of its children classes: ${dInfo.mapping.map((x) => `${x.name} (${dInfo.propertyName}: ${x.value})`).join(', ')} or ${dInfo.defaultChildName} (${dInfo.propertyName}: unknown values). ${dInfo.defaultChildName} is added in this SDK to prevent deserialization errors - e.g. outdated SDK version: a new class variant has been introduced in the Platform API (compared to the version of the Platform API used to build this version of the SDK).`;
			discriminatorInfoDocMap[dInfo.parentName] = refDoc;
		});

		for (let modelName in swagger.definitions) {
			let model = swagger.definitions[modelName];
			if (model && model.allOf) {
				for (let allOfElement of model.allOf) {
					if (allOfElement && allOfElement.properties) {
						for (let propName in allOfElement.properties) {
							let prop = allOfElement.properties[propName];
							addPolymorphismDescriptionToProperty(prop, oneofInfoParents, oneofInfoDocMap, discriminatorInfoParents, discriminatorInfoDocMap);
						}
					} else if (allOfElement && allOfElement.additionalProperties) {
						addPolymorphismDescriptionToProperty(allOfElement.additionalProperties, oneofInfoParents, oneofInfoDocMap, discriminatorInfoParents, discriminatorInfoDocMap);
					}
				}
			} else if (model && model.properties) {
				for (let propName in model.properties) {
					let prop = model.properties[propName];
					addPolymorphismDescriptionToProperty(prop, oneofInfoParents, oneofInfoDocMap, discriminatorInfoParents, discriminatorInfoDocMap);
				}
			} else if (model && model.additionalProperties) {
				addPolymorphismDescriptionToProperty(model.additionalProperties, oneofInfoParents, oneofInfoDocMap, discriminatorInfoParents, discriminatorInfoDocMap);
			}
		}
	}

	return;
}

function manageDiscriminator(newSwagger: Swagger, codegenLanguage: string, discriminatorManagement: string, keepDiscriminatorModels: string[]) {
    if (discriminatorManagement !== null && discriminatorManagement !== undefined && discriminatorManagement !== 'keep') {
        if (discriminatorManagement === 'extensions') {
            let oneofInfoArray = addExtensions_oneOf(newSwagger, codegenLanguage);
            let discriminatorInfoArray = addExtensions_discriminator(newSwagger, codegenLanguage);
			addPolymorphismDescription(newSwagger, codegenLanguage, oneofInfoArray, discriminatorInfoArray);
        } else {
            let modelsWithDiscriminator: string[] = [];
            let childDiscriminatorModels: string[] = [];
            // Find Models with Discriminator
            if (newSwagger.definitions) {
                for (let modelName in newSwagger.definitions) {
                    if (newSwagger.definitions[modelName].discriminator) {
                        if (!keepDiscriminatorModels.includes(modelName)) {
                            modelsWithDiscriminator.push(modelName);
                        }
                    }
                }
            }
            // Find Models with a Discriminator based parent model
            if (modelsWithDiscriminator.length > 0) {
                // find all models with an indirect dependency on modelsWithDiscriminator
                let refsWithDiscriminatorModels: string[] = [];
                for (let discriminatorModelName of modelsWithDiscriminator) {
                    refsWithDiscriminatorModels.push(`#/definitions/${discriminatorModelName}`);
                }
                for (let modelName in newSwagger.definitions) {
                    if (newSwagger.definitions[modelName].allOf) {
                        for (let compositeModel of newSwagger.definitions[modelName].allOf) {
                            if (compositeModel['$ref'] && refsWithDiscriminatorModels.includes(compositeModel['$ref'])) {
                                childDiscriminatorModels.push(modelName);
                                break;
                            }
                        }
                    }
                }
            }
            log.info(`Found Discriminator based Models: ${modelsWithDiscriminator.toString()}`);
            log.info(`Found Discriminator Child Models: ${childDiscriminatorModels.toString()}`);
            if (modelsWithDiscriminator.length > 0) {
                // Manage Discriminator
                if (discriminatorManagement === 'override') {
                    // Override
                    // Remove discriminator models and their children from Swagger
                    for (let modelName of modelsWithDiscriminator) {
                        if (newSwagger.definitions[modelName]) {
                            delete newSwagger.definitions[modelName];
                        }
                    }
                    for (let modelName of childDiscriminatorModels) {
                        if (newSwagger.definitions[modelName]) {
                            delete newSwagger.definitions[modelName];
                        }
                    }
                    // Override references to Discriminator Models with JsonNode (generic object)
                    if (!newSwagger.definitions['JsonNode']) {
                        newSwagger.definitions['JsonNode'] = { type: ItemsType.Object };
                    }
                    let definitionsAsString = JSON.stringify(newSwagger.definitions);
                    let pathsAsString = JSON.stringify(newSwagger.paths);
                    let modelsToOverride: string[] = [...modelsWithDiscriminator, ...childDiscriminatorModels];
                    for (let modelName of modelsToOverride) {
                        let regexConvertRef = new RegExp(String.raw`"#\/definitions\/${modelName}"`, "g");
                        definitionsAsString = definitionsAsString.replace(regexConvertRef, '"#/definitions/JsonNode"');
                        pathsAsString = pathsAsString.replace(regexConvertRef, '"#/definitions/JsonNode"');
                    }
                    newSwagger.definitions = JSON.parse(definitionsAsString);
                    newSwagger.paths = JSON.parse(pathsAsString);
                } else if (discriminatorManagement === 'quarantine') {
                    // Quarantine
                    // Find models with a direct or indirect reference on modelsWithDiscriminator or childDiscriminatorModels
                    // Init with discriminator based models and their children
                    let modelsToQuarantine: string[] = [...modelsWithDiscriminator, ...childDiscriminatorModels];
                    // Recursive processing to find models
                    let searchModels: string[] = [...modelsToQuarantine];
                    let foundModels: string[] = [];
                    let findingCompleted: boolean = false;
                    while (findingCompleted !== true) {
                        for (let modelName in newSwagger.definitions) {
                            if (!modelsToQuarantine.includes(modelName)) {
                                let definitionAsString = JSON.stringify(newSwagger.definitions[modelName]);
                                for (let defName of searchModels) {
                                    if (definitionAsString.includes(`"#/definitions/${defName}"`)) {
                                        foundModels.push(modelName);
                                        break;
                                    }
                                }
                            }
                        }
                        if (foundModels.length === 0) {
                            findingCompleted = true;
                        } else {
                            searchModels = [];
                            for (let defName of foundModels) {
                                searchModels.push(defName);
                                modelsToQuarantine.push(defName);
                            }
                            foundModels = [];
                        }
                    }
                    log.info(`Found Discriminator based Models, children and dependencies: ${modelsToQuarantine.toString()}`);

                    // Find operations with a reference to a model involving discriminator directly or indirectly
                    let operationsToQuarantine: string[] = [];
                    if (modelsToQuarantine.length > 0) {
                        const paths = Object.keys(newSwagger.paths);
                        for (const path of paths) {
                            const methods = Object.keys(newSwagger.paths[path]);
                            for (const method of methods) {
                                let operation = newSwagger.paths[path][method];
                                let operationAsString = JSON.stringify(operation);
                                for (let defName of modelsToQuarantine) {
                                    if (operationAsString.includes(`"#/definitions/${defName}"`)) {
                                        operationsToQuarantine.push(operation.operationId);
                                        break;
                                    }
                                }
                            }
                        }
                        log.info(`Found Operations referencing Discriminator based Models: ${operationsToQuarantine.toString()}`);
                    }

                    // Quarantine (delete) found operations and models
                    // Remove identified models from Swagger
                    if (modelsToQuarantine.length > 0) {
                        for (let modelName of modelsToQuarantine) {
                            if (newSwagger.definitions[modelName]) {
                                delete newSwagger.definitions[modelName];
                            }
                        }
                    }
                    // Remove identified operations from Swagger
                    if (operationsToQuarantine.length > 0) {
                        const paths = Object.keys(newSwagger.paths);
                        for (const path of paths) {
                            const methods = Object.keys(newSwagger.paths[path]);
                            for (const method of methods) {
                                let operation = newSwagger.paths[path][method];
                                if (operation && operation.operationId && operationsToQuarantine.includes(operation.operationId)) {
                                    // Remove Operation
                                    delete newSwagger.paths[path][method];
                                }
                            }
                            const remainingMethods = Object.keys(newSwagger.paths[path]);
                            if (remainingMethods.length == 0) {
                                delete newSwagger.paths[path];
                            }
                        }
                    }
                }
            }
        }
    }
    return;
}

function quarantineOperationsAndModels(newSwagger: Swagger, quarantineOperationIds: string[], quarantineModels: string[]) {
    if (quarantineOperationIds && quarantineOperationIds.length > 0) {
        log.info(`Quarantine for OperationIds: ${quarantineOperationIds.toString()}`);
        const paths = Object.keys(newSwagger.paths);
        for (const path of paths) {
            const methods = Object.keys(newSwagger.paths[path]);
            for (const method of methods) {
                let operation = newSwagger.paths[path][method];
                if (operation && operation.operationId && quarantineOperationIds.includes(operation.operationId)) {
                    // Remove Operation
                    delete newSwagger.paths[path][method];
                }
            }
            const remainingMethods = Object.keys(newSwagger.paths[path]);
            if (remainingMethods.length == 0) {
                delete newSwagger.paths[path];
            }
        }
    }
    if (quarantineModels && quarantineModels.length > 0) {
        log.info(`Quarantine for Models: ${quarantineModels.toString()}`);
        for (const modelName of quarantineModels) {
            if (newSwagger.definitions[modelName]) {
                delete newSwagger.definitions[modelName];
            }
        }
    }
    return;
}

function overrideOperations(newSwagger: Swagger, overrideOperationIds: any) {
    if (overrideOperationIds && Object.keys(overrideOperationIds).length > 0) {
        const overridePaths = Object.keys(overrideOperationIds);
        for (const path of overridePaths) {
            const overrideMethods = Object.keys(overrideOperationIds[path]);
            for (const method of overrideMethods) {
                let newOperationId = overrideOperationIds[path][method];
                if (newSwagger.paths && newSwagger.paths[path] && newSwagger.paths[path][method]) {
                    let operation = newSwagger.paths[path][method];
                    if (operation && operation.operationId) {
                        log.info(`Override OperationId (path: ${path}, method: ${method}): old=${operation.operationId}, new=${newOperationId}`);
                        operation.operationId = newOperationId;
                    }
                    if (operation && operation["x-purecloud-method-name"]) {
                        operation["x-purecloud-method-name"] = newOperationId;
                    }
                }
            }
        }
    }
    return;
}

function processPaths(newSwagger: Swagger, codegenLanguage: string) {
    const paths = Object.keys(newSwagger.paths);
    for (const path of paths) {
        if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && !path.startsWith("/api/v2/apps/agentic") && codegenLanguage === "purecloudpython")) {
            delete newSwagger.paths[path]
        }
    }

    if (codegenLanguage !== "purecloudpython") return

    const definitions = Object.keys(newSwagger.definitions);
    for (const definition of definitions) {
        if (definition.endsWith("_")) {
            delete newSwagger.definitions[definition]
        }
    }
}

function processRefs(newSwagger: Swagger) {
    const keys = Object.keys(newSwagger.definitions);
    keys.forEach((key, index) => {
        let obj = newSwagger.definitions[key].properties;
        if (obj) {
            const keys = Object.keys(obj);
            keys.forEach((key2, index) => {
                let obj2 = obj[key2];
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
        } else if (newSwagger.definitions[key].allOf) {
			for (let allOfElement of newSwagger.definitions[key].allOf) {
				let obj = allOfElement.properties;
				if (obj) {
					const keys = Object.keys(obj);
					keys.forEach((key2, index) => {
						let obj2 = obj[key2];
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
			}
		}
    });
}

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function extractDefinitons(newSwagger: Swagger, entity: { [key: string]: any }) {
    try {
        _.forOwn(entity, (property, key) => {
            // Rewrite URN refs to JSON refs
            if (key == '$ref' && !property.startsWith('#')) {
                entity[key] = '#/definitions/' + getNotificationClassName(property);
            }

            // Force int64 integers
            if (forceInt64Integers == true) {
                if (key == 'type' && property == 'integer') {
                    if (!entity['format']) {
                        entity['format'] = 'int64';
                    }
                }
            }
            // Remove enum duplicates
            if (removeEnumDuplicates == true) {
                if (key == 'enum') {
                    if (entity["type"] && entity["type"] == "string") {
                        if (entity["enum"] && entity["enum"].length > 0) {
                            let filteredEnum: string[] = [];
                            let upperCaseEnum: string[] = [];
                            for (let enumValue of entity["enum"]) {
                                if (!upperCaseEnum.includes(enumValue.toUpperCase())) {
                                    upperCaseEnum.push(enumValue.toUpperCase());
                                    filteredEnum.push(enumValue);
                                } else {
                                    log.info(`Duplicate enum value in topic: ${enumValue}. Removing it...`);
                                }
                            }
                            entity["enum"] = filteredEnum;
                        }
                    }
                }
            }

            // Recurse on objects
            if (typeof property !== 'object') return;
            extractDefinitons(newSwagger, property);

            // Update object to ref
            if (property.id && typeof property.id === 'string') {
                let className = getNotificationClassName(property.id);

                // Store definition
                newSwagger.definitions[className] = JSON.parse(JSON.stringify(property));

                // Set reference
                entity[key] = {
                    type: 'object',
                    $ref: `#/definitions/${className}`,
                };
            }
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(err);
            console.log(err.stack);
        }
    }
}


function checkAndThrow(haystack: Haystack, needle: string, message: string = `${needle} must be set!`): void {
    if (!haystack[needle] || haystack[needle] === '') {
        throw new Error(message);
    }
}

function getEnv(
    varname: string,
    defaultValue: string = '',
    isdefaultValue: boolean = false
): string | boolean {
    varname = varname.trim();
    const envVar = process.env[varname];
    log.silly(`ENV: ${varname}->${envVar}`);

    if (!envVar && defaultValue !== '') {
        if (isdefaultValue === true) {
            log.info(`Using default value for ${varname}: ${defaultValue}`);
        } else {
            log.warn(`Using override for ${varname}: ${defaultValue}`);
        }
        return defaultValue;
    }

    if (envVar) {
        if (envVar.toLowerCase() === 'true') {
            return true;
        } else if (envVar.toLowerCase() === 'false') {
            return false;
        } else {
            return envVar;
        }
    }

    return defaultValue;
}

//#endregion

/************************************************************************************
 * Merge Swagger specifications
 *************************************************************************************/

// This function will combine the public swagger with the preview swagger
export function combineSwagger(publicSwagger: Swagger, preview: Swagger) {
	log.info('Combining public and preview swagger docs into one');

	// Set new file equal to public file for now
	let newSwaggerFile = publicSwagger;

	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	preview.tags.forEach((previewTag) => {
		let duplicate = publicSwagger.tags.some((publicTag) => publicTag.name === previewTag.name);
		if (!duplicate) {
			newSwaggerFile.tags.push(previewTag);
		}
	});

	// mark preview paths as preview(similar to marking as deprecated)
	for (const [key1, value1] of Object.entries(preview.paths)) {
		for (const [key, value] of Object.entries(value1)) {
			preview.paths[key1][key]['x-genesys-preview'] = true;
		}
	}

	// Search for paths in the preview swagger not in the public swagger(should be all paths) and add preview paths to new JSON object
	let previewPaths = Object.keys(preview.paths);
	let publicPaths = Object.keys(publicSwagger.paths);
	for (let i = 0; i < previewPaths.length; i++) {
		if (publicPaths.includes(previewPaths[i])) {
			// Path does exist in public swagger, add the preview HTTP method to the existing path in the new JSON object
			for (const [key, value] of Object.entries(preview.paths[previewPaths[i]])) {
				newSwaggerFile.paths[previewPaths[i]][key] = value;
			}
		} else {
			// Path does not exist in public swagger, add the preview path to the new JSON objects paths
			newSwaggerFile.paths[previewPaths[i]] = preview.paths[previewPaths[i]];
		}
	}

	// Search for definitions in the preview swagger not in the public swagger and add preview definitions to new JSON object
	let previewDefinitions = Object.keys(preview.definitions);
	let publicDefinitions = Object.keys(publicSwagger.definitions);
	for (let i = 0; i < previewDefinitions.length; i++) {
		if (!publicDefinitions.includes(previewDefinitions[i])) {
			newSwaggerFile.definitions[previewDefinitions[i]] = preview.definitions[previewDefinitions[i]];
		}
	}

	return newSwaggerFile
}
