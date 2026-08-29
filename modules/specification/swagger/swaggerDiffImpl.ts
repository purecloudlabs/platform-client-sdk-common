import _ from 'lodash';
import dot from 'dot';
import { ChangeItem, Changes, ApiVersionData } from '../../types/builderTypes.js';
import { SwaggerSpec, SwaggerInfo, Path, RestResponse, ItemsType, Property, HttpMethod, valueTypes, Parameter } from '../../types/swaggerSpec.js';
import { log } from '../../log/logger.js';

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


declare global {
	interface String {
		capitalizeFirstLetter(): string;
	}

	interface Array<T> {
		pushApply(arr: T[]): void;
	}

}

String.prototype.capitalizeFirstLetter = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

Array.prototype.pushApply = function <T>(arr: T[]): void {
	this.push(...arr);
};

export class SwaggerDiffImpl {

	changes: Changes = {};
	changeCount: number = 0;
	newApiVersion: string = "";
	swaggerVersion: string = "";
	swaggerInfo: SwaggerInfo = {} as SwaggerInfo;
	oldSwagger: SwaggerSpec = {} as SwaggerSpec;
	newSwagger: SwaggerSpec = {} as SwaggerSpec;

	useSdkVersioning: boolean = false;

	constructor() {
		dot.templateSettings.strip = false;
	}

	public diff(oldSwagger: SwaggerSpec, newSwagger: SwaggerSpec, apiVersionData: ApiVersionData): void {
		log.info('Starting swagger diff implementation');
		log.debug(`Old swagger paths: ${Object.keys(oldSwagger?.paths || {}).length}`);
		log.debug(`New swagger paths: ${Object.keys(newSwagger?.paths || {}).length}`);
		log.debug(`Old swagger definitions: ${Object.keys(oldSwagger?.definitions || {}).length}`);
		log.debug(`New swagger definitions: ${Object.keys(newSwagger?.definitions || {}).length}`);

		// Set data
		this.oldSwagger = oldSwagger;
		this.newSwagger = newSwagger;
		this.newApiVersion = apiVersionData.BuildVersion;
		this.swaggerInfo = newSwagger.info;
		this.swaggerVersion = newSwagger.swagger;
		this.changes = {};
		this.changeCount = 0;

		// Diff
		log.info('Checking operations for changes');
		this.checkOperations(oldSwagger, newSwagger);
		log.info('Checking models for changes');
		this.checkModels(oldSwagger, newSwagger);

		log.info(`Swagger diff implementation complete. Found ${this.changeCount} changes.`);
	};

