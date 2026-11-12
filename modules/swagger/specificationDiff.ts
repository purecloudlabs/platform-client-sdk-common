import fs from 'node:fs';
import { SwaggerDiffImpl } from './swaggerDiffImpl.js';
import { OpenApiDiffImpl } from './openapiDiffImpl.js';
import { Swagger, ProduceElement, ItemsType } from '../types/swagger.js';
import { Data, Version, Changes } from '../types/builderTypes.js';
import { log } from '../log/logger.js';
import { downloadFile } from '../util/http.js';
import { swaggerPreprocessing, combineSwagger } from '../swagger/swaggerProcessing.js';
import { openapiPreprocessing, combineOpenApi } from '../swagger/openapiProcessing.js';
import { Config, PureCloud } from '../types/config.js';

export class SpecificationDiff {

	changes: Changes;
	changeCount: number = 0;
	swaggerDiffImpl: SwaggerDiffImpl;
	openapiDiffImpl: OpenApiDiffImpl;

	useSdkVersioning: boolean = false;
	// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
	downgradeToSwaggerV2: boolean = false;

	public getAndDiff(oldSpecPath: string, newSpecPath: string, previewSpecPath: string,
		saveOldSpecPath: string, saveNewSpecPath: string) {
		log.info('Starting spec diff process');
		log.debug(`Parameters: oldPath=${oldSpecPath}, newPath=${newSpecPath}, previewPath=${previewSpecPath}`);

		let oldSpec: any, newSpec: any, previewSpec: any;

		// Retrieve old spec
		if (fs.existsSync(oldSpecPath)) {
			log.info(`Loading old spec from disk: ${oldSpecPath}`);
			oldSpec = JSON.parse(fs.readFileSync(oldSpecPath, 'utf8'));
		} else if (oldSpecPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading old spec from: ${oldSpecPath}`);
			oldSpec = JSON.parse(downloadFile(oldSpecPath));
		} else {
			log.warn(`Invalid oldSpecPath: ${oldSpecPath}`);
			throw new Error(`Invalid old spec path: ${oldSpecPath}`);
		}

		log.debug(`Old spec loaded successfully, length: ${(JSON.stringify(oldSpec) || []).length}`);
		log.debug(`Old spec info: ${oldSpec?.info?.title || 'Unknown'} v${oldSpec?.info?.version || 'Unknown'}`);

		// Retrieve new spec
		if (fs.existsSync(newSpecPath)) {
			log.info(`Loading new spec from disk: ${newSpecPath}`);
			if (this.downgradeToSwaggerV2 == false) {
				newSpec = JSON.parse(fs.readFileSync(newSpecPath, 'utf8'));
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecRaw: any = JSON.parse(fs.readFileSync(newSpecPath, 'utf8'));
				if (newSpecRaw && newSpec.openapi && newSpec.openapi.startsWith("3")) {
					newSpec = this.convertToV2(newSpecRaw);
				} else {
					newSpec = newSpecRaw;
				}
			}
		} else if (newSpecPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading new spec from: ${newSpecPath}`);
			if (this.downgradeToSwaggerV2 == false) {
				newSpec = JSON.parse(downloadFile(newSpecPath));
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecRaw: any = JSON.parse(downloadFile(newSpecPath));
				if (newSpecRaw && newSpecRaw.openapi && newSpecRaw.openapi.startsWith("3")) {
					newSpec = this.convertToV2(newSpecRaw);
				} else {
					newSpec = newSpecRaw;
				}
			}
		} else {
			log.warn(`Invalid newSpecPath: ${newSpecPath}`);
			throw new Error(`Invalid new spec path: ${newSpecPath}`);
		}

		// Check to see if preview spec path is present. Internal builds do not need the preview spec
		if (previewSpecPath) {
			// Retrieve preview spec
			if (fs.existsSync(previewSpecPath)) {
				log.info(`Loading preview swagger from disk: ${previewSpecPath}`);
				previewSpec = JSON.parse(fs.readFileSync(previewSpecPath, 'utf8'));
			} else if (previewSpecPath.toLowerCase().startsWith('http')) {
				log.info(`Downloading preview spec from: ${previewSpecPath}`);
				previewSpec = JSON.parse(downloadFile(previewSpecPath));
			} else {
				log.warn(`Invalid previewSpecPath: ${previewSpecPath}`);
			}
		} else {
			log.debug('No preview spec path provided, skipping preview spec processing');
		}

