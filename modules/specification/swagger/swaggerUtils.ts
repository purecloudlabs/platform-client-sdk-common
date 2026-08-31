import _ from 'lodash';
import { ItemsType, SwaggerSpec, ProduceElement } from '../../types/swaggerSpec.js';
import { NotificationsPreprocessing, SpecificationPreprocessing, SwaggerPreprocessing } from '../../types/config.js';
import { log } from '../../log/logger.js';

const NO_AUTH_SECURITY = 'NO_AUTH_SECURITY';


let DEFAULT_NOTIFICATIONS_PREPROCESSING_CFG: NotificationsPreprocessing = {
	addNotifications: true,
	// Override available topics schema properties from type: "integer" to type: "integer", format: "int64"
	forceInt64Integers: true,
	// Remove duplicates in topics enumerations
	removeEnumDuplicates: true,
	// Replace type: any with type: string, format: date-time
	replaceTypeAny: true
};

let DEFAULT_SWAGGER_PREPROCESSING_CFG: SwaggerPreprocessing = {
	type: "swagger",
	processPaths: true,
	processRefs: true,
	forceCSVCollectionFormatInTags: [],
	processEnums: true,
	discriminatorManagement: 'quarantine',
	keepDiscriminatorModels: ['ListValues'],
	updateOneOf: true
};

let DEFAULT_SPECIFICATION_PREPROCESSING_CFG: SpecificationPreprocessing = {
	add: {
		tags: [],
		securities: {}
	},
	override: {
		modelNames: {},
		operationIds: {},
		modelsToPrimitiveType: {},
		models: {},
		operations: {}
	},
	filter: {
		keep: {
			tags: [],
			securities: [],
			operationIds: [],
			paths: [],
			consumes: [],
			produces: []
		},
		exclude: {
			tags: [],
			securities: [],
			operationIds: ['postGroupImages', 'postUserImages', 'postLocationImages'],
			paths: [],
			consumes: [],
			produces: []
		}
	},
	removeUnused: true,
	notifications: DEFAULT_NOTIFICATIONS_PREPROCESSING_CFG,
	specific: DEFAULT_SWAGGER_PREPROCESSING_CFG,
	addPolymorphismInfo: true,
	analyzeReportBefore: false,
	analyzeReportAfter: false
};

