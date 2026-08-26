import fs from 'fs';
import _ from 'lodash';
import dot from 'dot';
import pluralize from 'pluralize';
import swaggerDiffImpl from './swaggerDiffImpl.js';
import openapiDiffImpl from './openapiDiffImpl.js';
import { Swagger, Info, Changes, ProduceElement, ItemsType, OpenApiSpec } from '../types/swagger.js';
import { Data, Version } from '../types/builderTypes.js';
import { downloadFile } from '../util/http.js';
import { getEnv } from '../util/utils.js';
import { log } from '../log/logger.js';
import { combineSwagger } from '../swagger/swaggerUtils.js';
import { combineOpenApi } from '../swagger/openapiUtils.js';

/* PRIVATE VARS */

const IMPACT_MAJOR = 'major';
const IMPACT_MINOR = 'minor';
const IMPACT_POINT = 'point';

export default class SpecificationDiff {

	changes: Changes;
	changeCount: number = 0;
	specificationInfo: Info;
	isSwagger: boolean = true;
	oldSpecification: Swagger | OpenApiSpec;
	newSpecification: Swagger | OpenApiSpec;

	useSdkVersioning: boolean = false;
	// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
	downgradeToSwaggerV2: boolean = false;

	public getAndDiff(oldSpecificationPath: string, newSpecificationPath: string, previewSpecificationPath: string,
		saveOldSwaggerPath: string, saveNewSwaggerPath: string) {
		log.info('Starting specification diff process');
		log.debug(`Parameters: oldPath=${oldSpecificationPath}, newPath=${newSpecificationPath}, previewPath=${previewSpecificationPath}`);
		let oldSpecification: Swagger | OpenApiSpec, newSpecification: Swagger | OpenApiSpec, previewSpecification: Swagger | OpenApiSpec;

		// Retrieve old swagger
		if (fs.existsSync(oldSpecificationPath)) {
			log.info(`Loading old swagger from disk: ${oldSpecificationPath}`);
			oldSpecification = JSON.parse(fs.readFileSync(oldSpecificationPath, 'utf8'));
		} else if (oldSpecificationPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading old swagger from: ${oldSpecificationPath}`);
			oldSpecification = JSON.parse(downloadFile(oldSpecificationPath));
		} else {
			log.warn(`Invalid oldSpecificationPath: ${oldSpecificationPath}`);
			throw new Error(`Invalid old swagger path: ${oldSpecificationPath}`);
		}

		log.debug(`Old swagger loaded successfully, length: ${(JSON.stringify(oldSpecification) || []).length}`);
		log.debug(`Old swagger info: ${oldSpecification?.info?.title || 'Unknown'} v${oldSpecification?.info?.version || 'Unknown'}`);

		// Detect OpenApi Version
		if (oldSpecification && oldSpecification.hasOwnProperty('openapi')) {
			let openapiSpec: OpenApiSpec = oldSpecification as OpenApiSpec;
			if (openapiSpec.openapi.startsWith('3.1')) {
				this.isSwagger = false;
				log.debug(`Considering OpenApi Specification version as: ${openapiSpec.openapi}`);
			}
		}
		if (this.isSwagger === true) {
			log.debug(`Considering OpenApi Specification version as: 2.0 (Swagger)`);
		}

		// Retrieve new swagger
		if (fs.existsSync(newSpecificationPath)) {
			log.info(`Loading new swagger from disk: ${newSpecificationPath}`);
			if (this.downgradeToSwaggerV2 == false || this.isSwagger === false) {
				newSpecification = JSON.parse(fs.readFileSync(newSpecificationPath, 'utf8'));
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecificationRaw: any = JSON.parse(fs.readFileSync(newSpecificationPath, 'utf8'));
				if (newSpecificationRaw && newSpecificationRaw.openapi && newSpecificationRaw.openapi.startsWith("3")) {
					newSpecification = this.convertToV2(newSpecificationRaw);
				} else {
					newSpecification = newSpecificationRaw;
				}
			}
		} else if (newSpecificationPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading new swagger from: ${newSpecificationPath}`);
			if (this.downgradeToSwaggerV2 == false || this.isSwagger === false) {
				newSpecification = JSON.parse(downloadFile(newSpecificationPath));
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecificationRaw: any = JSON.parse(downloadFile(newSpecificationPath));
				if (newSpecificationRaw && newSpecificationRaw.openapi && newSpecificationRaw.openapi.startsWith("3")) {
					newSpecification = this.convertToV2(newSpecificationRaw);
				} else {
					newSpecification = newSpecificationRaw;
				}
			}
		} else {
			log.warn(`Invalid newSpecificationPath: ${newSpecificationPath}`);
			throw new Error(`Invalid new swagger path: ${newSpecificationPath}`);
		}

