import _ from 'lodash';
import { ConsumeElement, Definition, ItemsType, OpenApiSpec } from '../../types/openapiSpec.js';
import { SpecificationPreprocessing, Config, OpenApiPreprocessing } from '../../types/config.js';
import { log } from '../../log/logger.js';
import { mergeSpecificationPreprocessingCfg, openapiAnalyzeReport, openapiRemoveUnusedSchemas, openapiExtractPolymorphismInfo, OpenApiPolymorphismInfo } from './openApiUtils.js';

const NO_AUTH_SECURITY = 'NO_AUTH_SECURITY';
const NO_OP_CONSUME = 'NO_OP_CONSUME';
const NO_OP_PRODUCE = 'NO_OP_PRODUCE';
const GC_ONE_OF_EXTENSIONS = "x-genesys-one-of";


//#region OpenApi Preprocessing

// This function will pre-process the openapi file before submitting it to the generator
export function openapiPreprocessing(builderConfig: Config, openapi: OpenApiSpec, overrideCfg: SpecificationPreprocessing | null) {
	let cfg = mergeSpecificationPreprocessingCfg(overrideCfg);

	// report analyze before
	if (cfg.analyzeReportBefore === true) {
		let beforeReport = openapiAnalyzeReport(openapi, null);
		console.log('OpenApi - Printing OpenApi Analyze Report (Before):');
		console.log(JSON.stringify(beforeReport, null, 4));
	}

	// spec preprocessing
	openapiSpecificationPreprocessing(openapi, cfg);

	// Extract Polymorphism Info
	let polymorphismInfo = openapiExtractPolymorphismInfo(openapi, cfg.addPolymorphismInfo);

	// specific preprocessing
	openapiSpecificPreprocessing(builderConfig, openapi, cfg, polymorphismInfo);

	// remove unused
	if (cfg.removeUnused === true) {
		openapiRemoveUnusedSchemas(openapi, polymorphismInfo);
	}

	// report analyze after
	if (cfg.analyzeReportAfter === true) {
		let afterReport = openapiAnalyzeReport(openapi, polymorphismInfo);
		console.log('OpenApi - Printing OpenApi Analyze Report (After):');
		console.log(JSON.stringify(afterReport, null, 4));
	}

	return;
}

//#endregion


//#region OpenApi Specification Preprocessing (add/override/filter)

