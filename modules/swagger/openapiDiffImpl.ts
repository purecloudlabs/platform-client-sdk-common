import _ from 'lodash';
import dot from 'dot';
import { OpenApiSpec, Info, Path, TypeResponse, ItemsType, Property, HttpMethod, valueTypes, Parameter, Changes } from '../types/swagger.js';
import { log } from '../log/logger.js';

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

class OpenApiDiffImpl {

	changes: Changes;
	changeCount: number = 0;
	openapiInfo: Info;
	oldOpenApi: OpenApiSpec;
	newOpenApi: OpenApiSpec;

	useSdkVersioning: boolean = false;

	constructor() {
		dot.templateSettings.strip = false;
	}
	
	public diff(oldOpenApi: OpenApiSpec, newOpenApi: OpenApiSpec): void {
		log.info('Starting swagger diff implementation');
		log.debug(`Old swagger paths: ${Object.keys(oldOpenApi?.paths || {}).length}`);
		log.debug(`New swagger paths: ${Object.keys(newOpenApi?.paths || {}).length}`);
		log.debug(`Old swagger definitions: ${Object.keys(oldOpenApi?.components?.schemas || {}).length}`);
		log.debug(`New swagger definitions: ${Object.keys(newOpenApi?.components?.schemas || {}).length}`);

		// Set data
		this.oldOpenApi = oldOpenApi;
		this.newOpenApi = newOpenApi;
		this.openapiInfo = newOpenApi.info;
		this.openapiInfo.specificationVersion = newOpenApi.openapi;
		this.changes = {};
		this.changeCount = 0;
		
		// Diff
		log.info('Checking operations for changes');
		checkOperations(oldOpenApi, newOpenApi);
		log.info('Checking models for changes');
		checkModels(oldOpenApi, newOpenApi);

		log.info(`OpenApiSpec diff implementation complete. Found ${this.changeCount} changes.`);
	};

}

// Create an instance of OpenApiDiffImpl and export it.
const _this: OpenApiDiffImpl = new OpenApiDiffImpl();
export default _this;

// Check if the 'window' object is available and add the instance to it if so.
if (typeof window !== 'undefined') {
	(window as any).swaggerDiffImpl = _this;
}

/* PRIVATE FUNCTIONS */

function addChange(id: string, key: string, location: string, impact: string, oldValue: valueTypes, newValue: valueTypes, description: string) {
	// Generate default description
	if (!description) {
		if (!oldValue && newValue) description = `${location.capitalizeFirstLetter()} ${key} was added`;
		else if (oldValue && !newValue) description = `${location.capitalizeFirstLetter()} ${key} was removed`;
		else description = `${location.capitalizeFirstLetter()} ${key} was changed from ${oldValue} to ${newValue}`;
	}
	
	log.debug(`Adding ${impact} change: ${id} - ${description}`);
	
	// Initialize
	if (!_this.changes[id]) _this.changes[id] = {};
	if (!_this.changes[id][impact]) _this.changes[id][impact] = [];

	// Add
	_this.changes[id][impact].push({
		parent: id,
		impact: impact,
		key: key,
		location: location,
		oldValue: oldValue,
		newValue: newValue,
		description: description
	});

	// Increment change count
	_this.changeCount++;
	log.debug(`Total change count: ${_this.changeCount}`);
}

function checkForChange(id: string, key: string, location: string, impact: string, property: string, oldObject: TypeResponse, newObject: TypeResponse, description: string) {
	// Initialize property values
	// Use property=undefined for direct object comparison
	var oldPropertyValue = property ? (oldObject ? oldObject[property] : undefined) : oldObject;
	var newPropertyValue = property ? (newObject ? newObject[property] : undefined) : newObject;

	// Have one but not the other, or properties aren't equal
	if ((!oldObject && newObject) || (oldObject && !newObject) || oldPropertyValue !== newPropertyValue)
		addChange(id, key ? key : property, location, impact, oldPropertyValue, newPropertyValue, description);
}

