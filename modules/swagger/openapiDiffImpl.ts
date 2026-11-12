import _ from 'lodash';
import dot from 'dot';
import pluralize from 'pluralize';
import { OpenApiSpec, OpenApiInfo, TypeResponse, Path, ItemsType, Property, HttpMethod, valueTypes, Parameter } from '../types/openapiSpec.js'
import { Version, Data, Changes } from '../types/builderTypes.js';
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

export class OpenApiDiffImpl {

	changes: Changes;
	changeCount: number = 0;
	openapiInfo: OpenApiInfo;
	oldOpenApiSpec: OpenApiSpec;
	newOpenApiSpec: OpenApiSpec;

	useSdkVersioning: boolean = false;
	constructor() {
		dot.templateSettings.strip = false;
	}
	public diff(): void {
		log.info('Starting openapi specification diff implementation');
		log.debug(`Old openapi specification paths: ${Object.keys(this.oldOpenApiSpec?.paths || {}).length}`);
		log.debug(`New openapi specification paths: ${Object.keys(this.newOpenApiSpec?.paths || {}).length}`);
		log.debug(`Old openapi specification definitions: ${Object.keys(this.oldOpenApiSpec?.components.schemas || {}).length}`);
		log.debug(`New openapi specification definitions: ${Object.keys(this.newOpenApiSpec?.components.schemas || {}).length}`);

		// Set data
		if (!this.openapiInfo) this.openapiInfo = this.newOpenApiSpec.info;
		this.openapiInfo.openapi = this.newOpenApiSpec.openapi;
		this.changes = {};
		this.changeCount = 0;
		
		// Diff
		log.info('Checking operations for changes');
		checkOperations(this, this.oldOpenApiSpec, this.newOpenApiSpec);
		log.info('Checking models for changes');
		checkModels(this, this.oldOpenApiSpec, this.newOpenApiSpec);

		log.info(`OpenApi specification diff implementation complete. Found ${this.changeCount} changes.`);
	};

	public generateReleaseNotes(template: string, data: Data) {
		log.info('Starting release notes generation in implementation');
		log.debug(`Template length: ${template.length}`);
		log.debug(`Total changes to process: ${Object.keys(this.changes).length}`);
		var changesObject = {
			major: {},
			minor: {},
			point: {}
		};

		// Organize data for templating
		log.debug('Organizing changes by impact level');
		_.forEach(this.changes, function (changeItem, entity) {
			if (changeItem.major) {
				if (!changesObject.major[entity]) changesObject.major[entity] = { key: entity, changes: [] };

				changesObject.major[entity].changes.pushApply(changeItem.major);
			}

			if (changeItem.minor) {
				if (!changesObject.minor[entity]) changesObject.minor[entity] = { key: entity, changes: [] };

				changesObject.minor[entity].changes.pushApply(changeItem.minor);
			}

			if (changeItem.point) {
				if (!changesObject.point[entity]) changesObject.point[entity] = { key: entity, changes: [] };

				changesObject.point[entity].changes.pushApply(changeItem.point);
			}
		});

		// Calculate metadata
		var changesData = {
			majorCount: 0,
			minorCount: 0,
			pointCount: 0,
			major: {},
			point: {},
			minor: {},
		};



		_.forOwn(changesObject, function (impactGroup, key) {
			_.forOwn(impactGroup, function (changeGroup: any) {
				changesData[`${key}Count`] += changeGroup.changes.length;
				changeGroup.changeCount = changeGroup.changes.length;
			});
		});

		// Flatten to arrays
		changesData.major = _.values(changesObject.major);
		changesData.minor = _.values(changesObject.minor);
		changesData.point = _.values(changesObject.point);

		// Construct template data definition object
		var defs = {
			changes: changesData,
			openapiInfo: this.openapiInfo,
			data: data,
			pluralize: pluralize
		};

		// Compile template
		log.debug('Compiling template with DOT engine');
		log.debug(`Changes summary - Major: ${changesData.majorCount}, Minor: ${changesData.minorCount}, Point: ${changesData.pointCount}`);
		var compiledTemplate = dot.template(template, null, defs);

		// Execute template
		log.debug('Executing compiled template');
		const result = compiledTemplate(defs);
		log.info(`Release notes generated successfully, length: ${result.length}`);
		return result;
	};