function openapiSpecificationPreprocessing(openapi: OpenApiSpec, cfg: SpecificationPreprocessing) {

	// add
	if (cfg.add && cfg.add.tags && cfg.add.tags.length > 0) {
		let declaredTagNames: string[] = openapi.tags.map((oTag) => oTag.name);
		for (let oTag of cfg.add.tags) {
			if (!declaredTagNames.includes(oTag.name)) {
				openapi.tags.push(JSON.parse(JSON.stringify(oTag)));
			}
		}
	}

	if (cfg.add && cfg.add.securities && Object.keys(cfg.add.securities).length > 0) {
		for (let secName in cfg.add.securities) {
			if (!openapi.components.securitySchemes[secName]) openapi.components.securitySchemes[secName] = JSON.parse(JSON.stringify(cfg.add.securities[secName]));
		}
	}

	// override
	if (cfg.override && cfg.override.modelNames && Object.keys(cfg.override.modelNames).length > 0) {
		for (let originalModelName in cfg.override.modelNames) {
			if (openapi.components.schemas[originalModelName]) {
				// Model exists in Swagger
				let newModelName = cfg.override.modelNames[originalModelName];
				openapi.components.schemas[newModelName] = JSON.parse(JSON.stringify(openapi.components.schemas[originalModelName]));
				delete openapi.components.schemas[originalModelName];

				// Change references
				let componentsAsString = JSON.stringify(openapi.components);
				let pathsAsString = JSON.stringify(openapi.paths);
				let regexConvertRef = new RegExp(String.raw`"#\/components\/schemas\/${originalModelName}"`, "g");
				componentsAsString = componentsAsString.replace(regexConvertRef, `"#/components/schemas/${newModelName}"`);
				pathsAsString = pathsAsString.replace(regexConvertRef, `"#/components/schemas/${newModelName}"`);
				openapi.components = JSON.parse(componentsAsString);
				openapi.paths = JSON.parse(pathsAsString);
			}
		}
	}
	if (cfg.override && cfg.override.operationIds && Object.keys(cfg.override.operationIds).length > 0) {
		for (let path in cfg.override.operationIds) {
			for (let method in cfg.override.operationIds[path]) {
				if (openapi.paths[path] && openapi.paths[path][method]) {
					openapi.paths[path][method].operationId = cfg.override.operationIds[path][method];
				}
			}
		}
	}
	if (cfg.override && cfg.override.modelsToPrimitiveType && Object.keys(cfg.override.modelsToPrimitiveType).length > 0) {
		for (let originalModelName in cfg.override.modelsToPrimitiveType) {
			if (openapi.components.schemas[originalModelName]) {
				// Model exists in Swagger
				delete openapi.components.schemas[originalModelName];

				// Change references
				let primitiveTypeAsString = `"type":"${cfg.override.modelsToPrimitiveType[originalModelName].type ?? ''}"`;
				if (cfg.override.modelsToPrimitiveType[originalModelName].format) {
					primitiveTypeAsString = `${primitiveTypeAsString},"format":"${cfg.override.modelsToPrimitiveType[originalModelName].format}"`;
				}
				let componentsAsString = JSON.stringify(openapi.components);
				let pathsAsString = JSON.stringify(openapi.paths);
				let regexConvertRef = new RegExp(String.raw`"\$ref":"#\/components\/schemas\/${originalModelName}"`, "g");
				componentsAsString = componentsAsString.replace(regexConvertRef, primitiveTypeAsString);
				pathsAsString = pathsAsString.replace(regexConvertRef, primitiveTypeAsString);
				openapi.components = JSON.parse(componentsAsString);
				openapi.paths = JSON.parse(pathsAsString);
			}
		}
	}
	if (cfg.override && cfg.override.models && Object.keys(cfg.override.models).length > 0) {
		for (let modelName in cfg.override.models) {
			openapi.components.schemas[modelName] = JSON.parse(JSON.stringify(cfg.override.models[modelName]));
		}
	}
	if (cfg.override && cfg.override.operations && Object.keys(cfg.override.operations).length > 0) {
		for (let path in cfg.override.operations) {
			for (let method in cfg.override.operations[path]) {
				if (!openapi.paths[path]) openapi.paths[path] = {};
				openapi.paths[path][method] = JSON.parse(JSON.stringify(cfg.override.operations[path][method]));
			}
		}
	}

	// filter
	for (let path in openapi.paths) {
		for (let method in openapi.paths[path]) {
			let operation = openapi.paths[path][method];
			if (!operation) continue; // For typescript strict check
			let keepOperation = true;
			if (cfg.filter && cfg.filter.keep) {
				if (keepOperation === true && cfg.filter.keep.tags && cfg.filter.keep.tags.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;
					for (let tagName of cfg.filter.keep.tags) {
						if (operation.tags.includes(tagName)) {
							keepOperation = true;
							break;
						}
					}
				}
				if (keepOperation === true && cfg.filter.keep.securities && cfg.filter.keep.securities.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;
					if (operation.security && operation.security.length > 0) {
						for (let oSecurity of operation.security) {
							let secPropNames: string[] = Object.keys(oSecurity);
							if (secPropNames.length > 0) {
								if (cfg.filter.keep.securities.includes(secPropNames[0])) {
									keepOperation = true;
									break;
								}
							} else {
								// operation that does not require authorization (NO_AUTH_SECURITY)
								if (cfg.filter.keep.securities.includes(NO_AUTH_SECURITY)) {
									keepOperation = true;
									break;
								}
							}
						}
					} else {
						// operation that does not require authorization (NO_AUTH_SECURITY)
						if (cfg.filter.keep.securities.includes(NO_AUTH_SECURITY)) {
							keepOperation = true;
						}
					}
				}
				if (keepOperation === true && cfg.filter.keep.operationIds && cfg.filter.keep.operationIds.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;
					if (cfg.filter.keep.operationIds.includes(operation.operationId)) {
						keepOperation = true;
						break;
					}
				}
				if (keepOperation === true && cfg.filter.keep.paths && cfg.filter.keep.paths.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;
					for (let pathName of cfg.filter.keep.paths) {
						if (pathName === path) {
							keepOperation = true;
							break;
						} else if (pathName.endsWith('*')) {
							if (path.startsWith(pathName.slice(0, -1))) {
								keepOperation = true;
								break;
							}
						}
					}
				}
				if (keepOperation === true && cfg.filter.keep.consumes && cfg.filter.keep.consumes.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;

					if (operation.requestBody && operation.requestBody.content && Object.keys(operation.requestBody.content).length > 0) {
						for (let consume of Object.keys(operation.requestBody.content)) {
							if (cfg.filter.keep.consumes.includes(consume)) {
								keepOperation = true;
								break;
							}
						}
					} else {
						// Check NO_OP_CONSUME (ex: GET - en général/pour le moment, Delete - quoi que dans le futur, probablement Head)
						if (cfg.filter.keep.consumes.includes(NO_OP_CONSUME)) {
							keepOperation = true;
						}
					}
				}
				if (keepOperation === true && cfg.filter.keep.produces && cfg.filter.keep.produces.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;

					let operationProduces: string[] = [];
					if (operation.responses && Object.keys(operation.responses).length > 0) {
						for (let status in operation.responses) {
							if (operation.responses[status].content) {
								let responseProduces = Object.keys(operation.responses[status].content);
								for (let responseProduce of responseProduces) {
									if (!operationProduces.includes(responseProduce)) operationProduces.push(responseProduce);
								}
							}
						}
					}

					if (operationProduces.length > 0) {
						for (let produce of operationProduces) {
							if (cfg.filter.keep.produces.includes(produce)) {
								keepOperation = true;
								break;
							}
						}
					} else {
						// Check NO_OP_PRODUCE
						if (cfg.filter.keep.produces.includes(NO_OP_PRODUCE)) {
							keepOperation = true;
						}
					}
				}
			}
			if (cfg.filter && cfg.filter.exclude) {
				if (keepOperation === true && cfg.filter.exclude.tags && cfg.filter.exclude.tags.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					for (let tagName of cfg.filter.exclude.tags) {
						if (operation.tags.includes(tagName)) {
							keepOperation = false;
							break;
						}
					}
				}
				if (keepOperation === true && cfg.filter.exclude.securities && cfg.filter.exclude.securities.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					if (operation.security && operation.security.length > 0) {
						for (let oSecurity of operation.security) {
							let secPropNames: string[] = Object.keys(oSecurity);
							if (secPropNames.length > 0) {
								if (cfg.filter.exclude.securities.includes(secPropNames[0])) {
									keepOperation = false;
									break;
								}
							} else {
								// operation that does not require authorization (NO_AUTH_SECURITY)
								if (cfg.filter.exclude.securities.includes(NO_AUTH_SECURITY)) {
									keepOperation = false;
									break;
								}
							}
						}
					} else {
						// operation that does not require authorization (NO_AUTH_SECURITY)
						if (cfg.filter.exclude.securities.includes(NO_AUTH_SECURITY)) {
							keepOperation = false;
						}
					}
				}
				if (keepOperation === true && cfg.filter.exclude.operationIds && cfg.filter.exclude.operationIds.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					if (cfg.filter.exclude.operationIds.includes(operation.operationId)) {
						keepOperation = false;
						break;
					}
				}
				if (keepOperation === true && cfg.filter.exclude.paths && cfg.filter.exclude.paths.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					for (let pathName of cfg.filter.exclude.paths) {
						if (pathName === path) {
							keepOperation = false;
							break;
						} else if (pathName.endsWith('*')) {
							if (path.startsWith(pathName.slice(0, -1))) {
								keepOperation = false;
								break;
							}
						}
					}
				}
				if (keepOperation === true && cfg.filter.exclude.consumes && cfg.filter.exclude.consumes.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					if (operation.requestBody && operation.requestBody.content && Object.keys(operation.requestBody.content).length > 0) {
						for (let consume of Object.keys(operation.requestBody.content)) {
							if (cfg.filter.exclude.consumes.includes(consume)) {
								keepOperation = false;
								break;
							}
						}
					} else {
						// Check NO_OP_CONSUME (ex: GET - en général/pour le moment, Delete - quoi que dans le futur, probablement Head)
						if (cfg.filter.exclude.consumes.includes(NO_OP_CONSUME)) {
							keepOperation = false;
						}
					}
				}
				if (keepOperation === true && cfg.filter.exclude.produces && cfg.filter.exclude.produces.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default

					let operationProduces: string[] = [];
					if (operation.responses && Object.keys(operation.responses).length > 0) {
						for (let status in operation.responses) {
							if (operation.responses[status].content) {
								let responseProduces = Object.keys(operation.responses[status].content);
								for (let responseProduce of responseProduces) {
									if (!operationProduces.includes(responseProduce)) operationProduces.push(responseProduce);
								}
							}
						}
					}

					if (operationProduces.length > 0) {
						for (let produce of operationProduces) {
							if (cfg.filter.exclude.produces.includes(produce)) {
								keepOperation = false;
								break;
							}
						}
					} else {
						// Check NO_OP_PRODUCE
						if (cfg.filter.exclude.produces.includes(NO_OP_PRODUCE)) {
							keepOperation = false;
						}
					}
				}
			}

			if (keepOperation === false) {
				delete openapi.paths[path][method];
				if (Object.keys(openapi.paths[path]).length == 0) delete openapi.paths[path];
			}
		}
	}
}