	private checkOperations(oldSwagger: SwaggerSpec, newSwagger: SwaggerSpec) {
		let diffImpl = this as SwaggerDiffImpl;
		if (!oldSwagger) {
			log.warn('No old swagger provided, skipping operation checks');
			return;
		}
		log.debug('Starting operation comparison');
		const oldPathCount = Object.keys(oldSwagger.paths || {}).length;
		const newPathCount = Object.keys(newSwagger.paths || {}).length;
		log.debug(`Comparing ${oldPathCount} old paths with ${newPathCount} new paths`);

		// Check for removed paths
		log.debug('Checking for removed paths');
		_.forEach(oldSwagger.paths, function (oldPath: Path, pathKey) {
			var newPath = newSwagger.paths[pathKey];
			if (!newPath) {
				log.debug(`Path removed: ${pathKey}`);
				addChange(diffImpl, pathKey, pathKey, LOCATION_PATH, IMPACT_MAJOR, pathKey, undefined, undefined);
			}
		});

		// Check for changed and added paths
		log.debug('Checking for changed and added paths');
		_.forEach(newSwagger.paths, function (newPath: Path, pathKey) {
			var oldPath = oldSwagger.paths[pathKey];
			if (!oldPath) {
				log.debug(`New path added: ${pathKey}`);
				// Add note about the new path itself
				addChange(diffImpl, pathKey, pathKey, LOCATION_PATH, IMPACT_MINOR, undefined, pathKey, 'Path was added');

				// Add each operation
				_.forEach(newPath, function (newOperation, methodKey) {
					addChange(diffImpl, pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MINOR, undefined, pathKey, undefined);
				});
			} else {
				// Check for removed operations
				_.forEach(oldPath, function (oldOperation, methodKey) {
					var newOperation = newPath[methodKey];
					if (!newOperation) {
						addChange(diffImpl, pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MAJOR, methodKey, undefined, undefined);
					}
				});

				// Check for changed and added operations
				_.forEach(newPath, function (newOperation, methodKey) {
					if (newOperation) {
						var oldOperation: HttpMethod = oldPath[methodKey] as HttpMethod;
						if (!oldOperation) {
							// Operation was added
							addChange(
								diffImpl,
								pathKey,
								methodKey.toUpperCase(),
								LOCATION_OPERATION,
								IMPACT_MINOR,
								undefined,
								methodKey,
								newOperation && newOperation.summary ? `Operation ${methodKey} was added. Summary: ${newOperation.summary}` : undefined
							);
						} else {
							var operationMethodAndPath = `${methodKey.toUpperCase()} ${pathKey}`;

							// Check operation properties
							checkForChange(diffImpl, operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_MAJOR, 'operationId', oldOperation, newOperation, undefined);
							checkForChange(
								diffImpl,
								operationMethodAndPath,
								undefined,
								LOCATION_OPERATION,
								IMPACT_MAJOR,
								'x-purecloud-method-name',
								oldOperation,
								newOperation,
								undefined
							);
							checkForChange(
								diffImpl,
								operationMethodAndPath,
								undefined,
								LOCATION_OPERATION,
								IMPACT_POINT,
								'description',
								oldOperation,
								newOperation,
								'Description was changed'
							);
							checkForChange(
								diffImpl,
								operationMethodAndPath,
								undefined,
								LOCATION_OPERATION,
								IMPACT_POINT,
								'summary',
								oldOperation,
								newOperation,
								'Summary was changed'
							);
							// Check for deprecated
							if (newOperation.deprecated === true && oldOperation.deprecated !== true) {
								addChange(
									diffImpl,
									operationMethodAndPath,
									'deprecated',
									LOCATION_OPERATION,
									IMPACT_MAJOR,
									oldOperation.deprecated,
									newOperation.deprecated,
									'Has been deprecated'
								);
							} else if (newOperation.deprecated !== true && oldOperation.deprecated === true) {
								// This condition should never happen, but let's be thorough
								addChange(
									diffImpl,
									operationMethodAndPath,
									'deprecated',
									LOCATION_OPERATION,
									IMPACT_MAJOR,
									oldOperation.deprecated,
									newOperation.deprecated,
									'Has been undeprecated'
								);
							}

							// Make parameters KVPs
							var oldParams: { [key: string]: Parameter } = {};
							var newParams: { [key: string]: Parameter } = {};
							_.forEach(oldOperation.parameters, function (p: Parameter) {
								oldParams[p.name] = p;
							});
							_.forEach(newOperation.parameters, function (p: Parameter) {
								newParams[p.name] = p;
							});

							// Check for removed parameters
							_.forEach(oldParams, function (oldParam) {
								if (!newParams[oldParam.name]) {
									addChange(diffImpl, operationMethodAndPath, oldParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, oldParam.name, undefined, undefined);
								}
							});

							// Check for changed and added parameters
							_.forEach(newParams, function (newParam) {
								var oldParam = oldParams[newParam.name];
								if (!oldParam) {
									// Parameter was added, major change if in path or required
									var i = diffImpl.useSdkVersioning || newParam.in.toLowerCase() === 'path' || newParam.required === true;
									addChange(
										diffImpl,
										operationMethodAndPath,
										newParam.name,
										LOCATION_PARAMETER,
										i ? IMPACT_MAJOR : IMPACT_MINOR,
										undefined,
										newParam.name,
										undefined
									);
								} else {
									checkForChange(diffImpl, operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'in', oldParam, newParam, undefined);
									checkForChange(diffImpl, operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'type', oldParam, newParam, undefined);
									checkForChange(
										diffImpl,
										operationMethodAndPath,
										newParam.name,
										LOCATION_PARAMETER,
										IMPACT_POINT,
										'description',
										oldParam,
										newParam,
										`Description was changed for parameter ${newParam.name}`
									);

									// Major if made required
									if (oldParam.required !== newParam.required) {
										if (newParam.required === true) {
											addChange(
												diffImpl,
												operationMethodAndPath,
												newParam.name,
												LOCATION_PARAMETER,
												IMPACT_MAJOR,
												oldParam.required,
												newParam.required,
												`Parameter ${newParam.name} was made required`
											);
										} else {
											addChange(
												diffImpl,
												operationMethodAndPath,
												newParam.name,
												LOCATION_PARAMETER,
												IMPACT_MINOR,
												oldParam.required,
												newParam.required,
												`Parameter ${newParam.name} was made optional`
											);
										}
									}
								}
							});

							// Check for removed responses
							_.forEach(oldOperation.responses, function (oldResponse, oldResponseCode) {
								if (!newOperation.responses[oldResponseCode]) {
									addChange(diffImpl, operationMethodAndPath, oldResponseCode, LOCATION_RESPONSE, IMPACT_MAJOR, oldResponseCode, undefined, undefined);
								}
							});

							// Check for changed and added responses
							_.forEach(newOperation.responses, function (newResponse, newResponseCode) {
								var oldResponse: RestResponse = oldOperation.responses[newResponseCode];
								if (!oldResponse) {
									// Response was added
									addChange(diffImpl, operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_MINOR, undefined, newResponseCode, undefined);
								} else {
									checkForChange(
										diffImpl,
										operationMethodAndPath,
										newResponseCode,
										LOCATION_RESPONSE,
										IMPACT_POINT,
										'description',
										oldResponse,
										newResponse,
										undefined
									);
									checkForChange(
										diffImpl,
										operationMethodAndPath,
										newResponseCode,
										LOCATION_RESPONSE,
										IMPACT_MAJOR,
										'$ref',
										oldResponse.schema,
										newResponse.schema,
										`Response ${newResponseCode} type was changed from ${getSchemaType(oldResponse.schema)} to ${getSchemaType(
											newResponse.schema
										)}`
									);
								}
							});

							// Check for removed tags
							_.forEach(_.difference(oldOperation.tags, newOperation.tags), function (tag) {
								addChange(diffImpl, operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, tag, undefined, undefined);
							});

							// Check for added tags
							_.forEach(_.difference(newOperation.tags, oldOperation.tags), function (tag) {
								addChange(diffImpl, operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, undefined, tag, undefined);
							});
						}
					}
				}); // end operation iteration
			}
		}); // end path iteration
	}