	public incrementVersion = function (version: Version, forceMajor: boolean, forceMinor: boolean, forcePoint: boolean) {
		log.debug('Analyzing changes to determine version increment');
		const majorChanges = _.find(this.changes, function (changeGroup) {
			return changeGroup[IMPACT_MAJOR] ? changeGroup[IMPACT_MAJOR].length > 0 : false;
		});
		const minorChanges = _.find(this.changes, function (changeGroup) {
			return changeGroup[IMPACT_MINOR] ? changeGroup[IMPACT_MINOR].length > 0 : false;
		});
		const pointChanges = _.find(this.changes, function (changeGroup) {
			return changeGroup[IMPACT_POINT] ? changeGroup[IMPACT_POINT].length > 0 : false;
		});
		
		log.debug(`Change analysis - Major: ${!!majorChanges}, Minor: ${!!minorChanges}, Point: ${!!pointChanges}`);
		
		// Major
		if (forceMajor === true || majorChanges) {
			log.info(`Increment version: major (forced: ${forceMajor}, changes: ${!!majorChanges})`);
			version.major++;
			version.minor = 0;
			version.point = 0;
		}
		// Minor
		else if (forceMinor === true || minorChanges) {
			log.info(`Increment version: minor (forced: ${forceMinor}, changes: ${!!minorChanges})`);
			version.minor++;
			version.point = 0;
		}
		// Point
		else if (forcePoint === true || pointChanges) {
			log.info(`Increment version: point (forced: ${forcePoint}, changes: ${!!pointChanges})`);
			version.point++;
		} else {
			log.info('No version increment needed - no changes detected');
		}

		version.display = this.stringifyVersion(version);
		version.displayFull = this.stringifyVersion(version, true);

		return version;
	};

	public stringifyVersion = function (version: Version, includePrerelease: boolean) {
		return (
			`${version.major}.${version.minor}.${version.point}` +
			(includePrerelease === true && version.prerelease && version.prerelease.length > 0 ? `-${version.prerelease}` : '')
		);
	};

}

/* PRIVATE FUNCTIONS */

function addChange(openapiDiffImpl: OpenApiDiffImpl, id: string, key: string, location: string, impact: string, oldValue: valueTypes, newValue: valueTypes, description: string) {
	// Generate default description
	if (!description) {
		if (!oldValue && newValue) description = `${location.capitalizeFirstLetter()} ${key} was added`;
		else if (oldValue && !newValue) description = `${location.capitalizeFirstLetter()} ${key} was removed`;
		else description = `${location.capitalizeFirstLetter()} ${key} was changed from ${oldValue} to ${newValue}`;
	}
	
	log.debug(`Adding ${impact} change: ${id} - ${description}`);
	
	// Initialize
	if (!openapiDiffImpl.changes[id]) openapiDiffImpl.changes[id] = {};
	if (!openapiDiffImpl.changes[id][impact]) openapiDiffImpl.changes[id][impact] = [];

	// Add
	openapiDiffImpl.changes[id][impact].push({
		parent: id,
		impact: impact,
		key: key,
		location: location,
		oldValue: oldValue,
		newValue: newValue,
		description: description
	});

	// Increment change count
	openapiDiffImpl.changeCount++;
	log.debug(`Total change count: ${openapiDiffImpl.changeCount}`);
}

function checkForChange(openapiDiffImpl: OpenApiDiffImpl, id: string, key: string, location: string, impact: string, property: string, oldObject: TypeResponse, newObject: TypeResponse, description: string) {
	// Initialize property values
	// Use property=undefined for direct object comparison
	var oldPropertyValue = property ? (oldObject ? oldObject[property] : undefined) : oldObject;
	var newPropertyValue = property ? (newObject ? newObject[property] : undefined) : newObject;

	// Have one but not the other, or properties aren't equal
	if ((!oldObject && newObject) || (oldObject && !newObject) || oldPropertyValue !== newPropertyValue)
		addChange(openapiDiffImpl, id, key ? key : property, location, impact, oldPropertyValue, newPropertyValue, description);
}

