import _ from 'lodash';
import { ItemsType, SwaggerSpec, CollectionFormat } from '../../types/swaggerSpec.js';
import { SpecificationPreprocessing, SwaggerPreprocessing, Config } from '../../types/config.js';
import { mergeSpecificationPreprocessingCfg, swaggerAnalyzeReport, swaggerRemoveUnusedDefinitions, swaggerExtractPolymorphismInfo, SwaggerPolymorphismInfo } from './swaggerUtils.js';
import { log } from '../../log/logger.js';

const NO_AUTH_SECURITY = 'NO_AUTH_SECURITY';
const NO_OP_CONSUME = 'NO_OP_CONSUME';
const NO_OP_PRODUCE = 'NO_OP_PRODUCE';
const GC_ONE_OF_EXTENSIONS = "x-genesys-one-of";

const DEFAULT_CONSUMES = ["application/json"];
const DEFAULT_PRODUCES = ["application/json"];


//#region Swagger Preprocessing

// This function will pre-process the swagger file before submitting it to the generator
export function swaggerPreprocessing(builderConfig: Config, swagger: SwaggerSpec, overrideCfg: SpecificationPreprocessing | null) {
	let cfg = mergeSpecificationPreprocessingCfg(overrideCfg);

	// Extract Polymorphism Info
	let polymorphismInfo = swaggerExtractPolymorphismInfo(swagger, cfg.addPolymorphismInfo);

	// report analyze before
	if (cfg.analyzeReportBefore === true) {
		let beforeReport = swaggerAnalyzeReport(swagger, polymorphismInfo);
		console.log('Swagger - Printing Swagger Analyze Report (Before):');
		console.log(JSON.stringify(beforeReport, null, 4));
	}

	// spec preprocessing
	swaggerSpecificationPreprocessing(swagger, cfg);

	// specific preprocessing
	swaggerSpecificPreprocessing(builderConfig, swagger, cfg, polymorphismInfo);

	// remove unused
	if (cfg.removeUnused === true) {
		swaggerRemoveUnusedDefinitions(swagger, polymorphismInfo);
	}

	// report analyze after
	if (cfg.analyzeReportAfter === true) {
		let afterReport = swaggerAnalyzeReport(swagger, polymorphismInfo);
		console.log('Swagger - Printing Swagger Analyze Report (After):');
		console.log(JSON.stringify(afterReport, null, 4));
	}

	return;
}

//#endregion


//#region Swagger Specification Preprocessing (add/override/filter)