	private checkModels(oldSwagger: SwaggerSpec, newSwagger: SwaggerSpec) {
		let diffImpl = this as SwaggerDiffImpl;
		if (!oldSwagger) {
			log.warn('No old swagger provided, skipping model checks');
			return;
		}
		log.debug('Starting model comparison');
		const oldModelCount = Object.keys(oldSwagger.definitions || {}).length;
		const newModelCount = Object.keys(newSwagger.definitions || {}).length;
		log.debug(`Comparing ${oldModelCount} old models with ${newModelCount} new models`);

		// Check for removed models
		log.debug('Checking for removed models');
		_.forEach(oldSwagger.definitions, function (oldModel, modelKey) {
			var newModel = newSwagger.definitions[modelKey];
			if (!newModel) {
				log.debug(`Model removed: ${modelKey}`);
				addChange(diffImpl, modelKey, modelKey, LOCATION_MODEL, IMPACT_MAJOR, modelKey, undefined, undefined);
			}
		});

		// Check for changed and added models
		log.debug('Checking for changed and added models');
		_.forEach(newSwagger.definitions, function (newModel, modelKey) {
			// ArrayNode and JsonNode were removed in API-5692
			if (!newModel.properties || modelKey === 'ArrayNode' || modelKey == 'JsonNode') {
				log.debug(`Skipping model ${modelKey} (no properties or excluded type)`);
				return;
			}
			var oldModel = oldSwagger.definitions[modelKey];
			if (!oldModel) {
				log.debug(`New model added: ${modelKey}`);
				// Add note about the new model
				addChange(diffImpl, modelKey, modelKey, LOCATION_MODEL, IMPACT_MINOR, undefined, modelKey, 'Model was added');
			} else {
				if (!oldModel.properties) {
					log.debug(`Skipping model ${modelKey} comparison (old model has no properties)`);
					return;
				}
				log.debug(`Comparing properties for model: ${modelKey}`);
				// Check for removed properties
				_.forEach(oldModel.properties, function (oldProperty, propertyKey) {
					var newProperty = newModel.properties && newModel.properties[propertyKey] ? newModel.properties[propertyKey] : undefined;
					if (!newProperty) {
						log.debug(`Property removed from ${modelKey}: ${propertyKey}`);
						addChange(diffImpl, modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, propertyKey, undefined, undefined);
					}
				});

				// Check for changed and added properties
				_.forEach(newModel.properties, function (newProperty, propertyKey) {
					var oldProperty = oldModel.properties && oldModel.properties[propertyKey] ? oldModel.properties[propertyKey] : undefined;
					if (!oldProperty) {
						// Property was added
						var type: ItemsType | undefined = newProperty.type;
						if (!type) type = newProperty['$ref'] ? newProperty['$ref'].replace('#/definitions/', '') as ItemsType : undefined;

						// New required properties are major changes
						if (newModel.required && newModel.required.includes(propertyKey)) {
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								IMPACT_MAJOR,
								undefined,
								type,
								`Required property ${propertyKey} was added`
							);
						} else {
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								IMPACT_MINOR,
								undefined,
								type,
								`Optional property ${propertyKey} was added`
							);
						}
					} else {
						checkForChange(
							diffImpl,
							modelKey,
							propertyKey,
							LOCATION_PROPERTY,
							IMPACT_MAJOR,
							undefined,
							getSchemaType(oldProperty),
							getSchemaType(newProperty),
							undefined
						);

						// Newly made readonly
						if (newProperty.readOnly === true && oldProperty.readOnly !== true) {
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								IMPACT_MAJOR,
								oldProperty.readOnly,
								newProperty.readOnly,
								`${propertyKey} has been made readonly`
							);
						}

						// No longer readonly
						if (oldProperty.readOnly === true && newProperty.readOnly !== true) {
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								IMPACT_MINOR,
								oldProperty.readOnly,
								newProperty.readOnly,
								`${propertyKey} is no longer readonly`
							);
						}

						// Check enums
						var oldEnums = getEnumValues(oldProperty);
						var newEnums = getEnumValues(newProperty);

						if (!oldEnums && newEnums) {
							// Is an enum now
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								IMPACT_MAJOR,
								oldEnums,
								newEnums,
								'Values are now constrained by enum members'
							);
						}
						if (oldEnums && !newEnums) {
							// Not an enum anymore
							addChange(
								diffImpl,
								modelKey,
								propertyKey,
								LOCATION_PROPERTY,
								diffImpl.useSdkVersioning ? IMPACT_MINOR : IMPACT_MINOR,
								oldEnums,
								newEnums,
								'Values are no longer constrained by enum members'
							);
						}
						if (oldEnums && newEnums) {
							// Removed enum values
							_.forEach(oldEnums, function (oldEnumValue) {
								if (newEnums && newEnums.indexOf(oldEnumValue) == -1) {
									addChange(
										diffImpl,
										modelKey,
										propertyKey,
										LOCATION_PROPERTY,
										IMPACT_MAJOR,
										oldEnumValue,
										undefined,
										`Enum value ${oldEnumValue} was removed from property ${propertyKey}`
									);
								}
							});

							// Added enum values
							_.forEach(newEnums, function (newEnumValue) {
								if (oldEnums && oldEnums.indexOf(newEnumValue) == -1) {
									addChange(
										diffImpl,
										modelKey,
										propertyKey,
										LOCATION_PROPERTY,
										IMPACT_MINOR,
										undefined,
										newEnumValue,
										`Enum value ${newEnumValue} was added to property ${propertyKey}`
									);
								}
							});
						}
					}
				});
			}
		});
	}

}