function checkOperations(openapiDiffImpl: OpenApiDiffImpl, oldOpenApiSpec: OpenApiSpec, newOpenApiSpec: OpenApiSpec) {
	if (!oldOpenApiSpec) {
		log.warn('No old spec provided, skipping operation checks');
		return;
	}
	log.debug('Starting operation comparison');
	const oldPathCount = Object.keys(oldOpenApiSpec.paths || {}).length;
	const newPathCount = Object.keys(newOpenApiSpec.paths || {}).length;
	log.debug(`Comparing ${oldPathCount} old paths with ${newPathCount} new paths`);
	
	// Check for removed paths
	log.debug('Checking for removed paths');
	_.forEach(oldOpenApiSpec.paths, function (oldPath: Path, pathKey) {
		var newPath = newOpenApiSpec.paths[pathKey];
		if (!newPath) {
			log.debug(`Path removed: ${pathKey}`);
			addChange(openapiDiffImpl, pathKey, pathKey, LOCATION_PATH, IMPACT_MAJOR, pathKey, undefined, undefined);
		}
	});

	// Check for changed and added paths
	log.debug('Checking for changed and added paths');
	_.forEach(newOpenApiSpec.paths, function (newPath: Path, pathKey) {
		var oldPath = oldOpenApiSpec.paths[pathKey];
		if (!oldPath) {
			log.debug(`New path added: ${pathKey}`);
			// Add note about the new path itself
			addChange(openapiDiffImpl, pathKey, pathKey, LOCATION_PATH, IMPACT_MINOR, undefined, pathKey, 'Path was added');

			// Add each operation
			_.forEach(newPath, function (newOperation, methodKey) {
				addChange(openapiDiffImpl, pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MINOR, undefined, pathKey, undefined);
			});
		} else {
			// Check for removed operations
			_.forEach(oldPath, function (oldOperation: HttpMethod, methodKey) {
				var newOperation = newPath[methodKey];
				if (!newOperation) {
					addChange(openapiDiffImpl, pathKey, methodKey.toUpperCase(), LOCATION_OPERATION, IMPACT_MAJOR, methodKey, undefined, undefined);
				}
			});

			// Check for changed and added operations
			_.forEach(newPath, function (newOperation, methodKey) {
				var oldOperation: HttpMethod = oldPath[methodKey];
				if (!oldOperation) {
					// Operation was added
					addChange(
						openapiDiffImpl,
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
					checkForChange(openapiDiffImpl, operationMethodAndPath, undefined, LOCATION_OPERATION, IMPACT_MAJOR, 'operationId', oldOperation, newOperation, undefined);
					checkForChange(
						openapiDiffImpl,
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
						openapiDiffImpl,
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
							openapiDiffImpl,
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
							openapiDiffImpl,
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
							addChange(openapiDiffImpl, operationMethodAndPath, oldParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, oldParam.name, undefined, undefined);
						}
					});

					// Check for changed and added parameters
					_.forEach(newParams, function (newParam) {
						var oldParam = oldParams[newParam.name];
						if (!oldParam) {
							// Parameter was added, major change if in path or required
							var i = openapiDiffImpl.useSdkVersioning || newParam.in.toLowerCase() === 'path' || newParam.required === true;
							addChange(
								openapiDiffImpl,
								operationMethodAndPath,
								newParam.name,
								LOCATION_PARAMETER,
								i ? IMPACT_MAJOR : IMPACT_MINOR,
								undefined,
								newParam.name,
								undefined
							);
						} else {
							checkForChange(openapiDiffImpl, operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'in', oldParam, newParam, undefined);
							checkForChange(openapiDiffImpl, operationMethodAndPath, newParam.name, LOCATION_PARAMETER, IMPACT_MAJOR, 'type', oldParam["schema"], newParam["schema"], undefined);
							checkForChange(
								openapiDiffImpl,
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
										openapiDiffImpl,
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
										openapiDiffImpl,
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
							addChange(openapiDiffImpl, operationMethodAndPath, oldResponseCode, LOCATION_RESPONSE, IMPACT_MAJOR, oldResponseCode, undefined, undefined);
						}
					});

					// Check for changed and added responses
					_.forEach(newOperation.responses, function (newResponse, newResponseCode) {
						var oldResponse: TypeResponse = oldOperation.responses[newResponseCode];
						if (!oldResponse) {
							// Response was added
							addChange(openapiDiffImpl, operationMethodAndPath, newResponseCode, LOCATION_RESPONSE, IMPACT_MINOR, undefined, newResponseCode, undefined);
						} else {
							checkForChange(
								openapiDiffImpl,
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
								openapiDiffImpl,
								operationMethodAndPath,
								newResponseCode,
								LOCATION_RESPONSE,
								IMPACT_MAJOR,
								'$ref',
								oldResponse.content["application/json"]?.schema,
								newResponse.content["application/json"]?.schema,
								`Response ${newResponseCode} type was changed from ${getSchemaType(oldResponse.content["application/json"]?.schema)} to ${getSchemaType(
									newResponse.content["application/json"]?.schema
								)}`
							);
						}
					});

					// Check for removed tags
					_.forEach(_.difference(oldOperation.tags, newOperation.tags), function (tag) {
						addChange(openapiDiffImpl, operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, tag, undefined, undefined);
					});

					// Check for added tags
					_.forEach(_.difference(newOperation.tags, oldOperation.tags), function (tag) {
						addChange(openapiDiffImpl, operationMethodAndPath, tag, LOCATION_TAG, IMPACT_MAJOR, undefined, tag, undefined);
					});
				}
			}); // end operation iteration
		}
	}); // end path iteration
}