export function mergeSpecificationPreprocessingCfg(overrideCfg: SpecificationPreprocessing | null): SpecificationPreprocessing {
	let cfg = JSON.parse(JSON.stringify(DEFAULT_SPECIFICATION_PREPROCESSING_CFG));

	if (overrideCfg) {
		if (overrideCfg.add) {
			if (overrideCfg.add.tags !== null && overrideCfg.add.tags !== undefined) {
				cfg.add.tags = overrideCfg.add.tags;
			}
			if (overrideCfg.add.securities !== null && overrideCfg.add.securities !== undefined) {
				cfg.add.securities = overrideCfg.add.securities;
			}
		}
		if (overrideCfg.override) {
			if (overrideCfg.override.modelNames !== null && overrideCfg.override.modelNames !== undefined) {
				cfg.override.modelNames = overrideCfg.override.modelNames;
			}
			if (overrideCfg.override.operationIds !== null && overrideCfg.override.operationIds !== undefined) {
				cfg.override.operationIds = overrideCfg.override.operationIds;
			}
			if (overrideCfg.override.modelsToPrimitiveType !== null && overrideCfg.override.modelsToPrimitiveType !== undefined) {
				cfg.override.modelsToPrimitiveType = overrideCfg.override.modelsToPrimitiveType;
			}
			if (overrideCfg.override.models !== null && overrideCfg.override.models !== undefined) {
				cfg.override.models = overrideCfg.override.models;
			}
			if (overrideCfg.override.operations !== null && overrideCfg.override.operations !== undefined) {
				cfg.override.operations = overrideCfg.override.operations;
			}
		}
		if (overrideCfg.filter) {
			if (overrideCfg.filter.keep) {
				if (overrideCfg.filter.keep.tags !== null && overrideCfg.filter.keep.tags !== undefined) {
					cfg.filter.keep.tags = overrideCfg.filter.keep.tags;
				}
				if (overrideCfg.filter.keep.securities !== null && overrideCfg.filter.keep.securities !== undefined) {
					cfg.filter.keep.securities = overrideCfg.filter.keep.securities;
				}
				if (overrideCfg.filter.keep.operationIds !== null && overrideCfg.filter.keep.operationIds !== undefined) {
					cfg.filter.keep.operationIds = overrideCfg.filter.keep.operationIds;
				}
				if (overrideCfg.filter.keep.paths !== null && overrideCfg.filter.keep.paths !== undefined) {
					cfg.filter.keep.paths = overrideCfg.filter.keep.paths;
				}
				if (overrideCfg.filter.keep.consumes !== null && overrideCfg.filter.keep.consumes !== undefined) {
					cfg.filter.keep.consumes = overrideCfg.filter.keep.consumes;
				}
				if (overrideCfg.filter.keep.produces !== null && overrideCfg.filter.keep.produces !== undefined) {
					cfg.filter.keep.produces = overrideCfg.filter.keep.produces;
				}
			}
			if (overrideCfg.filter.exclude) {
				if (overrideCfg.filter.exclude.tags !== null && overrideCfg.filter.exclude.tags !== undefined) {
					cfg.filter.exclude.tags = overrideCfg.filter.exclude.tags;
				}
				if (overrideCfg.filter.exclude.securities !== null && overrideCfg.filter.exclude.securities !== undefined) {
					cfg.filter.exclude.securities = overrideCfg.filter.exclude.securities;
				}
				if (overrideCfg.filter.exclude.operationIds !== null && overrideCfg.filter.exclude.operationIds !== undefined) {
					cfg.filter.exclude.operationIds = overrideCfg.filter.exclude.operationIds;
				}
				if (overrideCfg.filter.exclude.paths !== null && overrideCfg.filter.exclude.paths !== undefined) {
					cfg.filter.exclude.paths = overrideCfg.filter.exclude.paths;
				}
				if (overrideCfg.filter.exclude.consumes !== null && overrideCfg.filter.exclude.consumes !== undefined) {
					cfg.filter.exclude.consumes = overrideCfg.filter.exclude.consumes;
				}
				if (overrideCfg.filter.exclude.produces !== null && overrideCfg.filter.exclude.produces !== undefined) {
					cfg.filter.exclude.produces = overrideCfg.filter.exclude.produces;
				}
			}
		}
		if (overrideCfg.removeUnused !== null && overrideCfg.removeUnused !== undefined) {
			cfg.removeUnused = overrideCfg.removeUnused;
		}
		if (overrideCfg.notifications) {
			if (overrideCfg.notifications.addNotifications !== null && overrideCfg.notifications.addNotifications !== undefined) {
				cfg.override.addNotifications = overrideCfg.notifications.addNotifications;
			}
			if (overrideCfg.notifications.forceInt64Integers !== null && overrideCfg.notifications.forceInt64Integers !== undefined) {
				cfg.override.forceInt64Integers = overrideCfg.notifications.forceInt64Integers;
			}
			if (overrideCfg.notifications.removeEnumDuplicates !== null && overrideCfg.notifications.removeEnumDuplicates !== undefined) {
				cfg.override.removeEnumDuplicates = overrideCfg.notifications.removeEnumDuplicates;
			}
			if (overrideCfg.notifications.replaceTypeAny !== null && overrideCfg.notifications.replaceTypeAny !== undefined) {
				cfg.override.replaceTypeAny = overrideCfg.notifications.replaceTypeAny;
			}
		}
		if (overrideCfg.specific) {

		}
		if (overrideCfg.analyzeReportBefore !== null && overrideCfg.analyzeReportBefore !== undefined) {
			cfg.analyzeReportBefore = overrideCfg.analyzeReportBefore;
		}
		if (overrideCfg.analyzeReportAfter !== null && overrideCfg.analyzeReportAfter !== undefined) {
			cfg.analyzeReportAfter = overrideCfg.analyzeReportAfter;
		}
	}

	return cfg;
}