		// Check to see if preview swagger path is present. Internal builds do not need the preview swagger
		if (previewSpecificationPath) {
			// Retrieve preview swagger
			if (fs.existsSync(previewSpecificationPath)) {
				log.info(`Loading preview swagger from disk: ${previewSpecificationPath}`);
				previewSpecification = JSON.parse(fs.readFileSync(previewSpecificationPath, 'utf8'));
			} else if (previewSpecificationPath.toLowerCase().startsWith('http')) {
				log.info(`Downloading preview swagger from: ${previewSpecificationPath}`);
				previewSpecification = JSON.parse(downloadFile(previewSpecificationPath));
			} else {
				log.warn(`Invalid previewSpecificationPath: ${previewSpecificationPath}`);
			}

			log.info('Combining preview swagger with new swagger');
			// Add the preview swagger and the public swagger together to create the full new swagger
			if (this.isSwagger === true) {
				newSpecification = combineSwagger(newSpecification as Swagger, previewSpecification as Swagger);
			} else {
				newSpecification = combineOpenApi(newSpecification as OpenApiSpec, previewSpecification as OpenApiSpec);
			}
			log.debug('Preview swagger combined successfully');
		} else {
			log.debug('No preview swagger path provided, skipping preview swagger processing');
		}

		log.debug(`New swagger loaded successfully, length: ${JSON.stringify(newSpecification).length}`);
		log.debug(`New swagger info: ${newSpecification?.info?.title || 'Unknown'} v${newSpecification?.info?.version || 'Unknown'}`);