function getSchemaType(schema: Property) {
	if (!schema) {
		// log.debug('getSchemaType called with null/undefined schema');
		return '_undefined_';
	}
	
	if (schema && schema['$ref']) {
		const refType = schema['$ref'].replace('#/components/schemas/', '');
		// log.debug(`Schema type resolved as reference: ${refType}`);
		return refType;
	}

	if (schema && schema.type) {
		if (schema.type.toLowerCase() == 'array' && schema.items) {
			if (schema.items['$ref']) {
				const arrayType = `${schema.items['$ref'].replace('#/components/schemas/', '')}[]`;
				// log.debug(`Schema type resolved as array reference: ${arrayType}`);
				return arrayType;
			}
			if (schema.items.type) {
				const arrayType = `${schema.items.type}[]`;
				// log.debug(`Schema type resolved as array: ${arrayType}`);
				return arrayType;
			}
		}
		if (schema.type.toLowerCase() == 'object' && schema.additionalProperties) {
			const mapType = `Map<${schema.type}, ${getSchemaType(schema.additionalProperties)}>`;
			// log.debug(`Schema type resolved as map: ${mapType}`);
			return mapType;
		}

		// log.debug(`Schema type resolved as simple type: ${schema.type}`);
		return schema.type;
	}

	// log.debug('Schema type could not be determined, returning _undefined_');
	return '_undefined_';
}

function checkModels(openapiDiffImpl: OpenApiDiffImpl, oldOpenApiSpec: OpenApiSpec, newOpenApiSpec: OpenApiSpec) {
	if (!oldOpenApiSpec) {
		log.warn('No old spec provided, skipping model checks');
		return;
	}
	log.debug('Starting model comparison');
	const oldModelCount = Object.keys(oldOpenApiSpec.components.schemas || {}).length;
	const newModelCount = Object.keys(newOpenApiSpec.components.schemas || {}).length;
	log.debug(`Comparing ${oldModelCount} old models with ${newModelCount} new models`);
	
	// Check for removed models
	log.debug('Checking for removed models');
	_.forEach(oldOpenApiSpec.components.schemas, function (oldModel, modelKey) {
		var newModel = newOpenApiSpec.components.schemas[modelKey];
		if (!newModel) {
			log.debug(`Model removed: ${modelKey}`);
			addChange(openapiDiffImpl, modelKey, modelKey, LOCATION_MODEL, IMPACT_MAJOR, modelKey, undefined, undefined);
		}
	});

	// Check for changed and added models
	log.debug('Checking for changed and added models');
	_.forEach(newOpenApiSpec.components.schemas, function (newModel, modelKey) {
		// ArrayNode and JsonNode were removed in API-5692
		if (!newModel.properties || modelKey === 'ArrayNode' || modelKey == 'JsonNode') {
			log.debug(`Skipping model ${modelKey} (no properties or excluded type)`);
			return;
		}
		var oldModel = oldOpenApiSpec.components.schemas[modelKey];
		if (!oldModel) {
			log.debug(`New model added: ${modelKey}`);
			// Add note about the new model
			addChange(openapiDiffImpl, modelKey, modelKey, LOCATION_MODEL, IMPACT_MINOR, undefined, modelKey, 'Model was added');
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
					addChange(openapiDiffImpl, modelKey, propertyKey, LOCATION_PROPERTY, IMPACT_MAJOR, propertyKey, undefined, undefined);
				}
			});

			// Check for changed and added properties
			_.forEach(newModel.properties, function (newProperty, propertyKey) {
				var oldProperty = oldModel.properties[propertyKey];
				if (!oldProperty) {
					// Property was added
					var type: ItemsType = newProperty.type;
					if (!type) type = newProperty['$ref'] ? newProperty['$ref'].replace('#/components/schemas/', '') as ItemsType : undefined as ItemsType;

					// New required properties are major changes
					if (newModel.required && newModel.required.includes(propertyKey)) {
						addChange(
							openapiDiffImpl,
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
							openapiDiffImpl,
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
						openapiDiffImpl,
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
							openapiDiffImpl,
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
							openapiDiffImpl,
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
							openapiDiffImpl,
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
							openapiDiffImpl,
							modelKey,
							propertyKey,
							LOCATION_PROPERTY,
							openapiDiffImpl.useSdkVersioning ? IMPACT_MINOR : IMPACT_MINOR,
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
									openapiDiffImpl,
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
									openapiDiffImpl,
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
		// log.debug('getEnumValues called with null/undefined property');
		return undefined;
	}
	
	if (property.enum) {
		// log.debug(`Found enum values: ${property.enum.length} items`);
		return property.enum;
	}

	if (property.items && property.items.enum) {
		// log.debug(`Found enum values in items: ${property.items.enum.length} items`);
		return property.items.enum;
	}

	// log.debug('No enum values found in property');
	return undefined;
}


