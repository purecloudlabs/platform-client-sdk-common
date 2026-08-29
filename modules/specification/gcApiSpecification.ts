import fs from 'fs';
import _ from 'lodash';
import dot from 'dot';
import pluralize from 'pluralize';
import { SwaggerDiffImpl } from './swagger/swaggerDiffImpl.js';
import { OpenApiDiffImpl } from './openapi/openApiDiffImpl.js';
import { SwaggerSpec, SwaggerInfo } from '../types/swaggerSpec.js';
import { OpenApiSpec, OpenApiInfo } from '../types/openapiSpec.js';
import { Data, Version, Changes, ApiVersionData } from '../types/builderTypes.js';
import { downloadFile } from '../util/http.js';
import { getEnv } from '../util/utils.js';
import { log } from '../log/logger.js';
import { combineSwagger, convertToSwagger } from './swagger/swaggerUtils.js';
import { swaggerPreprocessing } from './swagger/swaggerPreprocessing.js';
import { swaggerAddNotifications } from './swagger/swaggerNotifications.js';
import { openapiAddNotifications } from './openapi/openApiNotifications.js';
import { combineOpenApi } from './openapi/openApiUtils.js';
import { openapiPreprocessing } from './openapi/openApiPreprocessing.js';
import { SpecificationPreprocessing, Config, PureCloud } from '../types/config.js';

/* PRIVATE VARS */

const IMPACT_MAJOR = 'major';
const IMPACT_MINOR = 'minor';
const IMPACT_POINT = 'point';

export class GCApiSpecification {

	changes: Changes = {};
	changeCount: number = 0;
	newApiVersion: string = "";
	specificationVersion: string = "";
	specificationInfo: SwaggerInfo | OpenApiInfo = {} as SwaggerInfo;
	isSwagger: boolean = true;
	oldSpecification: SwaggerSpec | OpenApiSpec = {} as SwaggerSpec;
	newSpecification: SwaggerSpec | OpenApiSpec = {} as SwaggerSpec;
	diffImpl?: SwaggerDiffImpl | OpenApiDiffImpl;

	useSdkVersioning: boolean = false;
	
	// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
	downgradeToSwaggerV2: boolean = false;