		log.debug(`New spec loaded successfully, length: ${JSON.stringify(newSpec).length}`);
		log.debug(`New spec info: ${newSpec?.info?.title || 'Unknown'} v${newSpec?.info?.version || 'Unknown'}`);

		// Save files to disk
		if (saveOldSpecPath) {
			log.info(`Writing old spec to ${saveOldSpecPath}`);
			try {
				fs.writeFileSync(saveOldSpecPath, JSON.stringify(oldSpec));
				log.debug('Old spec file saved successfully');
			} catch (error) {
				log.warn(`Failed to save old spec: ${error.message}`);
			}
		}
		if (saveNewSpecPath) {
			log.info(`Writing new spec to ${saveNewSpecPath}`);
			try {
				fs.writeFileSync(saveNewSpecPath, JSON.stringify(newSpec));
				log.debug('New spec file saved successfully');
			} catch (error) {
				log.warn(`Failed to save new spec: ${error.message}`);
			}
		}

		if (newSpec) {
			if (newSpec && newSpec.swagger && newSpec.swagger.startsWith("2")) {
				this.swaggerDiffImpl = new SwaggerDiffImpl();
				if (previewSpec) {
					log.info('Combining preview swagger with new swagger');
					// Add the preview spec and the public spec together to create the full new spec
					newSpec = combineSwagger(newSpec, previewSpec);
					log.debug('Preview swagger combined successfully');
				}
				this.swaggerDiffImpl.swaggerInfo = newSpec.info ?? {};
				this.swaggerDiffImpl.useSdkVersioning = this.useSdkVersioning;
				this.swaggerDiffImpl.oldSwagger = oldSpec;
				this.swaggerDiffImpl.newSwagger = newSpec;
			} else if (newSpec && newSpec.openapi && newSpec.openapi.startsWith("3.1")) {
				this.openapiDiffImpl = new OpenApiDiffImpl();
				if (previewSpec) {
					log.info('Combining preview openapi specification with new openapi specification');
					// Add the preview spec and the public spec together to create the full new spec
					newSpec = combineOpenApi(newSpec, previewSpec);
					log.debug('Preview openapi specification combined successfully');
				}
				this.openapiDiffImpl.openapiInfo = newSpec.info ?? {};
				this.openapiDiffImpl.useSdkVersioning = this.useSdkVersioning;
				this.openapiDiffImpl.oldOpenApiSpec = oldSpec;
				this.openapiDiffImpl.newOpenApiSpec = newSpec;
			} else {
				log.warn(`Unknown spec version: ${JSON.stringify(newSpec)}`);
				throw new Error(`Unknown spec version: ${JSON.stringify(newSpec)}`);	
			}
		}

