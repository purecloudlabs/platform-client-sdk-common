import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { ItemsType, Format, Swagger } from '../types/swagger.js';
import { Builder } from '../builder/builder.js';
import { gcLoginClientCredentialsGrant, BuilderHttpError, AvailableTopicEntityListing, gcGetNotificationsAvailabletopics } from '../util/http.js';
import { checkAndThrow, getEnv } from '../util/utils.js';
import { log } from '../log/logger.js';

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

export async function swaggerPreprocessing(builder: Builder, swagger: Swagger) {
    return new Promise<string>((resolve, reject) => {
        try {
            log.debug('Adding notifications to schema');
            addNotifications(builder, swagger)
                .then(() => {
                    log.debug('Processing swagger paths');
                    return processPaths(builder, swagger);
                })
                .then(() => {
                    log.debug('Processing swagger references');
                    return processRefs(swagger);
                })
                .then(() => {
                    log.debug('Processing any types in schema');
                    return processAnyTypes(swagger);
                })
                .then(() => {
                    let forceCSVCollectionFormatInTags: string[] = [];
                    if (builder.config.settings.swagger) {
                        let allSwaggerSettings: any = builder.config.settings.swagger;
                        if (allSwaggerSettings.forceCSVCollectionFormatOnTags) {
                            forceCSVCollectionFormatInTags = allSwaggerSettings.forceCSVCollectionFormatOnTags;
                        }
                    }
                    return forceCSVCollectionFormat(swagger, forceCSVCollectionFormatInTags);
                })
                .then(() => {
                    return quarantineOperationsAndModels(swagger, quarantineOperationIds, quarantineModels);
                })
                .then(() => {
                    let discriminatorManagement: string = defaultDiscriminatorManagement;
                    if (builder.config.settings.swagger) {
                        let allSwaggerSettings: any = builder.config.settings.swagger;
                        if (allSwaggerSettings.discriminatorManagement !== null && allSwaggerSettings.discriminatorManagement !== undefined) {
                            if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'keep') {
                                discriminatorManagement = 'keep';
                            } else if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'quarantine') {
                                discriminatorManagement = 'quarantine';
                            } else if (allSwaggerSettings.discriminatorManagement.toLowerCase() === 'override') {
                                discriminatorManagement = 'override';
                            }
                        }
                    }
                    return manageDiscriminator(swagger, discriminatorManagement, keepDiscriminatorModels);
                })
                .then(() => {
                    return overrideOperations(swagger, overrideOperationIds);
                })
				.then(() => {
					log.debug('Swagger Preprocessing completed.');
					resolve("");
				})
                .catch((err: unknown) => {
                    log.error(`Error - failed: ${err instanceof Error ? err.message : String(err)}`);
                    if (err instanceof Error) {
                        log.debug(`Stack trace: ${err.stack}`);
                    }
					reject(err);
				});
        } catch (err: unknown) {
			log.error(`Error - caught exception: ${err instanceof Error ? err.message : String(err)}`);
			reject(err);
		}
    });
}

/* PRIVATE FUNCTIONS */