//#endregion


//#region OpenApi Preprocessing (specific)

// This function will pre-process the openapi file before submitting it to the generator
function openapiSpecificPreprocessing(builderConfig: Config, openapi: OpenApiSpec, cfg: SpecificationPreprocessing, polymorphismInfo: OpenApiPolymorphismInfo) {
	let specificCfg: OpenApiPreprocessing = cfg.specific as OpenApiPreprocessing;

	if (specificCfg.replaceResponseWithArrayRef === true) {
		processArrayOfRefResponses(openapi);
	}
	
	if (specificCfg.processPaths === true) {
		processPaths(builderConfig, openapi);
	}

	if (specificCfg.forceCSVCollectionFormatInTags && specificCfg.forceCSVCollectionFormatInTags.length > 0) {
		forceCSVCollectionFormat(openapi, specificCfg.forceCSVCollectionFormatInTags);
	}

	if (specificCfg.updateOneOf === true) {
		updateOneOf(openapi);
	}

	if (specificCfg.processEnums === true) {
		processProperties(openapi);
	}

	return;
}

/* PRIVATE FUNCTIONS */

function processPaths(builderConfig: Config, openapi: OpenApiSpec) {
	const paths = Object.keys(openapi.paths);
	for (const path of paths) {
		if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && !path.startsWith("/api/v2/apps/agentic") && builderConfig.settings.swaggerCodegen.codegenLanguage === "purecloudpython")) {
			delete openapi.paths[path]
		}
	}

	if (builderConfig.settings.swaggerCodegen.codegenLanguage !== "purecloudpython") return

	const definitions = Object.keys(openapi.components.schemas);
	for (const definition of definitions) {
		if (definition.endsWith("_")) {
			delete openapi.components.schemas[definition]
		}
	}
}