		// Diff swaggers/openapi specs
		log.info('Starting spec diff comparison');
		this.diff();
		log.info(`Swagger diff completed with ${this.changeCount} total changes`);
	};

	private diff() {
		// Diff
		if (this.swaggerDiffImpl) {
			log.debug('Executing swagger diff implementation');
			this.swaggerDiffImpl.diff();

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = this.swaggerDiffImpl.changeCount;
			this.changes = this.swaggerDiffImpl.changes;
		} else if (this.openapiDiffImpl) {
			log.debug('Executing openapi specification diff implementation');
			this.openapiDiffImpl.diff();

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = this.openapiDiffImpl.changeCount;
			this.changes = this.openapiDiffImpl.changes;
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}

		log.info(`Diff completed: ${this.changeCount} changes found`);
		return;
	};

	public generateReleaseNotes(template: string, data: Data) {
		log.info('Generating release notes');
		log.debug(`Template source: ${fs.existsSync(template) ? 'file' : 'string'}`);

		let templateString = template;
		if (fs.existsSync(template) === true) {
			log.debug(`Loading template from file: ${template}`);
			templateString = fs.readFileSync(template, 'utf8');
			log.debug(`Template loaded, length: ${templateString.length}`);
		} else {
			log.debug('Using template string directly');
		}

		log.debug('Calling implementation to generate release notes');
		let result: string = "";
		if (this.swaggerDiffImpl) {
			result = this.swaggerDiffImpl.generateReleaseNotes(templateString, data);
		} else if (this.openapiDiffImpl) {
			result = this.openapiDiffImpl.generateReleaseNotes(templateString, data);
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}
		log.info('Release notes generated successfully');
		return result;
	};

	public incrementVersion(version: Version) {
		log.info(`Starting version increment from ${version.major}.${version.minor}.${version.point}`);
		var forceMajor: boolean = getEnv('INCREMENT_MAJOR', false, true);
		var forceMinor: boolean = getEnv('INCREMENT_MINOR', false, true);
		var forcePoint: boolean = getEnv('INCREMENT_POINT', false, true);
		log.debug(`Force flags - Major: ${forceMajor}, Minor: ${forceMinor}, Point: ${forcePoint}`);
		if (forceMajor === true) log.info('Forcing major release!');
		if (forceMinor === true) log.info('Forcing minor release!');
		if (forcePoint === true) log.info('Forcing point release!');

		let result: Version;
		if (this.swaggerDiffImpl) {
			result = this.swaggerDiffImpl.incrementVersion(version, forceMajor, forceMinor, forcePoint);
		} else if (this.openapiDiffImpl) {
			result = this.openapiDiffImpl.incrementVersion(version, forceMajor, forceMinor, forcePoint);
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}
		log.info(`Version incremented to ${result.major}.${result.minor}.${result.point}`);
		return result;
	};

	public writeSpecification(filename: string) {
		if (this.swaggerDiffImpl) {
			fs.writeFileSync(filename, JSON.stringify(this.swaggerDiffImpl.newSwagger));
		} else if (this.openapiDiffImpl) {
			fs.writeFileSync(filename, JSON.stringify(this.openapiDiffImpl.newOpenApiSpec));
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}
		log.debug('Swagger file written successfully');
	}

	public preprocessing(pureCloud: PureCloud, config: Config): Promise<string> {
		log.debug('Swagger Preprocessing');
		if (this.swaggerDiffImpl) {
			return swaggerPreprocessing(this.swaggerDiffImpl.newSwagger, pureCloud, config);
		} else if (this.openapiDiffImpl) {
			return openapiPreprocessing(this.openapiDiffImpl.newOpenApiSpec, pureCloud, config);
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}
	}

	public stringifyVersion(version, includePrerelease) {
		log.debug(`Stringifying version: ${version.major}.${version.minor}.${version.point}, includePrerelease: ${includePrerelease}`);
		let result: string = "";
		if (this.swaggerDiffImpl) {
			result = this.swaggerDiffImpl.stringifyVersion(version, includePrerelease);
		} else if (this.openapiDiffImpl) {
			result = this.openapiDiffImpl.stringifyVersion(version, includePrerelease);
		} else {
			throw new Error("Error - no swaggerDiffImpl or openapiDiffImpl defined");
		}
		log.debug(`Version string result: ${result}`);
		return result;
	};

	private convertToV2(swaggerV3 : any) {
		log.info('Converting OpenAPI v3 to Swagger v2');
		log.debug(`Input swagger version: ${swaggerV3?.openapi || 'unknown'}`);
		let swaggerV2: Swagger = {
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
								// This is to facilitate swagger diff comparison
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

}

function getEnv(varname, defaultValue, isDefaultValue) {
	varname = varname.trim();
	var envVar = process.env[varname];
	log.silly(`ENV: ${varname}->${envVar}`);
	if (!envVar && defaultValue) {
		envVar = defaultValue;
		if (isDefaultValue === true) log.info(`Using default value for ${varname}: ${envVar}`);
		else log.warn(`Using override for ${varname}: ${envVar}`);
	}
	if (envVar) {
		if (envVar.toLowerCase() === 'true') return true;
		else if (envVar.toLowerCase() === 'true') return false;
		else return envVar;
	}

	return defaultValue;
}