	public getAndPreprocess(builderConfig: Config,
		oldSpecificationPath: string, newSpecificationPath: string, previewSpecificationPath: string,
		saveOldSwaggerPath: string, saveNewSwaggerPath: string,
		overrideCfg: SpecificationPreprocessing | null,
		apiVersionData: ApiVersionData) {

		log.info('Starting specification preprocessing');
		log.debug(`Parameters: oldPath=${oldSpecificationPath}, newPath=${newSpecificationPath}, previewPath=${previewSpecificationPath}`);
		let previewSpecification: SwaggerSpec | OpenApiSpec = {} as SwaggerSpec;

		// Retrieve old swagger
		if (fs.existsSync(oldSpecificationPath)) {
			log.info(`Loading old swagger from disk: ${oldSpecificationPath}`);
			this.oldSpecification = JSON.parse(fs.readFileSync(oldSpecificationPath, 'utf8'));
		} else if (oldSpecificationPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading old swagger from: ${oldSpecificationPath}`);
			this.oldSpecification = JSON.parse(downloadFile(oldSpecificationPath) ?? '');
		} else {
			log.warn(`Invalid oldSpecificationPath: ${oldSpecificationPath}`);
			throw new Error(`Invalid old swagger path: ${oldSpecificationPath}`);
		}

		log.debug(`Old swagger loaded successfully, length: ${(JSON.stringify(this.oldSpecification) || []).length}`);
		log.debug(`Old swagger info: ${this.oldSpecification?.info?.title || 'Unknown'} v${this.oldSpecification?.info?.version || 'Unknown'}`);

		// Detect OpenApi Version
		if (this.oldSpecification && this.oldSpecification.hasOwnProperty('openapi')) {
			let openapiSpec: OpenApiSpec = this.oldSpecification as OpenApiSpec;
			if (openapiSpec.openapi.startsWith('3.1')) {
				this.isSwagger = false;
				log.debug(`Considering OpenApi Specification version as: ${openapiSpec.openapi}`);
				this.diffImpl = new OpenApiDiffImpl();
			}
		}
		if (this.isSwagger === true) {
			log.debug(`Considering OpenApi Specification version as: 2.0 (Swagger)`);
			this.diffImpl = new SwaggerDiffImpl();
		}

		// Retrieve new swagger
		if (fs.existsSync(newSpecificationPath)) {
			log.info(`Loading new swagger from disk: ${newSpecificationPath}`);
			if (this.downgradeToSwaggerV2 == false || this.isSwagger === false) {
				this.newSpecification = JSON.parse(fs.readFileSync(newSpecificationPath, 'utf8'));
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecificationRaw: any = JSON.parse(fs.readFileSync(newSpecificationPath, 'utf8'));
				if (newSpecificationRaw && newSpecificationRaw.openapi && newSpecificationRaw.openapi.startsWith("3")) {
					this.newSpecification = convertToSwagger(newSpecificationRaw);
				} else {
					this.newSpecification = newSpecificationRaw;
				}
			}
		} else if (newSpecificationPath.toLowerCase().startsWith('http')) {
			log.info(`Downloading new swagger from: ${newSpecificationPath}`);
			if (this.downgradeToSwaggerV2 == false || this.isSwagger === false) {
				this.newSpecification = JSON.parse(downloadFile(newSpecificationPath) ?? '');
			} else {
				// Special treatment for Web Messaging specification (downgrade from OpenAPI v3 to Swagger v2)
				// Verify specification version and downgrade only if openapi=="3..." (starts with 3)
				let newSpecificationRaw: any = JSON.parse(downloadFile(newSpecificationPath) ?? '');
				if (newSpecificationRaw && newSpecificationRaw.openapi && newSpecificationRaw.openapi.startsWith("3")) {
					this.newSpecification = convertToSwagger(newSpecificationRaw);
				} else {
					this.newSpecification = newSpecificationRaw;
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
				previewSpecification = JSON.parse(downloadFile(previewSpecificationPath) ?? '');
			} else {
				log.warn(`Invalid previewSpecificationPath: ${previewSpecificationPath}`);
			}

			log.info('Combining preview swagger with new swagger');
			// Add the preview swagger and the public swagger together to create the full new swagger
			if (this.isSwagger === true) {
				this.newSpecification = combineSwagger(this.newSpecification as SwaggerSpec, previewSpecification as SwaggerSpec);
			} else {
				this.newSpecification = combineOpenApi(this.newSpecification as OpenApiSpec, previewSpecification as OpenApiSpec);
			}
			log.debug('Preview swagger combined successfully');
		} else {
			log.debug('No preview swagger path provided, skipping preview swagger processing');
		}

		log.debug(`New swagger loaded successfully, length: ${JSON.stringify(this.newSpecification).length}`);
		log.debug(`New swagger info: ${this.newSpecification?.info?.title || 'Unknown'} v${this.newSpecification?.info?.version || 'Unknown'}`);

		// Store Api Version
		this.newSpecification.info.apiVersion = apiVersionData.BuildVersion;
		// Specification Preprocessing
		if (this.isSwagger === true) {
			log.debug('Preprocessing Swagger');
			swaggerPreprocessing(builderConfig, this.newSpecification as SwaggerSpec, overrideCfg);
		} else {
			log.debug('Preprocessing OpenApi');
			openapiPreprocessing(builderConfig, this.newSpecification as OpenApiSpec, overrideCfg);
		}

		// Save files to disk
		if (saveOldSwaggerPath) {
			log.info(`Writing old swagger to ${saveOldSwaggerPath}`);
			try {
				fs.writeFileSync(saveOldSwaggerPath, JSON.stringify(this.oldSpecification));
				log.debug('Old swagger file saved successfully');
			} catch (err) {
				log.warn(`Failed to save old swagger: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
		if (saveNewSwaggerPath) {
			log.info(`Writing new swagger to ${saveNewSwaggerPath}`);
			try {
				fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(this.newSpecification));
				log.debug('New swagger file saved successfully');
			} catch (err) {
				log.warn(`Failed to save new swagger: ${err instanceof Error ? err.message : String(err)}`);
			}
		}

		log.info(`Swagger preprocessing completed.`);
	};