function forceCSVCollectionFormat(openapi: OpenApiSpec, forceCSVCollectionFormatInTags: string[]) {
	if (forceCSVCollectionFormatInTags && forceCSVCollectionFormatInTags.length > 0) {
		log.info(`Updating CollectionFormat from multi to csv for operations with tags: ${forceCSVCollectionFormatInTags.toString()}`);
		const paths = Object.keys(openapi.paths);
		for (const path of paths) {
			const methods = Object.keys(openapi.paths[path]);
			for (const method of methods) {
				let operation = openapi.paths[path][method];
				let overrideOperation = false;
				for (let overrideTag of forceCSVCollectionFormatInTags) {
					if (operation && operation.tags && operation.tags.includes(overrideTag)) {
						overrideOperation = true;
						break;
					}
				}
				if (overrideOperation === true) {
					if (operation && operation.parameters && operation.parameters.length > 0) {
						for (let opParameter of operation.parameters) {
							if (opParameter.in && opParameter.in === "query" && opParameter.schema && opParameter.schema.type && opParameter.schema.type === "array") {
								opParameter.style = "form";
								opParameter.explode = false;
							}
						}
					}
				}
			}
		}
	}
	return;
}

function updateOneOf(openapi: OpenApiSpec) {
	for (let defKey in openapi.components.schemas) {
		if (openapi.components.schemas[defKey][GC_ONE_OF_EXTENSIONS]) {
			openapi.components.schemas[defKey]["oneOf"] = [];
			let oneOfElements = openapi.components.schemas[defKey][GC_ONE_OF_EXTENSIONS];
			if (oneOfElements && oneOfElements.length > 0) {
				for (let oneOfElement of oneOfElements) {
					openapi.components.schemas[defKey]["oneOf"].push({
						"$ref": `#/components/schemas/${oneOfElement}`
					});
				}
			}
		}
	}
}