function addNotifications(builder: Builder, swagger: Swagger): Promise<string> {
	return new Promise<string>((resolve, reject) => {

		try {
			// Skip notifications
			if (getEnv('EXCLUDE_NOTIFICATIONS') === true) {
				log.info('Not adding notifications to schema');
				resolve("");
			}

			// Check PureCloud settings
			checkAndThrow(builder.pureCloud, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
			checkAndThrow(builder.pureCloud, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
			checkAndThrow(builder.pureCloud, 'environment', 'PureCloud environment was blank!');

			gcLoginClientCredentialsGrant(builder.pureCloud.environment, builder.pureCloud.clientId, builder.pureCloud.clientSecret)
				.then((access_token) => {
					return gcGetNotificationsAvailabletopics(builder.pureCloud.environment, access_token);
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
						extractDefinitons(swagger, entity.schema);
						swagger.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
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

function processAnyTypes(swagger: Swagger) {
	const keys = Object.keys(swagger.definitions);
	keys.forEach((key, index) => {
		let obj = swagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(swagger.definitions[key].properties);
			keys.forEach((key2, index) => {
				let obj2 = swagger.definitions[key].properties[key2];
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

function forceCSVCollectionFormat(swagger: Swagger, forceCSVCollectionFormatInTags: string[]) {
	if (forceCSVCollectionFormatInTags && forceCSVCollectionFormatInTags.length > 0) {
		log.info(`Updating CollectionFormat from multi to csv for operations with tags: ${forceCSVCollectionFormatInTags.toString()}`);
		const paths = Object.keys(swagger.paths);
		for (const path of paths) {
			const methods = Object.keys(swagger.paths[path]);
			for (const method of methods) {
				let operation = swagger.paths[path][method];
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

function manageDiscriminator(swagger: Swagger, discriminatorManagement: string, keepDiscriminatorModels: string[]) {
	if (discriminatorManagement !== null && discriminatorManagement !== undefined && discriminatorManagement !== 'keep') {
		let modelsWithDiscriminator: string[] = [];
		let childDiscriminatorModels: string[] = [];
		// Find Models with Discriminator
		if (swagger.definitions) {
			for (let modelName in swagger.definitions) {
				if (swagger.definitions[modelName].discriminator) {
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
			for (let modelName in swagger.definitions) {
				if (swagger.definitions[modelName].allOf) {
					for (let compositeModel of swagger.definitions[modelName].allOf) {
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
					if (swagger.definitions[modelName]) {
						delete swagger.definitions[modelName];
					}
				}
				for (let modelName of childDiscriminatorModels) {
					if (swagger.definitions[modelName]) {
						delete swagger.definitions[modelName];
					}
				}
				// Override references to Discriminator Models with JsonNode (generic object)
				if (!swagger.definitions['JsonNode']) {
					swagger.definitions['JsonNode'] = { type: ItemsType.Object };
				}
				let definitionsAsString = JSON.stringify(swagger.definitions);
				let pathsAsString = JSON.stringify(swagger.paths);
				let modelsToOverride: string[] = [...modelsWithDiscriminator, ...childDiscriminatorModels];
				for (let modelName of modelsToOverride) {
					let regexConvertRef = new RegExp(String.raw`"#\/definitions\/${modelName}"`, "g");
					definitionsAsString = definitionsAsString.replace(regexConvertRef, '"#/definitions/JsonNode"');
					pathsAsString = pathsAsString.replace(regexConvertRef, '"#/definitions/JsonNode"');
				}
				swagger.definitions = JSON.parse(definitionsAsString);
				swagger.paths = JSON.parse(pathsAsString);
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
					for (let modelName in swagger.definitions) {
						if (!modelsToQuarantine.includes(modelName)) {
							let definitionAsString = JSON.stringify(swagger.definitions[modelName]);
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
					const paths = Object.keys(swagger.paths);
					for (const path of paths) {
						const methods = Object.keys(swagger.paths[path]);
						for (const method of methods) {
							let operation = swagger.paths[path][method];
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
						if (swagger.definitions[modelName]) {
							delete swagger.definitions[modelName];
						}
					}
				}
				// Remove identified operations from Swagger
				if (operationsToQuarantine.length > 0) {
					const paths = Object.keys(swagger.paths);
					for (const path of paths) {
						const methods = Object.keys(swagger.paths[path]);
						for (const method of methods) {
							let operation = swagger.paths[path][method];
							if (operation && operation.operationId && operationsToQuarantine.includes(operation.operationId)) {
								// Remove Operation
								delete swagger.paths[path][method];
							}
						}
						const remainingMethods = Object.keys(swagger.paths[path]);
						if (remainingMethods.length == 0) {
							delete swagger.paths[path];
						}
					}
				}
			}
		}
	}
	return;
}

function quarantineOperationsAndModels(swagger: Swagger, quarantineOperationIds: string[], quarantineModels: string[]) {
	if (quarantineOperationIds && quarantineOperationIds.length > 0) {
		log.info(`Quarantine for OperationIds: ${quarantineOperationIds.toString()}`);
		const paths = Object.keys(swagger.paths);
		for (const path of paths) {
			const methods = Object.keys(swagger.paths[path]);
			for (const method of methods) {
				let operation = swagger.paths[path][method];
				if (operation && operation.operationId && quarantineOperationIds.includes(operation.operationId)) {
					// Remove Operation
					delete swagger.paths[path][method];
				}
			}
			const remainingMethods = Object.keys(swagger.paths[path]);
			if (remainingMethods.length == 0) {
				delete swagger.paths[path];
			}
		}
	}
	if (quarantineModels && quarantineModels.length > 0) {
		log.info(`Quarantine for Models: ${quarantineModels.toString()}`);
		for (const modelName of quarantineModels) {
			if (swagger.definitions[modelName]) {
				delete swagger.definitions[modelName];
			}
		}
	}
	return;
}

function overrideOperations(swagger: Swagger, overrideOperationIds: any) {
	if (overrideOperationIds && Object.keys(overrideOperationIds).length > 0) {
		const overridePaths = Object.keys(overrideOperationIds);
		for (const path of overridePaths) {
			const overrideMethods = Object.keys(overrideOperationIds[path]);
			for (const method of overrideMethods) {
				let newOperationId = overrideOperationIds[path][method];
				if (swagger.paths && swagger.paths[path] && swagger.paths[path][method]) {
					let operation = swagger.paths[path][method];
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

function processPaths(builder: Builder, swagger: Swagger) {
	const paths = Object.keys(swagger.paths);
	for (const path of paths) {
		if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && !path.startsWith("/api/v2/apps/agentic") && builder.config.settings.swaggerCodegen.codegenLanguage === "purecloudpython")) {
			delete swagger.paths[path]
		}
	}

	if (builder.config.settings.swaggerCodegen.codegenLanguage !== "purecloudpython") return

	const definitions = Object.keys(swagger.definitions);
	for (const definition of definitions) {
		if (definition.endsWith("_")) {
			delete swagger.definitions[definition]
		}
	}
}

function processRefs(swagger: Swagger) {
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
}

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function extractDefinitons(swagger: Swagger, entity: { [key: string]: any }) {
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
			extractDefinitons(swagger, property);

			// Update object to ref
			if (property.id && typeof property.id === 'string') {
				let className = getNotificationClassName(property.id);

				// Store definition
				swagger.definitions[className] = JSON.parse(JSON.stringify(property));

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