/* PRIVATE FUNCTIONS */

function addChange(diffImpl: SwaggerDiffImpl, id: string, key: string, location: string, impact: string, oldValue: valueTypes | undefined, newValue: valueTypes | undefined, description: string | undefined) {
	// Generate default description
	if (!description) {
		if (!oldValue && newValue) description = `${location.capitalizeFirstLetter()} ${key} was added`;
		else if (oldValue && !newValue) description = `${location.capitalizeFirstLetter()} ${key} was removed`;
		else description = `${location.capitalizeFirstLetter()} ${key} was changed from ${oldValue} to ${newValue}`;
	}

	log.debug(`Adding ${impact} change: ${id} - ${description}`);

	// Initialize
	if (!diffImpl.changes[id]) diffImpl.changes[id] = {};
	if (!diffImpl.changes[id][impact]) diffImpl.changes[id][impact] = [];

	// Add
	diffImpl.changes[id][impact].push({
		parent: id,
		impact: impact,
		key: key,
		location: location,
		oldValue: oldValue,
		newValue: newValue,
		description: description
	});

	// Increment change count
	diffImpl.changeCount++;
	log.debug(`Total change count: ${diffImpl.changeCount}`);
}

function checkForChange(diffImpl: SwaggerDiffImpl, id: string, key: string | undefined, location: string, impact: string, property: string | undefined, oldObject: any, newObject: any, description: string | undefined) {
	// Initialize property values
	// Use property=undefined for direct object comparison
	var oldPropertyValue = property ? (oldObject ? oldObject[property] : undefined) : oldObject;
	var newPropertyValue = property ? (newObject ? newObject[property] : undefined) : newObject;

	// Have one but not the other, or properties aren't equal
	if ((!oldObject && newObject) || (oldObject && !newObject) || oldPropertyValue !== newPropertyValue)
		addChange(diffImpl, id, key ? key : (property ? property : ''), location, impact, oldPropertyValue, newPropertyValue, description);
}