function processArrayOfRefResponses(openapi: OpenApiSpec) {
	// Get list of definitions/schema with a type: array as top level (they were removed in swagger - to reduce number of created classes)
	let mapModelNames: Record<string, string> = {};

	for (let modelName in openapi.components.schemas) {
		let model = openapi.components.schemas[modelName];
		if (model.type && model.type === ItemsType.Array) {
			// prepare transformation
			let replaceWithAsJson: Definition = {
				type: model.type
			};
			if (model.items) replaceWithAsJson.items = JSON.parse(JSON.stringify(model.items));
			let replaceWithString: string = JSON.stringify(replaceWithAsJson);
			// Remove leading { and ending }
			if (replaceWithString.startsWith('{')) replaceWithString = replaceWithString.slice(1);
			if (replaceWithString.endsWith('}')) replaceWithString = replaceWithString.slice(0, -1);
			mapModelNames[modelName] = replaceWithString;
		}
	}

	// Delete array definitions/schemas
	for (let excludeModelName in mapModelNames) {
		delete openapi.components.schemas[excludeModelName];
	}

	// Change references in paths and components
	let componentsAsString = JSON.stringify(openapi.components);
	let pathsAsString = JSON.stringify(openapi.paths);
	for (let excludeModelName in mapModelNames) {
		let regexConvertRef = new RegExp(String.raw`"#\/components\/schemas\/${excludeModelName}"`, "g");
		componentsAsString = componentsAsString.replace(regexConvertRef, mapModelNames[excludeModelName]);
		pathsAsString = pathsAsString.replace(regexConvertRef, mapModelNames[excludeModelName]);
	}
	openapi.components = JSON.parse(componentsAsString);
	openapi.paths = JSON.parse(pathsAsString);
}

function processProperties(openapi: OpenApiSpec) {
	for (let pathName in openapi.paths) {
		for (let methodName in openapi.paths[pathName]) {
			let operation = openapi.paths[pathName][methodName];
			if (!operation) continue; // Tpescript strict check
			if (operation.parameters && operation.parameters.length > 0) {
				for (let oParam of operation.parameters) {
					if (oParam.schema) {
						recursivePropertyUpdate(oParam.schema, true);
					}
				}
			}
			if (operation.requestBody && operation.requestBody.content) {
				let bodyContents: Record<string, any> = operation.requestBody.content;
				for (let contentType in bodyContents) {
					let content: any = bodyContents[contentType];
					if (content && content.schema) {
						recursivePropertyUpdate(content.schema, false);
					}
				}
			}
			if (operation.responses && Object.keys(operation.responses).length > 0) {
				for (let respStatus in operation.responses) {
					if (respStatus.startsWith('2') || respStatus.startsWith('3')) {
						if (operation.responses[respStatus].content) {
							let responseContents: Record<string, any> = operation.responses[respStatus].content;
							for (let contentType in responseContents) {
								let content: any = responseContents[contentType];
								if (content && content.schema) {
									recursivePropertyUpdate(content.schema, false);
								}
							}
						}
					}
				}
			}
		}
	}

	for (let modelName in openapi.components.schemas) {
		recursivePropertyUpdate(openapi.components.schemas[modelName], false);
	}
}