//#region Swagger Merge/Convert/

// This function will combine the public swagger with the preview swagger
export function combineSwagger(publicSwagger: SwaggerSpec, preview: SwaggerSpec): SwaggerSpec {
	log.info('Combining public and preview swagger docs into one');

	// Set new file equal to public file for now
	let newSpecificationFile = publicSwagger;

	if (!newSpecificationFile.tags) newSpecificationFile.tags = [];
	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	let publicTagNames = publicSwagger.tags.map((otag) => otag.name);
	preview.tags.forEach((previewTag) => {
		if (!publicTagNames.includes(previewTag.name)) {
			newSpecificationFile.tags.push(previewTag);
		}
	});

	if (!newSpecificationFile.securityDefinitions) newSpecificationFile.securityDefinitions = {};
	// Search for securityDefinitions that are in the preview swagger but not in the public swagger and add to new new JSON object
	let publicSecurityDefinitionNames = Object.keys(publicSwagger.securityDefinitions ?? {});
	let previewSecurityDefinitionNames = Object.keys(preview.securityDefinitions ?? {});
	for (let previewName of previewSecurityDefinitionNames) {
		if (!publicSecurityDefinitionNames.includes(previewName)) {
			newSpecificationFile.securityDefinitions[previewName] = preview.securityDefinitions[previewName];
		}
	}

	// mark preview paths as preview(similar to marking as deprecated)
	for (const [key1, value1] of Object.entries(preview.paths)) {
		for (const [key, value] of Object.entries(value1)) {
			if (preview.paths[key1][key]) preview.paths[key1][key]['x-genesys-preview'] = true;
		}
	}

	if (!newSpecificationFile.paths) newSpecificationFile.paths = {};
	// Search for paths in the preview swagger not in the public swagger(should be all paths) and add preview paths to new JSON object
	let previewPaths = Object.keys(preview.paths);
	let publicPaths = Object.keys(publicSwagger.paths);
	for (let previewPath of previewPaths) {
		if (publicPaths.includes(previewPath)) {
			// Path does exist in public swagger, add the preview HTTP method to the existing path in the new JSON object
			for (const [key, value] of Object.entries(preview.paths[previewPath])) {
				// Only set this preview operation if it is not defined in publicSwager (no override)
				if (!publicSwagger.paths[previewPath][key]) newSpecificationFile.paths[previewPath][key] = value;
			}
		} else {
			// Path does not exist in public swagger, add the preview path to the new JSON objects paths
			newSpecificationFile.paths[previewPath] = preview.paths[previewPath];
		}
	}

	if (!newSpecificationFile.definitions) newSpecificationFile.definitions = {};
	// Search for definitions in the preview swagger not in the public swagger and add preview definitions to new JSON object
	let previewDefinitionNames = Object.keys(preview.definitions);
	let publicDefinitionNames = Object.keys(publicSwagger.definitions);
	for (let previewDefinitionName of previewDefinitionNames) {
		if (!publicDefinitionNames.includes(previewDefinitionName)) {
			newSpecificationFile.definitions[previewDefinitionName] = preview.definitions[previewDefinitionName];
		}
	}

	return newSpecificationFile;
}

