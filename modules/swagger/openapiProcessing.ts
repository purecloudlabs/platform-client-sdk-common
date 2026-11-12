import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { OpenApiSpec, Operation, Tag, Definition, Property } from '../types/openapiSpec.js';
import { log } from '../log/logger.js';
import { gcLoginClientCredentialsGrant, AvailableTopicEntityListing, gcGetNotificationsAvailabletopics } from '../util/http.js';
import { PureCloud, Haystack, Config } from '../types/config.js';

/************************************************************************************
 * Preprocessing of the OpenApi specification
 *************************************************************************************/

const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;
// Override available topics schema properties from type: "integer" to type: "integer", format: "int64"
let forceInt64Integers = true;
// Remove duplicates in topics enumerations
let removeEnumDuplicates = true;

const SECURITY_NO_AUTH = "NO_AUTH";

// Quarantine/keep Operations
const defaultFilterSettings: QuarantineKeepSettings = {
	keep: {
		tags: [],
		operationIds: [],
		paths: [],
		securities: []
	},
	quarantine: {
		tags: [],
		operationIds: [],
		paths: [],
		securities: []
	}
}

export function openapiPreprocessing(newOpenApiSpec: OpenApiSpec, pureCloud: PureCloud, config: Config): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		try {
			log.debug('Filtering OpenApi specification');
			filterOpenApiSpec(newOpenApiSpec, defaultFilterSettings);
			log.debug('Replace Models defined as a type array');
			replaceTypeArrayModels(newOpenApiSpec);
			log.debug('Explore properties recursively');
			openapiExploreProperties(newOpenApiSpec);
			log.debug('Adding notifications to schema');
			addNotifications(newOpenApiSpec, pureCloud)
				.then(() => {
					log.debug('Removing unused tags and definitions');
					openapiRemoveUnused(newOpenApiSpec);
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

interface QuarantineKeepSettings {
	keep?: {
		tags?: string[];
		operationIds?: string[];
		paths?: string[];
		securities?: string[]; // NO_AUTH for operations with no security/authentication
	},
	quarantine?: {
		tags?: string[];
		operationIds?: string[];
		paths?: string[];
		securities?: string[]; // NO_AUTH for operations with no security/authentication
	}
}

function filterOpenApiSpec(newOpenApiSpec: OpenApiSpec, filterSettings: QuarantineKeepSettings) {
	for (let pathKey in newOpenApiSpec.paths) {
		let oPath = newOpenApiSpec.paths[pathKey];
		let keepPath: boolean = true;

		if (keepPath == true && filterSettings?.keep?.paths && filterSettings.keep.paths.length > 0) {
			keepPath = false;
			if (filterSettings.keep.paths.includes(pathKey)) {
				keepPath = true;
			}
		}
		if (keepPath == true && filterSettings?.quarantine?.paths && filterSettings.quarantine.paths.length > 0) {
			keepPath = true;
			if (filterSettings.quarantine.paths.includes(pathKey)) {
				keepPath = false;
			}
		}

		if (keepPath == false) {
			delete newOpenApiSpec.paths[pathKey]
		} else {
			for (let methodKey in oPath) {
				let oOperation = oPath[methodKey];
				let keepOperation: boolean = true;

				if (keepOperation == true && filterSettings?.keep?.operationIds && filterSettings.keep.operationIds.length > 0) {
					keepOperation = false;
					if (filterSettings.keep.operationIds.includes(oOperation.operationId)) {
						keepOperation = true;
					}
				}
				if (keepOperation == true && filterSettings?.quarantine?.operationIds && filterSettings.quarantine.operationIds.length > 0) {
					keepOperation = true;
					if (filterSettings.quarantine.operationIds.includes(oOperation.operationId)) {
						keepOperation = false;
					}
				}

				if (keepOperation == true && filterSettings?.keep?.tags && filterSettings.keep.tags.length > 0) {
					keepOperation = false;
					if (oOperation.tags && oOperation.tags.length > 0) {
						for (let tagName of oOperation.tags) {
							if (filterSettings.keep.tags.includes(tagName)) {
								keepOperation = true;
								break;
							}
						}
					}
				}
				if (keepOperation == true && filterSettings?.quarantine?.tags && filterSettings.quarantine.tags.length > 0) {
					keepOperation = true;
					if (oOperation.tags && oOperation.tags.length > 0) {
						for (let tagName of oOperation.tags) {
							if (filterSettings.quarantine.tags.includes(tagName)) {
								keepOperation = false;
								break;
							}
						}
					}
				}

				if (keepOperation == true && filterSettings?.keep?.securities && filterSettings.keep.securities.length > 0) {
					keepOperation = false;
					if (oOperation.security && oOperation.security.length > 0) {
						for (let oSecurity of oOperation.security) {
							if (Object.keys(oSecurity).length > 0) {
								let secName = Object.keys(oSecurity)[0];
								if (filterSettings.keep.securities.includes(secName)) {
									keepOperation = true;
									break;
								}
							} else {
								if (filterSettings.keep.securities.includes(SECURITY_NO_AUTH)) {
									keepOperation = true;
									break;
								}
							}
						}
					} else {
						if (filterSettings.keep.securities.includes(SECURITY_NO_AUTH)) {
							keepOperation = true;
						}
					}
				}
				if (keepOperation == true && filterSettings?.quarantine?.securities && filterSettings.quarantine.securities.length > 0) {
					keepOperation = true;
					if (oOperation.security && oOperation.security.length > 0) {
						for (let oSecurity of oOperation.security) {
							if (Object.keys(oSecurity).length > 0) {
								let secName = Object.keys(oSecurity)[0];
								if (filterSettings.quarantine.securities.includes(secName)) {
									keepOperation = false;
									break;
								}
							} else {
								if (filterSettings.quarantine.securities.includes(SECURITY_NO_AUTH)) {
									keepOperation = false;
									break;
								}
							}
						}
					} else {
						if (filterSettings.quarantine.securities.includes(SECURITY_NO_AUTH)) {
							keepOperation = false;
						}
					}
				}

				if (keepOperation == false) {
					delete oPath[methodKey];
				}
			}
			if (Object.keys(oPath).length == 0) {
				delete newOpenApiSpec.paths[pathKey]
			}
		}
	}
}

function replaceTypeArrayModels(newOpenApiSpec: OpenApiSpec) {
	let replaceModels: Record<string, any> = {};

	let allModelNames = Object.keys(newOpenApiSpec.components.schemas);
	for (let modelName of allModelNames) {
		let model = newOpenApiSpec.components.schemas[modelName];
		if (model.type && model.type == 'array') {
			replaceModels[modelName] = model;
		}
		delete newOpenApiSpec.components.schemas[modelName];
	}

	let openapiPathsAsString = JSON.stringify(newOpenApiSpec.paths);
	let openapiSchemasAsString = JSON.stringify(newOpenApiSpec.components.schemas);

	for (let modelName in replaceModels) {
		let regexModelRef = new RegExp(String.raw`"\$ref":"#\/components\/schemas\/${modelName}"`, "g");
		let newModelRef = `"type":"array","items":${JSON.stringify(replaceModels[modelName].items)}`;
		openapiPathsAsString = openapiPathsAsString.replace(regexModelRef, newModelRef);
		openapiSchemasAsString = openapiSchemasAsString.replace(regexModelRef, newModelRef);
	}

	newOpenApiSpec.paths = JSON.parse(openapiPathsAsString);
	newOpenApiSpec.components.schemas = JSON.parse(openapiSchemasAsString);
}

function openapiRemoveUnused(newOpenApiSpec: OpenApiSpec) {
	log.info('openapiRemoveUnused starting processing...');

	let declaredTags: string[] = [];
	if (newOpenApiSpec?.tags && newOpenApiSpec.tags.length > 0) {
		declaredTags = newOpenApiSpec.tags.map((x) => x.name);
	}
	let declaredSecurities: string[] = [];
	if (newOpenApiSpec?.components?.securitySchemes) {
		declaredSecurities = Object.keys(newOpenApiSpec.components.securitySchemes);
	}
	let usedTags: string[] = [];
	let usedSecurities: string[] = [];
	let usedConsumes: string[] = [];
	let usedProduces: string[] = [];

	// Collect Info
	if (newOpenApiSpec?.paths) {
		for (let pathKey in newOpenApiSpec.paths) {
			for (let methodKey in newOpenApiSpec.paths[pathKey]) {
				let operation: Operation = newOpenApiSpec.paths[pathKey][methodKey];
				if (operation.tags && operation.tags.length > 0) {
					for (let tagName of operation.tags) {
						if (!usedTags.includes(tagName)) usedTags.push(tagName);
					}
				}
				if (operation.security && operation.security.length > 0) {
					for (let oSecurity of operation.security) {
						let oSecKeys = Object.keys(oSecurity);
						if (oSecKeys.length > 0) {
							if (!usedSecurities.includes(oSecKeys[0])) usedSecurities.push(oSecKeys[0]);
						} else {
							// NO_AUTH
							if (!usedSecurities.includes(SECURITY_NO_AUTH)) usedSecurities.push(SECURITY_NO_AUTH);
						}
					}
				} else {
					// NO_AUTH
					if (!usedSecurities.includes(SECURITY_NO_AUTH)) usedSecurities.push(SECURITY_NO_AUTH);
				}
				if (operation.requestBody && operation.requestBody.content) {
					for (let contentType in operation.requestBody.content) {
						if (!usedConsumes.includes(contentType)) usedConsumes.push(contentType);
					}
				}
				if (operation.responses) {
					for (let respCode in operation.responses) {
						if (!respCode.startsWith('4') && !respCode.startsWith('5')) {
							// 2xx,3xx,default
							let oResponse = operation.responses[respCode];
							if (oResponse.content) {
								for (let contentType in oResponse.content) {
									if (!usedProduces.includes(contentType)) usedProduces.push(contentType);
								}
							}
						}
					}
				}
			}
		}
	}

	// Remove unused definitions
	let discoveredDefinitionNames: string[] = []
	let regexDefinitionName = /"\$ref":"#\/components\/schemas\/([^"]*)"/g;
	if (newOpenApiSpec?.paths) {
		let inputString = JSON.stringify(newOpenApiSpec.paths);
		let matches: any;
		while (matches = regexDefinitionName.exec(inputString)) {
			if (matches[1] && !matches[1].endsWith("\\")) {
				if (!discoveredDefinitionNames.includes(matches[1])) discoveredDefinitionNames.push(matches[1]);
			} else {
				// Ignore what could come from property description or notes
			}
		}
	}
	if (newOpenApiSpec?.components?.schemas) {
		// Gather info on polymorphism
		let polymorphismDefinitions: Record<string, string[]> = {};
		for (let modelName in newOpenApiSpec.components.schemas) {
			let model = newOpenApiSpec.components.schemas[modelName];
			if (model.allOf && model.allOf.length > 0) {
				for (let allOfElement of model.allOf) {
					if (allOfElement['$ref']) {
						let parentName = allOfElement['$ref'].replace('#/components/schemas/', '');
						if (!polymorphismDefinitions[parentName]) polymorphismDefinitions[parentName] = [];
						if (!polymorphismDefinitions[parentName].includes(modelName)) polymorphismDefinitions[parentName].push(modelName);
					}
				}
			}
		}
		let namesToProcess: string[] = [...discoveredDefinitionNames];
		let discoveredNames: string[] = [];
		while (namesToProcess.length > 0) {
			let modelsToInvestigate: Record<string, Definition> = {};
			for (let name of namesToProcess) {
				modelsToInvestigate[name] = newOpenApiSpec.components.schemas[name];
				if (!discoveredDefinitionNames.includes(name)) discoveredDefinitionNames.push(name);
				// Polymorphism
				if (polymorphismDefinitions[name]) {
					for (let childName of polymorphismDefinitions[name]) {
						if (!discoveredDefinitionNames.includes(childName) && !namesToProcess.includes(childName)) {
							modelsToInvestigate[childName] = newOpenApiSpec.components.schemas[childName];
							discoveredDefinitionNames.push(childName);
						}
					}
				}
			}
			let inputString = JSON.stringify(modelsToInvestigate);
			let matches: any;
			while (matches = regexDefinitionName.exec(inputString)) {
				if (matches[1] && !matches[1].endsWith("\\")) {
					if (!discoveredDefinitionNames.includes(matches[1])) discoveredNames.push(matches[1]);
				} else {
					// Ignore what could come from property description or notes
				}
			}
			namesToProcess = [...discoveredNames];
		}

		// Delete unused definitions
		for (let modelName in newOpenApiSpec.components.schemas) {
			if (!discoveredDefinitionNames.includes(modelName)) delete newOpenApiSpec.components.schemas[modelName];
		}
	}

	// log missing tags, unused tags
	let missingTags: string[] = [];
	let unusedTags: string[] = [];
	for (let tagName of declaredTags) {
		if (!usedTags.includes(tagName)) unusedTags.push(tagName);
	}
	for (let tagName of usedTags) {
		if (!declaredTags.includes(tagName)) missingTags.push(tagName);
	}
	log.debug(`OpenApi Spec - Unused Tags: ${unusedTags.toString()}`);
	log.debug(`OpenApi Spec - Missing Tags: ${missingTags.toString()}`);
	// remove unused tags, add missing tags
	let updatedTags: Tag[] = [];
	if (newOpenApiSpec?.tags && newOpenApiSpec.tags.length > 0) {
		for (let oTag of newOpenApiSpec.tags) {
			if (!unusedTags.includes(oTag.name)) {
				updatedTags.push(oTag);
			}
		}
	}
	for (let tagName of missingTags) {
		let oTag: Tag = {
			name: tagName,
			description: tagName
		};
		updatedTags.push(oTag);
	}
	newOpenApiSpec.tags = updatedTags;
	log.debug('OpenApi Spec - Tags have been updated');

	// log missing securities, unused security
	log.debug(`OpenApi Spec - Declared Security Schemes: ${declaredSecurities.toString()}`);
	log.debug(`OpenApi Spec - Distinct Security Schemes: ${usedSecurities.toString()}`);

	// log collected info
	log.debug(`OpenApi Spec - Distinct Consumes: ${usedConsumes.toString()}`);
	log.debug(`OpenApi Spec - Distinct Produces: ${usedProduces.toString()}`);

	log.info('openapiRemoveUnused processing completed.')
}

function openapiExploreProperties(newOpenApiSpec: OpenApiSpec) {
	let usedInProperty: Record<string, any> = {};
	usedInProperty["usedFormats"] = {};
	usedInProperty["usedPropertyNames"] = [];

	let operationPropertyNames: string[] = [];
	let parameterPropertyNames: string[] = [];
	let requestBodyPropertyNames: string[] = [];
	let responseSuccessPropertyNames: string[] = [];
	let responseErrorPropertyNames: string[] = [];
	let modelPropertyNames: string[] = [];

	if (newOpenApiSpec?.paths) {
		for (let pathKey in newOpenApiSpec.paths) {
			for (let methodKey in newOpenApiSpec.paths[pathKey]) {
				let operation = newOpenApiSpec.paths[pathKey][methodKey];
				for (let propertyName of Object.keys(operation)) {
					if (!operationPropertyNames.includes(propertyName)) operationPropertyNames.push(propertyName);
				}

				// operation.parameters
				if (operation.parameters && operation.parameters.length > 0) {
					for (let oParam of operation.parameters) {
						for (let propertyName of Object.keys(oParam)) {
							if (!parameterPropertyNames.includes(propertyName)) parameterPropertyNames.push(propertyName);
						}

						if (oParam.schema) {
							openapiExploreProperty(usedInProperty, oParam.schema);
						}
					}
				}
				// operation.requestBody
				if (operation.requestBody) {
					for (let propertyName of Object.keys(operation.requestBody)) {
						if (!requestBodyPropertyNames.includes(propertyName)) requestBodyPropertyNames.push(propertyName);
					}

					if (operation.requestBody.content) {
						for (let contentType in operation.requestBody.content) {
							let oContent = operation.requestBody.content[contentType];
							if (oContent.schema) {
								openapiExploreProperty(usedInProperty, oContent.schema);
							}
						}
					}
				}

				// operation.responses
				if (operation.responses) {
					// split per responseCode - 4xx/5xx and 1xx/2xx/3xx/default
					for (let respCode in operation.responses) {
						if (respCode.startsWith('4') || respCode.startsWith('5')) {
							// 4xx/5xx
							let oResp = operation.responses[respCode];
							for (let propertyName of Object.keys(oResp)) {
								if (!responseErrorPropertyNames.includes(propertyName)) responseErrorPropertyNames.push(propertyName);
							}

							// ... Do nothing...
						} else {
							// 1xx/2xx/3xx/default
							let oResp = operation.responses[respCode];
							for (let propertyName of Object.keys(oResp)) {
								if (!responseSuccessPropertyNames.includes(propertyName)) responseSuccessPropertyNames.push(propertyName);
							}

							if (oResp.content) {
								for (let contentType in oResp.content) {
									let oContent = oResp.content[contentType];
									if (oContent.schema) {
										openapiExploreProperty(usedInProperty, oContent.schema);
									}
								}
							}
						}
					}
				}
			}
		}
	}
	if (newOpenApiSpec?.components?.schemas) {
		for (let modelName in newOpenApiSpec.components.schemas) {
			let model = newOpenApiSpec.components.schemas[modelName];
			for (let propertyName of Object.keys(model)) {
				if (!modelPropertyNames.includes(propertyName)) modelPropertyNames.push(propertyName);
			}

			if (model.allOf) {
				if (model.allOf.length > 0) {
					for (let element of model.allOf) {
						if (JSON.stringify(element) !== "{}") {
							openapiExploreProperty(usedInProperty, element);
						} else {
							// Do nothing
						}
					}
				} else {
					// Do nothing
				}
			}
			if (model.oneOf) {
				if (model.oneOf.length > 0) {
					for (let element of model.oneOf) {
						if (JSON.stringify(element) !== "{}") {
							openapiExploreProperty(usedInProperty, element);
						} else {
							// Do nothing
						}
					}
				} else {
					// Do nothing
				}
			}
			if (model.anyOf) {
				if (model.anyOf.length > 0) {
					for (let element of model.anyOf) {
						if (JSON.stringify(element) !== "{}") {
							openapiExploreProperty(usedInProperty, element);
						} else {
							// Do nothing
						}
					}
				} else {
					// Do nothing
				}
			}
			if (model['$ref']) {
				// Do nothing
			}
			if (model.type) {
				// Do nothing
			}
			if (model.properties) {
				let propNames = Object.keys(model.properties);
				if (propNames.length > 0) {
					for (let propName of propNames) {
						openapiExploreProperty(usedInProperty, model.properties[propName]);
					}
				} else {
					// Do nothing
				}
			}
			if (model.additionalProperties) {
				// could be: {}, or could be: true or could be a property
				if (typeof model.additionalProperties === "boolean") {
					// Do nothing
				} else if (typeof model.additionalProperties === "object") {
					if (JSON.stringify(model.additionalProperties) !== "{}") {
						openapiExploreProperty(usedInProperty, model.additionalProperties);
					} else {
						// Do nothing
					}
				} else {
					// Do nothing
				}
			}
			if (model.items) {
				// could be: {}, or could be a property
				if (JSON.stringify(model.items) !== "{}") {
					openapiExploreProperty(usedInProperty, model.items);
				} else {
					// Do nothing
				}
			}
		}
	}

	// log collected info
	log.debug(`OpenApi Spec - Operation Distinct Property Names: ${operationPropertyNames.toString()}`);
	log.debug(`OpenApi Spec - Parameter Distinct Property Names: ${parameterPropertyNames.toString()}`);
	log.debug(`OpenApi Spec - RequestBody Distinct Property Names: ${requestBodyPropertyNames.toString()}`);
	log.debug(`OpenApi Spec - Model Distinct Property Names: ${modelPropertyNames.toString()}`);
	log.debug(`OpenApi Spec - Success Response Distinct Property Names: ${responseSuccessPropertyNames.toString()}`);
	log.debug(`OpenApi Spec - Error Response Distinct Property Names: ${responseErrorPropertyNames.toString()}`);

	log.debug(`OpenApi Spec - Used in Property: ${JSON.stringify(usedInProperty, null, 4)}`);
}

function openapiExploreProperty(usedInProperty: Record<string, any>, exploreProperty: Property) {
	// Property
	// Replace enum with x-genesys-enum-members
	// for type: array with items, there might be properties with empty/first/last (incorrect export of openapi spec)
	// Recursive explore of properties

	for (let propertyName of Object.keys(exploreProperty)) {
		if (!usedInProperty.usedPropertyNames.includes(propertyName)) usedInProperty.usedPropertyNames.push(propertyName);
	}

	if (exploreProperty.allOf) {
		if (exploreProperty.allOf.length > 0) {
			for (let element of exploreProperty.allOf) {
				if (JSON.stringify(element) !== "{}") {
					openapiExploreProperty(usedInProperty, element);
				} else {
					// Do nothing
				}
			}
		} else {
			// Do nothing
		}
	}
	if (exploreProperty.oneOf) {
		if (exploreProperty.oneOf.length > 0) {
			for (let element of exploreProperty.oneOf) {
				if (JSON.stringify(element) !== "{}") {
					openapiExploreProperty(usedInProperty, element);
				} else {
					// Do nothing
				}
			}
		} else {
			// Do nothing
		}
	}
	if (exploreProperty.anyOf) {
		if (exploreProperty.anyOf.length > 0) {
			for (let element of exploreProperty.anyOf) {
				if (JSON.stringify(element) !== "{}") {
					openapiExploreProperty(usedInProperty, element);
				} else {
					// Do nothing
				}
			}
		} else {
			// Do nothing
		}
	}
	if (exploreProperty['$ref']) {
		// Do nothing
	}
	if (exploreProperty.type) {
		if (exploreProperty.format) {
			if (!usedInProperty.usedFormats[exploreProperty.type]) usedInProperty.usedFormats[exploreProperty.type] = [];
			if (!usedInProperty.usedFormats[exploreProperty.type].includes(exploreProperty.format)) usedInProperty.usedFormats[exploreProperty.type].push(exploreProperty.format);
		}
		// Do nothing
	}
	if (exploreProperty.properties) {
		let propNames = Object.keys(exploreProperty.properties);
		if (propNames.length > 0) {
			for (let propName of propNames) {
				openapiExploreProperty(usedInProperty, exploreProperty.properties[propName]);
			}
		} else {
			// Do nothing
		}
	}
	if (exploreProperty.additionalProperties) {
		// could be: {}, or could be: true or could be a property
		if (typeof exploreProperty.additionalProperties === "boolean") {
			// Do nothing
		} else if (typeof exploreProperty.additionalProperties === "object") {
			if (JSON.stringify(exploreProperty.additionalProperties) !== "{}") {
				openapiExploreProperty(usedInProperty, exploreProperty.additionalProperties);
			} else {
				// Do nothing
			}
		} else {
			// Do nothing
		}
	}
	if (exploreProperty.items) {
		// could be: {}, or could be a property
		if (JSON.stringify(exploreProperty.items) !== "{}") {
			openapiExploreProperty(usedInProperty, exploreProperty.items);
		} else {
			// Do nothing
		}
	}
}

function addNotifications(newOpenApiSpec: OpenApiSpec, pureCloud: PureCloud): Promise<string> {
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
						extractDefinitons(newOpenApiSpec, entity.schema);
						newOpenApiSpec.components.schemas[schemaName] = JSON.parse(JSON.stringify(entity.schema));
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

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function extractDefinitons(newOpenApiSpec: OpenApiSpec, entity: { [key: string]: any }) {
	try {
		_.forOwn(entity, (property, key) => {
			// Rewrite URN refs to JSON refs
			if (key == '$ref' && !property.startsWith('#')) {
				entity[key] = '#/components/schemas/' + getNotificationClassName(property);
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
			// Replace any type
			if (key == 'type' && property == 'any') {
				entity['type'] = 'string';
				entity['format'] = 'date-time';
			}

			// Recurse on objects
			if (typeof property !== 'object') return;
			extractDefinitons(newOpenApiSpec, property);

			// Update object to ref
			if (property.id && typeof property.id === 'string') {
				let className = getNotificationClassName(property.id);

				// Store definition
				newOpenApiSpec.components.schemas[className] = JSON.parse(JSON.stringify(property));

				// Set reference
				entity[key] = {
					type: 'object',
					$ref: `#/components/schemas/${className}`,
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
 * Merge OpenApi specifications
 *************************************************************************************/

// This function will combine the public openapi specification with the preview openapi specification
export function combineOpenApi(publicOpenApiSpec: OpenApiSpec, preview: OpenApiSpec) {
	log.info('Combining public and preview OpenApi docs into one');

	// Set new file equal to public file for now
	let newOpenApiSpecFile = publicOpenApiSpec;

	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	preview.tags.forEach((previewTag) => {
		let duplicate = publicOpenApiSpec.tags.some((publicTag) => publicTag.name === previewTag.name);
		if (!duplicate) {
			newOpenApiSpecFile.tags.push(previewTag);
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
	let publicPaths = Object.keys(publicOpenApiSpec.paths);
	for (let i = 0; i < previewPaths.length; i++) {
		if (publicPaths.includes(previewPaths[i])) {
			// Path does exist in public swagger, add the preview HTTP method to the existing path in the new JSON object
			for (const [key, value] of Object.entries(preview.paths[previewPaths[i]])) {
				newOpenApiSpecFile.paths[previewPaths[i]][key] = value;
			}
		} else {
			// Path does not exist in public swagger, add the preview path to the new JSON objects paths
			newOpenApiSpecFile.paths[previewPaths[i]] = preview.paths[previewPaths[i]];
		}
	}

	// Search for definitions in the preview swagger not in the public swagger and add preview definitions to new JSON object
	let previewDefinitions = Object.keys(preview.components.schemas);
	let publicDefinitions = Object.keys(publicOpenApiSpec.components.schemas);
	for (let i = 0; i < previewDefinitions.length; i++) {
		if (!publicDefinitions.includes(previewDefinitions[i])) {
			newOpenApiSpecFile.components.schemas[previewDefinitions[i]] = preview.components.schemas[previewDefinitions[i]];
		}
	}

	return newOpenApiSpecFile;
}