function swaggerSpecificationPreprocessing(swagger: SwaggerSpec, cfg: SpecificationPreprocessing) {

	// add
	if (cfg.add && cfg.add.tags && cfg.add.tags.length > 0) {
		let declaredTagNames: string[] = swagger.tags.map((oTag) => oTag.name);
		for (let oTag of cfg.add.tags) {
			if (!declaredTagNames.includes(oTag.name)) {
				swagger.tags.push(JSON.parse(JSON.stringify(oTag)));
			}
		}
	}

	if (cfg.add && cfg.add.securities && Object.keys(cfg.add.securities).length > 0) {
		for (let secName in cfg.add.securities) {
			if (!swagger.securityDefinitions[secName]) swagger.securityDefinitions[secName] = JSON.parse(JSON.stringify(cfg.add.securities[secName]));
		}
	}

	// override
	if (cfg.override && cfg.override.modelNames && Object.keys(cfg.override.modelNames).length > 0) {
		for (let originalModelName in cfg.override.modelNames) {
			if (swagger.definitions[originalModelName]) {
				// Model exists in Swagger
				let newModelName = cfg.override.modelNames[originalModelName];
				swagger.definitions[newModelName] = JSON.parse(JSON.stringify(swagger.definitions[originalModelName]));
				delete swagger.definitions[originalModelName];

				// Change references
				let definitionsAsString = JSON.stringify(swagger.definitions);
				let pathsAsString = JSON.stringify(swagger.paths);
				let regexConvertRef = new RegExp(String.raw`"#\/definitions\/${originalModelName}"`, "g");
				definitionsAsString = definitionsAsString.replace(regexConvertRef, `"#/definitions/${newModelName}"`);
				pathsAsString = pathsAsString.replace(regexConvertRef, `"#/definitions/${newModelName}"`);
				swagger.definitions = JSON.parse(definitionsAsString);
				swagger.paths = JSON.parse(pathsAsString);
			}
		}
	}
	if (cfg.override && cfg.override.operationIds && Object.keys(cfg.override.operationIds).length > 0) {
		for (let path in cfg.override.operationIds) {
			for (let method in cfg.override.operationIds[path]) {
				if (swagger.paths[path] && swagger.paths[path][method]) {
					swagger.paths[path][method].operationId = cfg.override.operationIds[path][method];
					swagger.paths[path][method]["x-purecloud-method-name"] = cfg.override.operationIds[path][method];
				}
			}
		}
	}
	if (cfg.override && cfg.override.modelsToPrimitiveType && Object.keys(cfg.override.modelsToPrimitiveType).length > 0) {
		for (let originalModelName in cfg.override.modelsToPrimitiveType) {
			if (swagger.definitions[originalModelName]) {
				// Model exists in Swagger
				delete swagger.definitions[originalModelName];

				// Change references
				let primitiveTypeAsString = `"type":"${cfg.override.modelsToPrimitiveType[originalModelName].type ?? ''}"`;
				if (cfg.override.modelsToPrimitiveType[originalModelName].format) {
					primitiveTypeAsString = `${primitiveTypeAsString},"format":"${cfg.override.modelsToPrimitiveType[originalModelName].format}"`;
				}
				let definitionsAsString = JSON.stringify(swagger.definitions);
				let pathsAsString = JSON.stringify(swagger.paths);
				let regexConvertRef = new RegExp(String.raw`"\$ref":"#\/definitions\/${originalModelName}"`, "g");
				definitionsAsString = definitionsAsString.replace(regexConvertRef, primitiveTypeAsString);
				pathsAsString = pathsAsString.replace(regexConvertRef, primitiveTypeAsString);
				swagger.definitions = JSON.parse(definitionsAsString);
				swagger.paths = JSON.parse(pathsAsString);
			}
		}
	}
	if (cfg.override && cfg.override.models && Object.keys(cfg.override.models).length > 0) {
		for (let modelName in cfg.override.models) {
			swagger.definitions[modelName] = JSON.parse(JSON.stringify(cfg.override.models[modelName]));
		}
	}
	if (cfg.override && cfg.override.operations && Object.keys(cfg.override.operations).length > 0) {
		for (let path in cfg.override.operations) {
			for (let method in cfg.override.operations[path]) {
				if (!swagger.paths[path]) swagger.paths[path] = {};
				swagger.paths[path][method] = JSON.parse(JSON.stringify(cfg.override.operations[path][method]));
			}
		}
	}

	// filter
	for (let path in swagger.paths) {
		for (let method in swagger.paths[path]) {
			let operation = swagger.paths[path][method];
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

					if (operation.consumes && operation.consumes.length > 0) {
						for (let consume of operation.consumes) {
							if (cfg.filter.keep.consumes.includes(consume)) {
								keepOperation = true;
								break;
							}
						}
					} else {
						// Check default consumes
						if (DEFAULT_CONSUMES.length > 0) {
							for (let consume of DEFAULT_CONSUMES) {
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
				}
				if (keepOperation === true && cfg.filter.keep.produces && cfg.filter.keep.produces.length > 0) {
					// keep rule is defined - set keepOperation to false as default
					keepOperation = false;

					if (operation.produces && operation.produces.length > 0) {
						for (let produce of operation.produces) {
							if (cfg.filter.keep.produces.includes(produce)) {
								keepOperation = true;
								break;
							}
						}
					} else {
						// Check default produces
						if (DEFAULT_PRODUCES.length > 0) {
							for (let produce of DEFAULT_PRODUCES) {
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
					if (operation.consumes && operation.consumes.length > 0) {
						for (let consume of operation.consumes) {
							if (cfg.filter.exclude.consumes.includes(consume)) {
								keepOperation = false;
								break;
							}
						}
					} else {
						// Check default consumes
						if (DEFAULT_CONSUMES.length > 0) {
							for (let consume of DEFAULT_CONSUMES) {
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
				}
				if (keepOperation === true && cfg.filter.exclude.produces && cfg.filter.exclude.produces.length > 0) {
					// exclude rule is defined - keep keepOperation to true as default
					if (operation.produces && operation.produces.length > 0) {
						for (let produce of operation.produces) {
							if (cfg.filter.exclude.produces.includes(produce)) {
								keepOperation = false;
								break;
							}
						}
					} else {
						// Check default produces
						if (DEFAULT_PRODUCES.length > 0) {
							for (let produce of DEFAULT_PRODUCES) {
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
			}

			if (keepOperation === false) {
				delete swagger.paths[path][method];
				if (Object.keys(swagger.paths[path]).length == 0) delete swagger.paths[path];
			}
		}
	}
}

//#endregion


//#region Swagger Preprocessing (specific)

// This function will pre-process the swagger file before submitting it to the generator
function swaggerSpecificPreprocessing(builderConfig: Config, swagger: SwaggerSpec, cfg: SpecificationPreprocessing, polymorphismInfo: SwaggerPolymorphismInfo) {
	let specificCfg: SwaggerPreprocessing = cfg.specific as SwaggerPreprocessing;

	if (specificCfg.processPaths === true) {
		processPaths(builderConfig, swagger);
	}

	if (specificCfg.processRefs === true) {
		processRefs(swagger);
	}

	if (specificCfg.forceCSVCollectionFormatInTags && specificCfg.forceCSVCollectionFormatInTags.length > 0) {
		forceCSVCollectionFormat(swagger, specificCfg.forceCSVCollectionFormatInTags);
	}

	if (specificCfg.updateOneOf === true) {
		updateOneOf(swagger);
	}

	if (specificCfg.processEnums === true) {
		processProperties(swagger);
	}

	if (specificCfg.discriminatorManagement === 'quarantine') {
		quarantinePolymorphism(swagger, specificCfg.keepDiscriminatorModels, polymorphismInfo);
	}

	return;
}

/* PRIVATE FUNCTIONS */

function processPaths(builderConfig: Config, swagger: SwaggerSpec) {
	const paths = Object.keys(swagger.paths);
	for (const path of paths) {
		if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && !path.startsWith("/api/v2/apps/agentic") && builderConfig.settings.swaggerCodegen.codegenLanguage === "purecloudpython")) {
			delete swagger.paths[path]
		}
	}

	if (builderConfig.settings.swaggerCodegen.codegenLanguage !== "purecloudpython") return

	const definitions = Object.keys(swagger.definitions);
	for (const definition of definitions) {
		if (definition.endsWith("_")) {
			delete swagger.definitions[definition]
		}
	}
}

export function processRefs(swagger: SwaggerSpec) {
	const keys = Object.keys(swagger.definitions);
	keys.forEach((key, index) => {
		let obj = swagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(obj);
			keys.forEach((key2, index) => {
				let obj2 = obj[key2];
				if (obj2) {
					if (obj2.hasOwnProperty("$ref") && (obj2.hasOwnProperty("readOnly") || obj2.hasOwnProperty("description"))) {
						if (obj2.readOnly === true && obj2.hasOwnProperty("description")) {
							obj2.description = `${obj2.description} readOnly`
						}

						if (obj2.$ref) {
							let refObj = { "$ref": obj2.$ref };
							obj2.allOf = [refObj];
							delete obj2.$ref;
						}
					}
				}
			});
		}
	});
}

function forceCSVCollectionFormat(swagger: SwaggerSpec, forceCSVCollectionFormatInTags: string[]) {
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
					if (operation && operation.parameters && operation.parameters.length > 0) {
						for (let opParameter of operation.parameters) {
							if (opParameter.in && opParameter.in === "query" && opParameter.type && opParameter.type === "array" && opParameter.collectionFormat && opParameter.collectionFormat === "multi") {
								opParameter.collectionFormat = CollectionFormat.Csv;
							}
						}
					}
				}
			}
		}
	}
	return;
}

function updateOneOf(swagger: SwaggerSpec) {
    for (let defKey in swagger.definitions) {
        if (swagger.definitions[defKey][GC_ONE_OF_EXTENSIONS]) {
            swagger.definitions[defKey]["oneOf"] = [];
            let oneOfElements = swagger.definitions[defKey][GC_ONE_OF_EXTENSIONS];
            if (oneOfElements && oneOfElements.length > 0) {
                for (let oneOfElement of oneOfElements) {
                    swagger.definitions[defKey]["oneOf"].push({
                        "$ref": `#/definitions/${oneOfElement}`
                    });
                }
            }
        }
    }
}

function processProperties(swagger: SwaggerSpec) {
    for (let pathName in swagger.paths) {
        for (let methodName in swagger.paths[pathName]) {
            let operation = swagger.paths[pathName][methodName];
			if (!operation) continue; // Tpescript strict check
            if (operation.parameters && operation.parameters.length > 0) {
                for (let oParam of operation.parameters) {
                    if (oParam.in !== "body") {
                        recursivePropertyUpdate(oParam, true);
                    } else {
                        if (oParam.schema) {
                            recursivePropertyUpdate(oParam.schema, false);
                        }
                    }
                }
            }
            if (operation.responses && Object.keys(operation.responses).length > 0) {
                for (let respStatus in operation.responses) {
                    if (respStatus.startsWith('2') || respStatus.startsWith('3')) {
                        if (operation.responses[respStatus].schema) {
                            recursivePropertyUpdate(operation.responses[respStatus].schema, false);
                        }
                    }
                }
            }
        }
    }

    for (let modelName in swagger.definitions) {
        recursivePropertyUpdate(swagger.definitions[modelName], false);
    }
}

function recursivePropertyUpdate(element: any, isParameter: boolean) {
    if (!element["$ref"] && !element["type"]) {
        if (element["allOf"] && element["allOf"].length > 0) {
            for (let allOfObj of element["allOf"]) {
                recursivePropertyUpdate(allOfObj, isParameter);
            }
        } else if (element["oneOf"]) {
            for (let oneOfObj of element["oneOf"]) {
                recursivePropertyUpdate(oneOfObj, isParameter);
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
            recursivePropertyUpdate(element["items"], isParameter);
        } else {
            // string, integer, number, boolean
            let knownTypes = ['string', 'integer', 'number', 'boolean'];
            if (knownTypes.includes(element["type"])) {
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



function quarantinePolymorphism(swagger: SwaggerSpec, keepDiscriminatorModels: string[], polymorphismInfo: SwaggerPolymorphismInfo) {
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
					if (operation) {
						let operationAsString = JSON.stringify(operation);
						for (let defName of modelsToQuarantine) {
							if (operationAsString.includes(`"#/definitions/${defName}"`)) {
								operationsToQuarantine.push(operation.operationId);
								break;
							}
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
	return;
}


//#endregion