		// Save files to disk
		if (saveOldSwaggerPath) {
			log.info(`Writing old swagger to ${saveOldSwaggerPath}`);
			try {
				fs.writeFileSync(saveOldSwaggerPath, JSON.stringify(oldSpecification));
				log.debug('Old swagger file saved successfully');
			} catch (error) {
				log.warn(`Failed to save old swagger: ${error.message}`);
			}
		}
		if (saveNewSwaggerPath) {
			log.info(`Writing new swagger to ${saveNewSwaggerPath}`);
			try {
				fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSpecification));
				log.debug('New swagger file saved successfully');
			} catch (error) {
				log.warn(`Failed to save new swagger: ${error.message}`);
			}
		}

		// Diff swaggers
		log.info('Starting specification diff comparison');
		this.diff(oldSpecification, newSpecification);
		log.info(`Swagger diff completed with ${this.changeCount} total changes`);
	};

	public diff(oldSpecification: Swagger | OpenApiSpec, newSpecification: Swagger | OpenApiSpec) {
		log.debug('Copying properties to implementation');
		this.copyPropertiesToImpl();

		if (this.isSwagger === true) {
			// Diff
			log.debug('Executing specification diff implementation');
			let retval = swaggerDiffImpl.diff(oldSpecification as Swagger, newSpecification as Swagger);

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = swaggerDiffImpl.changeCount;
			this.changes = swaggerDiffImpl.changes;
			this.oldSpecification = swaggerDiffImpl.oldSwagger;
			this.newSpecification = swaggerDiffImpl.newSwagger;
			this.specificationInfo = swaggerDiffImpl.swaggerInfo;

			log.info(`Diff completed: ${this.changeCount} changes found`);
			return retval;
		} else {
			// Diff
			log.debug('Executing specification diff implementation');
			let retval = openapiDiffImpl.diff(oldSpecification as OpenApiSpec, newSpecification as OpenApiSpec);

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = openapiDiffImpl.changeCount;
			this.changes = openapiDiffImpl.changes;
			this.oldSpecification = openapiDiffImpl.oldOpenApi;
			this.newSpecification = openapiDiffImpl.newOpenApi;
			this.specificationInfo = openapiDiffImpl.openapiInfo;

			log.info(`Diff completed: ${this.changeCount} changes found`);
			return retval;
		}
	};

	public generateReleaseNotes(template: string, data: Data) {
		log.info('Generating release notes');
		log.debug(`Template source: ${fs.existsSync(template) ? 'file' : 'string'}`);
		this.copyPropertiesToImpl();

		let templateString = template;
		if (fs.existsSync(template) === true) {
			log.debug(`Loading template from file: ${template}`);
			templateString = fs.readFileSync(template, 'utf8');
			log.debug(`Template loaded, length: ${templateString.length}`);
		} else {
			log.debug('Using template string directly');
		}

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
			specificationInfo: this.specificationInfo,
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

	public incrementVersion(version: Version) {
		log.info(`Starting version increment from ${version.major}.${version.minor}.${version.point}`);
		var forceMajor: boolean = getEnv('INCREMENT_MAJOR', 'false', true) as boolean;
		var forceMinor: boolean = getEnv('INCREMENT_MINOR', 'false', true) as boolean;
		var forcePoint: boolean = getEnv('INCREMENT_POINT', 'false', true) as boolean;
		log.debug(`Force flags - Major: ${forceMajor}, Minor: ${forceMinor}, Point: ${forcePoint}`);
		if (forceMajor === true) log.info('Forcing major release!');
		if (forceMinor === true) log.info('Forcing minor release!');
		if (forcePoint === true) log.info('Forcing point release!');

		this.copyPropertiesToImpl();

		let result: Version;

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

		result = version;
		log.info(`Version incremented to ${result.major}.${result.minor}.${result.point}`);
		return result;
	};

	public stringifyVersion(version: Version, includePrerelease?: boolean) {
		log.debug(`Stringifying version: ${version.major}.${version.minor}.${version.point}, includePrerelease: ${includePrerelease}`);
		this.copyPropertiesToImpl();

		let result: string = `${version.major}.${version.minor}.${version.point}` +
			(includePrerelease === true && version.prerelease && version.prerelease.length > 0 ? `-${version.prerelease}` : '');
		log.debug(`Version string result: ${result}`);
		return result;
	};

	private copyPropertiesToImpl() {
		if (this.isSwagger === true) {
			// Set properties on impl object just to be safe
			swaggerDiffImpl.changes = this.changes;
			swaggerDiffImpl.changeCount = this.changeCount;
			swaggerDiffImpl.swaggerInfo = this.specificationInfo;
			swaggerDiffImpl.useSdkVersioning = this.useSdkVersioning;
			swaggerDiffImpl.oldSwagger = this.oldSpecification as Swagger;
			swaggerDiffImpl.newSwagger = this.newSpecification as Swagger;
		} else {
			// Set properties on impl object just to be safe
			openapiDiffImpl.changes = this.changes;
			openapiDiffImpl.changeCount = this.changeCount;
			openapiDiffImpl.openapiInfo = this.specificationInfo;
			openapiDiffImpl.useSdkVersioning = this.useSdkVersioning;
			openapiDiffImpl.oldOpenApi = this.oldSpecification as OpenApiSpec;
			openapiDiffImpl.newOpenApi = this.newSpecification as OpenApiSpec;
		}
	}

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
						const keys = Object.keys(swaggerV2.definitions[key].properties);
						keys.forEach((key2, index) => {
							let obj2 = swaggerV2.definitions[key].properties[key2];
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

}