function checkOperations(oldOpenApi: OpenApiSpec, newOpenApi: OpenApiSpec) {
	if (!oldOpenApi) {
		log.warn('No old swagger provided, skipping operation checks');
		return;
	}
	log.debug('Starting operation comparison');
	const oldPathCount = Object.keys(oldOpenApi.paths || {}).length;
	const newPathCount = Object.keys(newOpenApi.paths || {}).length;
	log.debug(`Comparing ${oldPathCount} old paths with ${newPathCount} new paths`);
	
	// Check for removed paths
	log.debug('Checking for removed paths');
	_.forEach(oldOpenApi.paths, function (oldPath: Path, pathKey) {
		var newPath = newOpenApi.paths[pathKey];
		if (!newPath) {
			log.debug(`Path removed: ${pathKey}`);
			addChange(pathKey, pathKey, LOCATION_PATH, IMPACT_MAJOR, pathKey, undefined, undefined);
		}
	});

	// Check for changed and added paths
	log.debug('Checking for changed and added paths');
	_.forEach(newOpenApi.paths, function (newPath: Path, pathKey) {
		var oldPath = oldOpenApi.paths[pathKey];
		if (!oldPath) {
			log.debug(`New path added: ${pathKey}`);
			// Add note about the new path itself
			addChange(pathKey, pathKey, LOCATION_PATH, IMPACT_MINOR, undefined, pathKey, 'Path was added');

			// Add each operation
			_.forEach(newPath, function (newOperation, methodKey) {
				addChange(pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MINOR, undefined, pathKey, undefined);
			});
		} else {
			// Check for removed operations
			_.forEach(oldPath, function (oldOperation: HttpMethod, methodKey) {
				var newOperation = newPath[methodKey];
				if (!newOperation) {
					addChange(pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MAJOR, methodKey, undefined, undefined);
				}
			});

			// Check for changed and added operations
			_.forEach(newPath, function (newOperation, methodKey) {
				var oldOperation: HttpMethod = oldPath[methodKey];
				if (!oldOperation) {
					// Operation was added
					addChange(
						pathKey,
						methodKey.toUpperCase(),
						LOCATION_OPERATION,
						IMPACT_MINOR,
						undefined,
						methodKey,
						newOperation.summary ? `Operation ${methodKey} was added. Summary: ${newOperation.summary}` : undefined
					);
				} else {
					var operationMethodAndPath = `${methodKey.toUpperCase()} ${pathKey}`;

					// Check operation properties
					checkForChange(operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_MAJOR, 'operationId', oldOperation, newOperation, undefined);
					checkForChange(
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
							addChange(operationMethodAndPath, oldParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, oldParam.name, undefined, undefined);
						}
					});

					// Check for changed and added parameters
					_.forEach(newParams, function (newParam) {
						var oldParam = oldParams[newParam.name];
						if (!oldParam) {
							// Parameter was added, major change if in path or required
							var i = _this.useSdkVersioning || newParam.in.toLowerCase() === 'path' || newParam.required === true;
							addChange(
								operationMethodAndPath,
								newParam.name,
								LOCATION_PARAMETER,
								i ? IMPACT_MAJOR : IMPACT_MINOR,
								undefined,
								newParam.name,
								undefined
							);
						} else {
							checkForChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'in', oldParam, newParam, undefined);
							checkForChange(operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'type', oldParam, newParam, undefined);
							checkForChange(
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
							addChange(operationMethodAndPath, oldResponseCode, LOCATION_RESPONSE, IMPACT_MAJOR, oldResponseCode, undefined, undefined);
						}
					});

					// Check for changed and added responses
					_.forEach(newOperation.responses, function (newResponse, newResponseCode) {
						var oldResponse: TypeResponse = oldOperation.responses[newResponseCode];
						if (!oldResponse) {
							// Response was added
							addChange(operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_MINOR, undefined, newResponseCode, undefined);
						} else {
							checkForChange(
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
						addChange(operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, tag, undefined, undefined);
					});

					// Check for added tags
					_.forEach(_.difference(newOperation.tags, oldOperation.tags), function (tag) {
						addChange(operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, undefined, tag, undefined);
					});
				}
			}); // end operation iteration
		}
	}); // end path iteration
}

function getSchemaType(schema: Property) {
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

function checkModels(oldOpenApi: OpenApiSpec, newOpenApi: OpenApiSpec) {
	if (!oldOpenApi) {
		log.warn('No old swagger provided, skipping model checks');
		return;
	}
	log.debug('Starting model comparison');
	const oldModelCount = Object.keys(oldOpenApi.components.schemas || {}).length;
	const newModelCount = Object.keys(newOpenApi.components.schemas || {}).length;
	log.debug(`Comparing ${oldModelCount} old models with ${newModelCount} new models`);
	
	// Check for removed models
	log.debug('Checking for removed models');
	_.forEach(oldOpenApi.components.schemas, function (oldModel, modelKey) {
		var newModel = newOpenApi.components.schemas[modelKey];
		if (!newModel) {
			log.debug(`Model removed: ${modelKey}`);
			addChange(modelKey, modelKey, LOCATION_MODEL, IMPACT_MAJOR, modelKey, undefined, undefined);
		}
	});

	// Check for changed and added models
	log.debug('Checking for changed and added models');
	_.forEach(newOpenApi.components.schemas, function (newModel, modelKey) {
		// ArrayNode and JsonNode were removed in API-5692
		if (!newModel.properties || modelKey === 'ArrayNode' || modelKey == 'JsonNode') {
			log.debug(`Skipping model ${modelKey} (no properties or excluded type)`);
			return;
		}
		var oldModel = oldOpenApi.components.schemas[modelKey];
		if (!oldModel) {
			log.debug(`New model added: ${modelKey}`);
			// Add note about the new model
			addChange(modelKey, modelKey, LOCATION_MODEL, IMPACT_MINOR, undefined, modelKey, 'Model was added');
		} else {
			if (!oldModel.properties) {
				log.debug(`Skipping model ${modelKey} comparison (old model has no properties)`);
				return;
			}
			log.debug(`Comparing properties for model: ${modelKey}`);
			// Check for removed properties
			_.forEach(oldModel.properties, function (oldProperty, propertyKey) {
				var newProperty = newModel.properties[propertyKey];
				if (!newProperty) {
					log.debug(`Property removed from ${modelKey}: ${propertyKey}`);
					addChange(modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, propertyKey, undefined, undefined);
				}
			});

			// Check for changed and added properties
			_.forEach(newModel.properties, function (newProperty, propertyKey) {
				var oldProperty = oldModel.properties[propertyKey];
				if (!oldProperty) {
					// Property was added
					var type: ItemsType = newProperty.type;
					if (!type) type = newProperty['$ref'] ? newProperty['$ref'].replace('#/definitions/', '') as ItemsType : undefined as ItemsType;

					// New required properties are major changes
					if (newModel.required && newModel.required.includes(propertyKey)) {
						addChange(
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
							modelKey,
							propertyKey,
							LOCATION_PROPERTY,
							_this.useSdkVersioning ? IMPACT_MINOR : IMPACT_MINOR,
							oldEnums,
							newEnums,
							'Values are no longer constrained by enum members'
						);
					}
					if (oldEnums && newEnums) {
						// Removed enum values
						_.forEach(oldEnums, function (oldEnumValue) {
							if (newEnums.indexOf(oldEnumValue) == -1) {
								addChange(
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
							if (oldEnums.indexOf(newEnumValue) == -1) {
								addChange(
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

function getEnumValues(property) {
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