export function convertToSwagger(swaggerV3: any): SwaggerSpec {
	log.info('Converting OpenAPI v3 to Swagger v2');
	log.debug(`Input swagger version: ${swaggerV3?.openapi || 'unknown'}`);
	let swaggerV2: SwaggerSpec = {
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
		log.debug('Converting v3 schemas to v2 definitions');
		const schemaCount = Object.keys(swaggerV3.components.schemas).length;
		log.debug(`Processing ${schemaCount} schemas`);
		// Change #/components/schemas/ to #/definitions/ using string replace
		let allSwaggerV3SchemasAsStr = JSON.stringify(swaggerV3.components.schemas);
		const regexConvertSchemas = /#\/components\/schemas\//g;
		allSwaggerV3SchemasAsStr = allSwaggerV3SchemasAsStr.replace(regexConvertSchemas, '#/definitions/');
		swaggerV2["definitions"] = JSON.parse(allSwaggerV3SchemasAsStr);
		log.debug('Schema references converted from v3 to v2 format');

		// Clean unwanted attributes from the migrated schemas
		const keys = Object.keys(swaggerV2.definitions);
		log.debug(`Cleaning attributes for ${keys.length} definitions`);
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
					const keys = Object.keys(obj.properties);
					keys.forEach((key2, index) => {
						let obj2 = obj.properties[key2];
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
							// This is to facilitate specification diff comparison
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

//#endregion


//#region Swagger Analyze

function swaggerRecursiveAnalyze(element: any, distinctFormats: Record<string, string[]>): string[] {
	let analyzeLabel: string[] = [];
	// "GenericValue", AllOf, OneOf, MapOf, ArrayOf, String, StringEnum, StringFormatDate, StringFormatDate-Time, Nothing (no type,properties,addtionalProperties,$ref,allOf,oneOf)
	if (element["$ref"]) {
		analyzeLabel = ['ObjectReference'];
	} else if (!element["$ref"] && !element["type"]) {
		if (element["allOf"] && element["allOf"].length > 0) {
			for (let allOfObj of element["allOf"]) {
				let allOfObjAnalyze = swaggerRecursiveAnalyze(allOfObj, distinctFormats);
				for (let objLabel of allOfObjAnalyze) {
					if (!analyzeLabel.includes(objLabel)) analyzeLabel.push(objLabel);
				}
			}
			if (analyzeLabel.length == 0) analyzeLabel = ['EmptyAllOf'];
		} else if (element["oneOf"]) {
			for (let oneOfObj of element["oneOf"]) {
				let oneOfObjAnalyze = swaggerRecursiveAnalyze(oneOfObj, distinctFormats);
				for (let objLabel of oneOfObjAnalyze) {
					if (!analyzeLabel.includes(objLabel)) analyzeLabel.push(objLabel);
				}
			}
			if (analyzeLabel.length == 0) analyzeLabel = ['EmptyOneOf'];
		} else if (element["anyOf"]) {
			for (let anyOfObj of element["anyOf"]) {
				let anyOfObjAnalyze = swaggerRecursiveAnalyze(anyOfObj, distinctFormats);
				for (let objLabel of anyOfObjAnalyze) {
					if (!analyzeLabel.includes(objLabel)) analyzeLabel.push(objLabel);
				}
			}
			if (analyzeLabel.length == 0) analyzeLabel = ['EmptyAnyOf'];
		} else {
			analyzeLabel = ['EmptyObject'];
		}
	} else if (element["type"]) {
		if (element["type"] === 'object' && element["properties"] && Object.keys(element["properties"]).length > 0) {
			// ObjOf
			for (let propName in element["properties"]) {
				let propAnalyze = swaggerRecursiveAnalyze(element["properties"][propName], distinctFormats);
				for (let objPropLabel of propAnalyze) {
					if (!analyzeLabel.includes('ObjPropOf' + objPropLabel)) analyzeLabel.push('ObjPropOf' + objPropLabel);
				}
			}
			if (analyzeLabel.length == 0) analyzeLabel = ['UnknowObject'];
		} else if (element["type"] === 'object' && element["additionalProperties"]) {
			// MapOf
			let mapAnalyze = swaggerRecursiveAnalyze(element["additionalProperties"], distinctFormats);
			if (mapAnalyze.length > 0) {
				for (let mapLabel of mapAnalyze) {
					if (!analyzeLabel.includes('MapOf' + mapLabel)) analyzeLabel.push('MapOf' + mapLabel);
				}
			}
		} else if (element["type"] === 'object' && element["properties"] && Object.keys(element["properties"]).length == 0) {
			analyzeLabel = ['EmptyPropertiesObject'];
		} else if (element["type"] === 'object' && !element["properties"] && !element["additionalProperties"]) {
			analyzeLabel = ['GenericValue'];
		} else if (element["type"] === 'array' && element["items"]) {
			// ArrayOf
			let itemsAnalyze = swaggerRecursiveAnalyze(element["items"], distinctFormats);
			if (itemsAnalyze.length > 0) {
				for (let itemsLabel of itemsAnalyze) {
					if (!analyzeLabel.includes('ArrayOf' + itemsLabel)) analyzeLabel.push('ArrayOf' + itemsLabel);
				}
			}
		} else {
			// string, integer, number, boolean
			let typeFormat = '';
			if (element["format"]) {
				typeFormat = element["format"];
			}
			if (element["type"] === 'string') {
				analyzeLabel = typeFormat ? [`String(${typeFormat})`] : [`String`];
				if (typeFormat) {
					if (!distinctFormats[element["type"]].includes(typeFormat)) distinctFormats[element["type"]].push(typeFormat);
				}
			} else if (element["type"] === 'integer') {
				analyzeLabel = typeFormat ? [`Integer(${typeFormat})`] : [`Integer`];
				if (typeFormat) {
					if (!distinctFormats[element["type"]].includes(typeFormat)) distinctFormats[element["type"]].push(typeFormat);
				}
			} else if (element["type"] === 'number') {
				analyzeLabel = typeFormat ? [`Number(${typeFormat})`] : [`Number`];
				if (typeFormat) {
					if (!distinctFormats[element["type"]].includes(typeFormat)) distinctFormats[element["type"]].push(typeFormat);
				}
			} else if (element["type"] === 'boolean') {
				analyzeLabel = typeFormat ? [`Boolean(${typeFormat})`] : [`Boolean`];
				if (typeFormat) {
					if (!distinctFormats[element["type"]].includes(typeFormat)) distinctFormats[element["type"]].push(typeFormat);
				}
			} else {
				analyzeLabel = ['UnknownType'];
			}
		}
	}
	return analyzeLabel;
}

export function swaggerAnalyzeReport(swagger: SwaggerSpec, polymorphismInfo: SwaggerPolymorphismInfo): any {
	// Count nb Models
	let nbModels = 0;
	// Count nb Paths and nb Operations
	let nbPaths = 0;
	let nbOperations = 0;
	// Detect used consumes/Accept
	let distinctConsumes: string[] = [];
	// Detect used produces/Content-Type
	let distinctProduces: string[] = [];

	// Review Tags
	let tagsReview: {
		declared: string[];
		used: string[];
		unused: string[];
		missing: string[];
	} = {
		'declared': [],
		'used': [],
		'unused': [],
		'missing': []
	};
	// Review Securities
	let securitiesReview: {
		declared: string[];
		used: string[];
		unused: string[];
		missing: string[];
	} = {
		'declared': [],
		'used': [],
		'unused': [],
		'missing': []
	};

	let distinctParameterTypes: string[] = [];
	let distinctBodyTypes: string[] = [];
	let distinctResponseTypes: string[] = [];
	let distinctModelTypes: string[] = [];
	let distinctFormats: {
		string: string[];
		number: string[];
		integer: string[];
		boolean: string[];
	} = {
		'string': [],
		'number': [],
		'integer': [],
		'boolean': []
	};

	if (swagger.consumes) {
		distinctConsumes = [...swagger.consumes];
	}
	if (swagger.produces) {
		distinctProduces = [...swagger.produces];
	}

	if (swagger.tags) {
		tagsReview.declared = swagger.tags.map((oTag) => { return oTag.name; });
	}
	if (swagger.securityDefinitions) {
		securitiesReview.declared = Object.keys(swagger.securityDefinitions);
		if (!securitiesReview.declared.includes(NO_AUTH_SECURITY)) securitiesReview.declared.push(NO_AUTH_SECURITY);
	}

	if (swagger.definitions) {
		let modelNames = Object.keys(swagger.definitions);
		nbModels = modelNames.length;
	}

	if (swagger.paths) {
		let pathKeys = Object.keys(swagger.paths);
		nbPaths = pathKeys.length;
		for (let pathKey of pathKeys) {
			if (swagger.paths[pathKey]) {
				let httpMethods = Object.keys(swagger.paths[pathKey]);
				nbOperations = nbOperations + httpMethods.length;
				for (let httpMethod of httpMethods) {
					let operation = swagger.paths[pathKey][httpMethod];
					if (!operation) continue; // For typescript strict check
					if (operation.consumes && operation.consumes.length > 0) {
						for (let consume of operation.consumes) {
							if (!distinctConsumes.includes(consume)) distinctConsumes.push(consume);
						}
					}
					if (operation.produces && operation.produces.length > 0) {
						for (let produce of operation.produces) {
							if (!distinctProduces.includes(produce)) distinctProduces.push(produce);
						}
					}
					// tags
					if (operation.tags && operation.tags.length > 0) {
						for (let tag of operation.tags) {
							if (!tagsReview.used.includes(tag)) tagsReview.used.push(tag);
						}
					}
					// security
					if (operation.security && operation.security.length > 0) {
						for (let oSec of operation.security) {
							let oSecKeys = Object.keys(oSec);
							if (oSecKeys.length > 0) {
								let secName = oSecKeys[0];
								if (!securitiesReview.used.includes(secName)) securitiesReview.used.push(secName);
							} else {
								if (!securitiesReview.used.includes(NO_AUTH_SECURITY)) securitiesReview.used.push(NO_AUTH_SECURITY);
							}
						}
					} else {
						if (!securitiesReview.used.includes(NO_AUTH_SECURITY)) securitiesReview.used.push(NO_AUTH_SECURITY);
					}

					if (operation.parameters && operation.parameters.length > 0) {
						for (let oParam of operation.parameters) {
							if (oParam.in !== "body") {
								let parameterAnalyze = swaggerRecursiveAnalyze(oParam, distinctFormats);
								for (let paramLabel of parameterAnalyze) {
									if (!distinctParameterTypes.includes(paramLabel)) distinctParameterTypes.push(paramLabel);
								}
							} else {
								if (oParam.schema) {
									let bodyAnalyze = swaggerRecursiveAnalyze(oParam.schema, distinctFormats);
									for (let bodyLabel of bodyAnalyze) {
										if (!distinctBodyTypes.includes(bodyLabel)) distinctBodyTypes.push(bodyLabel);
									}
								}
							}
						}
					}
					if (operation.responses && Object.keys(operation.responses).length > 0) {
						for (let respStatus in operation.responses) {
							if (respStatus.startsWith('2') || respStatus.startsWith('3')) {
								if (operation.responses[respStatus].schema) {
									let respAnalyze = swaggerRecursiveAnalyze(operation.responses[respStatus].schema, distinctFormats);
									for (let respLabel of respAnalyze) {
										if (!distinctResponseTypes.includes(respLabel)) distinctResponseTypes.push(respLabel);
									}
								}
							}
						}
					}
				}
			}
		}
	}

	if (swagger.definitions) {
		for (let modelName in swagger.definitions) {
			let modelAnalyze = swaggerRecursiveAnalyze(swagger.definitions[modelName], distinctFormats);
			for (let modelLabel of modelAnalyze) {
				if (!distinctModelTypes.includes(modelLabel)) distinctModelTypes.push(modelLabel);
			}
		}
	}

	for (let tag of tagsReview.declared) {
		if (!tagsReview.used.includes(tag)) {
			if (!tagsReview.unused.includes(tag)) tagsReview.unused.push(tag);
		}
	}
	for (let tag of tagsReview.used) {
		if (!tagsReview.declared.includes(tag)) {
			if (!tagsReview.missing.includes(tag)) tagsReview.missing.push(tag);
		}
	}

	for (let tag of securitiesReview.declared) {
		if (!securitiesReview.used.includes(tag)) {
			if (!securitiesReview.unused.includes(tag)) securitiesReview.unused.push(tag);
		}
	}
	for (let tag of securitiesReview.used) {
		if (!securitiesReview.declared.includes(tag)) {
			if (!securitiesReview.missing.includes(tag)) securitiesReview.missing.push(tag);
		}
	}

	return {
		nbModels: nbModels,
		nbPaths: nbPaths,
		nbOperations: nbOperations,
		distinctConsumes: distinctConsumes,
		distinctProduces: distinctProduces,
		tagsReview: tagsReview,
		securitiesReview: securitiesReview,
		distinctParameterTypes: distinctParameterTypes,
		distinctBodyTypes: distinctBodyTypes,
		distinctResponseTypes: distinctResponseTypes,
		distinctModelTypes: distinctModelTypes,
		distinctFormats: distinctFormats,
		polymorphismInfo: polymorphismInfo ?? {}
	};

}

//#endregion


//#region Swagger Remove Unused Definitions

export function swaggerRemoveUnusedDefinitions(swagger: SwaggerSpec, polymorphismInfo: SwaggerPolymorphismInfo) {
	// Remove unused definitions
	let regexDefinitionName = /"\$ref":"#\/definitions\/([^"]*)"/g;

	let usedDefinitionNames: string[] = [];

	// Find references in operations (paths)
	let discoveredDefinitionNames: string[] = [];
	if (swagger.paths) {
		let inputString = JSON.stringify(swagger.paths);

		let matches: any;
		while (matches = regexDefinitionName.exec(inputString)) {
			if (matches[1] && !matches[1].endsWith("\\")) {
				if (!discoveredDefinitionNames.includes(matches[1])) discoveredDefinitionNames.push(matches[1]);
			} else {
				// Ignore what could come from property description or notes
			}
		}
		// Add discoveredDefinitionNames into usedDefinitionNames
		usedDefinitionNames = [...discoveredDefinitionNames];
		console.log(`Found ${discoveredDefinitionNames.length} referenced definitions.`);
	}

	let definitionsToSearch = [...discoveredDefinitionNames];
	discoveredDefinitionNames = [];
	while (definitionsToSearch.length > 0) {
		// Check definitions from definitionsToSearch - 1 by 1
		// Check if discriminator based definition
		// Otherwise find references in each definition - add to discoveredDefinitionNames if not part of usedDefinitionNames
		for (let modelName of definitionsToSearch) {
			let definition = swagger.definitions[modelName];
			if (definition.discriminator) {
				// Find Child classes
				let childClasses: string[] = [];
				if (polymorphismInfo.parents[modelName].childrenNames) childClasses = polymorphismInfo.parents[modelName].childrenNames;
				
				if (childClasses && childClasses.length > 0) {
					for (let childName of childClasses) {
						if (!usedDefinitionNames.includes(childName) && !discoveredDefinitionNames.includes(childName)) discoveredDefinitionNames.push(childName);
					}
				}
			}

			let inputString = JSON.stringify(definition);

			let matches: any;
			while (matches = regexDefinitionName.exec(inputString)) {
				if (matches[1] && !matches[1].endsWith("\\")) {
					if (!usedDefinitionNames.includes(matches[1]) && !discoveredDefinitionNames.includes(matches[1])) discoveredDefinitionNames.push(matches[1]);
				} else {
					// Ignore what could come from property description or notes
				}
			}
		}

		if (discoveredDefinitionNames.length > 0) {
			definitionsToSearch = [...discoveredDefinitionNames];
			usedDefinitionNames = [...usedDefinitionNames, ...discoveredDefinitionNames];
			discoveredDefinitionNames = [];
		} else {
			definitionsToSearch = [];
		}
	}
	console.log(`Found a total of ${usedDefinitionNames.length} referenced definitions.`);

	let allDefinitionNames = Object.keys(swagger.definitions);
	for (let modelName of allDefinitionNames) {
		if (!usedDefinitionNames.includes(modelName)) delete swagger.definitions[modelName];
	}
}

//#endregion


//#region Swagger Extract Polymorphism info

export interface SwaggerDefinitionPolymorphismInfo {
	// same as SwaggerPolymorphismInfo.parents key
	name: string;
	discriminatorProperty: string;
	// if enum provided on discriminator property
	discriminatorValues: string[],
	childrenNames: string[];
	// child name to discriminator value - if available
	childrenNamesMapping: Record<string, string>;
}

export interface SwaggerPolymorphismInfo {
	parents: Record<string, SwaggerDefinitionPolymorphismInfo>;
}

export function swaggerExtractPolymorphismInfo(swagger: SwaggerSpec, addToExtensions: boolean): SwaggerPolymorphismInfo {
	let result: SwaggerPolymorphismInfo = {
		parents: {}
	};

	for (let modelName in swagger.definitions) {
		let model = swagger.definitions[modelName];
		if (model && model.discriminator) {
			let valuesFromEnum: string[] = [];
			if (model.properties && model.properties[model.discriminator]) {
				if (model.properties[model.discriminator].type === 'string' && model.properties[model.discriminator].enum) {
					valuesFromEnum = model.properties[model.discriminator].enum as string[];
				}
			}
			result.parents[modelName] = {
				name: modelName,
				discriminatorProperty: model.discriminator,
				discriminatorValues: valuesFromEnum,
				childrenNames: [],
				childrenNamesMapping: {}
			}
		}
	}

	// Find Children
	let parentNames: string[] = Object.keys(result.parents);
	for (let modelName in swagger.definitions) {
		let model = swagger.definitions[modelName];
		if (model.allOf && model.allOf.length > 0) {
			for (let obj of model.allOf) {
				if (obj["$ref"]) {
					let refName = obj["$ref"].replace("#/definitions/", "");
					if (parentNames.includes(refName)) {
						result.parents[refName].childrenNames.push(modelName);
						if (model["x-discriminator-value"]) {
							result.parents[refName].childrenNamesMapping[modelName] = model["x-discriminator-value"];
							if (!result.parents[refName].discriminatorValues.includes(model["x-discriminator-value"])) {
								result.parents[refName].discriminatorValues.push(model["x-discriminator-value"]);
							}
						}
						break;
					}
				}
			}
		}
	}

	// Add info to vendor extensions if requested
	if (addToExtensions === true) {
		for (let parentName in result.parents) {
			let model = swagger.definitions[parentName];
			model["x-genesys-polymorphism-is-parent"] = true;
			model["x-genesys-polymorphism-property"] = result.parents[parentName].discriminatorProperty;
			model["x-genesys-polymorphism-values"] = result.parents[parentName].discriminatorValues;
			model["x-genesys-polymorphism-children"] = result.parents[parentName].childrenNames;
			model["x-genesys-polymorphism-children-mapping"] = result.parents[parentName].childrenNamesMapping;

			for (let childName of result.parents[parentName].childrenNames) {
				if (swagger.definitions[childName]) {
					let childModel = swagger.definitions[childName];
					childModel["x-genesys-polymorphism-is-child"] = true;
					childModel["x-genesys-polymorphism-property"] = result.parents[parentName].discriminatorProperty;
					childModel["x-genesys-polymorphism-parent"] = parentName;

					if (childModel["x-discriminator-value"]) {
						if (childModel.type === ItemsType.Object && childModel.properties) {
							// if discriminator property does not exist, add (const: value) for discriminator property
							if (!childModel.properties[result.parents[parentName].discriminatorProperty]) {
								childModel.properties[result.parents[parentName].discriminatorProperty] = {
									"type": ItemsType.String,
									"enum": [ childModel["x-discriminator-value"] ],
									"x-genesys-polymorphism-is-child": true,
									"x-genesys-polymorphism-parent": parentName,
									"x-discriminator-value": childModel["x-discriminator-value"]
								}
							} else {
								// otherwise, add information at property level
								childModel.properties[result.parents[parentName].discriminatorProperty]["x-genesys-polymorphism-is-child"] = true;
								childModel.properties[result.parents[parentName].discriminatorProperty]["x-genesys-polymorphism-parent"] = parentName;
								childModel.properties[result.parents[parentName].discriminatorProperty]["x-discriminator-value"] = childModel["x-discriminator-value"];
							}
						}
					}
				}
			}
		}
	}

	return result;
}

// Use in remove unused
// use in discriminator management


//#endregion