	public diff(apiVersionData: ApiVersionData) {
		// Diff swaggers
		log.info('Starting specification diff comparison');

		log.debug('Copying properties to implementation');
		this.copyPropertiesToImpl();

		if (this.isSwagger === true) {
			// Diff
			log.debug('Executing specification diff implementation');
			let diffImpl = this.diffImpl as SwaggerDiffImpl;
			let retval = diffImpl.diff(this.oldSpecification as SwaggerSpec, this.newSpecification as SwaggerSpec, apiVersionData);

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = diffImpl.changeCount;
			this.changes = diffImpl.changes;
			this.specificationInfo = diffImpl.swaggerInfo;
			this.specificationVersion = diffImpl.swaggerVersion;
			this.newApiVersion = diffImpl.newApiVersion;

			log.info(`Diff completed: ${this.changeCount} changes found`);
			return retval;
		} else {
			// Diff
			log.debug('Executing specification diff implementation');
			let diffImpl = this.diffImpl as OpenApiDiffImpl;
			let retval = diffImpl.diff(this.oldSpecification as OpenApiSpec, this.newSpecification as OpenApiSpec, apiVersionData);

			// Set vars from diff impl
			log.debug('Retrieving results from diff implementation');
			this.changeCount = diffImpl.changeCount;
			this.changes = diffImpl.changes;
			this.specificationInfo = diffImpl.openapiInfo;
			this.specificationVersion = diffImpl.openapiVersion;
			this.newApiVersion = diffImpl.newApiVersion;

			log.info(`Diff completed: ${this.changeCount} changes found`);
			return retval;
		}
	};

	public async addNotificationTopics(gcConfig: PureCloud,
		overrideCfg: SpecificationPreprocessing | null) {

		if (this.isSwagger === true) {
			log.debug('Notifications Preprocessing Swagger');
			await swaggerAddNotifications(gcConfig, this.newSpecification as SwaggerSpec, overrideCfg ?? null);
		} else {
			log.debug('Notifications Preprocessing OpenApi');
			await openapiAddNotifications(gcConfig, this.newSpecification as OpenApiSpec, overrideCfg ?? null);
		}
	}

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
		var changesObject: {
			major: Record<string, any>;
			minor: Record<string, any>;
			point: Record<string, any>;
		} = {
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
		var changesData: {
			majorCount: number;
			minorCount: number;
			pointCount: number;
			major: Record<string, any>;
			point: Record<string, any>;
			minor: Record<string, any>;
		} = {
			majorCount: 0,
			minorCount: 0,
			pointCount: 0,
			major: {},
			point: {},
			minor: {},
		};

		_.forOwn(changesObject, function (impactGroup, key) {
			_.forOwn(impactGroup, function (changeGroup: any) {
				let keyname: 'majorCount' | 'minorCount' | 'pointCount';
				keyname = `${key}Count` as 'majorCount' | 'minorCount' | 'pointCount';
				changesData[keyname] += changeGroup.changes.length;
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
		var compiledTemplate = dot.template(template, undefined, defs);

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
			let diffImpl = this.diffImpl as SwaggerDiffImpl;
			// Set properties on impl object just to be safe
			diffImpl.changes = this.changes;
			diffImpl.changeCount = this.changeCount;
			diffImpl.swaggerInfo = this.specificationInfo;
			diffImpl.swaggerVersion = this.specificationVersion;
			diffImpl.newApiVersion = this.newApiVersion;
			diffImpl.useSdkVersioning = this.useSdkVersioning;
			diffImpl.oldSwagger = this.oldSpecification as SwaggerSpec;
			diffImpl.newSwagger = this.newSpecification as SwaggerSpec;
		} else {
			let diffImpl = this.diffImpl as OpenApiDiffImpl;
			// Set properties on impl object just to be safe
			diffImpl.changes = this.changes;
			diffImpl.changeCount = this.changeCount;
			diffImpl.openapiInfo = this.specificationInfo;
			diffImpl.openapiVersion = this.specificationVersion;
			diffImpl.newApiVersion = this.newApiVersion;
			diffImpl.useSdkVersioning = this.useSdkVersioning;
			diffImpl.oldOpenApi = this.oldSpecification as OpenApiSpec;
			diffImpl.newOpenApi = this.newSpecification as OpenApiSpec;
		}
	}

}