function getSchemaType(schema: Property): string {
	if (!schema) {
		log.debug('getSchemaType called with null/undefined schema');
		return '_undefined_';
	}

	if (schema && schema['$ref']) {
		const refType = schema['$ref'].replace('#/definitions/', '');
		log.debug(`Schema type resolved as reference: ${refType}`);
		return refType;
	}

	if (schema && schema.type) {
		if (schema.type.toLowerCase() == 'array' && schema.items) {
			if (schema.items['$ref']) {
				const arrayType = `${schema.items['$ref'].replace('#/definitions/', '')}[]`;
				log.debug(`Schema type resolved as array reference: ${arrayType}`);
				return arrayType;
			}
			if (schema.items.type) {
				const arrayType = `${schema.items.type}[]`;
				log.debug(`Schema type resolved as array: ${arrayType}`);
				return arrayType;
			}
		}
		if (schema.type.toLowerCase() == 'object' && schema.additionalProperties) {
			const mapType = `Map<${schema.type}, ${getSchemaType(schema.additionalProperties)}>`;
			log.debug(`Schema type resolved as map: ${mapType}`);
			return mapType;
		}

		log.debug(`Schema type resolved as simple type: ${schema.type}`);
		return schema.type;
	}

	log.debug('Schema type could not be determined, returning _undefined_');
	return '_undefined_';
}

function getEnumValues(property: Property) {
	if (!property) {
		log.debug('getEnumValues called with null/undefined property');
		return undefined;
	}

	if (property.enum) {
		log.debug(`Found enum values: ${property.enum.length} items`);
		return property.enum;
	}

	if (property.items && property.items.enum) {
		log.debug(`Found enum values in items: ${property.items.enum.length} items`);
		return property.items.enum;
	}

	log.debug('No enum values found in property');
	return undefined;
}