function recursivePropertyUpdate(element: any, isParameter: boolean) {
	// string, integer, number, boolean
	let primitiveTypes = ['string', 'integer', 'number', 'boolean'];

	if (!element["$ref"] && !element["type"]) {
		if (element["allOf"] && element["allOf"].length > 0) {
			for (let allOfObj of element["allOf"]) {
				recursivePropertyUpdate(allOfObj, isParameter);
			}
		} else if (element["oneOf"] && element["oneOf"].length > 0) {
			for (let oneOfObj of element["oneOf"]) {
				recursivePropertyUpdate(oneOfObj, isParameter);
			}
		} else if (element["anyOf"] && element["anyOf"].length > 0) {
			for (let anyOfObj of element["anyOf"]) {
				recursivePropertyUpdate(anyOfObj, isParameter);
			}
		}
	} else if (element["type"]) {
		if (element["type"] === 'object' && element["properties"] && Object.keys(element["properties"]).length > 0) {
			// ObjOf
			for (let propName in  element["properties"]) {
				recursivePropertyUpdate(element["properties"][propName], isParameter);
			}
		} else if (element["type"] === 'object' && element["additionalProperties"]) {
			// MapOf
			recursivePropertyUpdate(element["additionalProperties"], isParameter);
		} else if (element["type"] === 'array' && element["items"]) {
			// ArrayOf
			// Fix errors in openapi specification with enum defined at wrong level (or x-genesys-enum-members)
			if (element["enum"]) {
				if (element["items"] && element["items"]["type"] && primitiveTypes.includes(element["items"]["type"])) {
					element["items"]["enum"] = JSON.parse(JSON.stringify(element["enum"]));
					delete element["enum"];
				}
			}
			if (element["x-genesys-enum-members"]) {
				if (element["items"] && element["items"]["type"] && primitiveTypes.includes(element["items"]["type"])) {
					element["items"]["x-genesys-enum-members"] = element["x-genesys-enum-members"].map((oEnum: any) => oEnum.name);
					delete element["x-genesys-enum-members"];
				}
			}
			recursivePropertyUpdate(element["items"], isParameter);
		} else {
			if (primitiveTypes.includes(element["type"])) {
				if (element["x-genesys-enum-members"]) {
					element["enum"] = element["x-genesys-enum-members"].map((oEnum: any) => oEnum.name);
					delete element["x-genesys-enum-members"];
				}
				if (element["enum"]) {
					if (element["enum"].length == 0) {
						// Delete empty enum
						delete element["enum"];
					} else if (element["type"] === "boolean") {
						// Delete enum for booleans
						delete element["enum"];
					} else if (isParameter === true && element["type"] === "string" && element["enum"].length == 2 && element["enum"].includes("true") &&  element["enum"].includes("false")) {
						// String enum (as parameter) with true/false - change to boolean
						// For future
						// element["type"] = "boolean";
						// delete element["enum"];
					} else {
						if (element["type"] === "string") {
							let filteredEnum: string[] = [];
							let upperCaseEnum: string[] = [];
							for (let enumValue of element["enum"]) {
								if (!upperCaseEnum.includes(enumValue.toUpperCase())) {
									upperCaseEnum.push(enumValue.toUpperCase());
									filteredEnum.push(enumValue);
								} else {
									log.info(`Duplicate enum value: ${enumValue}. Removing it...`);
								}
							}
							element["enum"] = filteredEnum;
						} else if (element["type"] === "integer" || element["type"] === "number") {
							let filteredEnum: number[] = [];
							for (let enumValue of element["enum"]) {
								if (!filteredEnum.includes(enumValue)) {
									filteredEnum.push(enumValue);
								} else {
									log.info(`Duplicate enum value: ${enumValue}. Removing it...`);
								}
							}
							element["enum"] = filteredEnum;
						}
					}
				}
			}
		}
	}
}


//#endregion

