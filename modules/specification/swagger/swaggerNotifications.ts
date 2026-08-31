import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import { ItemsType, Format, SwaggerSpec } from '../../types/swaggerSpec.js';
import { SpecificationPreprocessing, SwaggerPreprocessing, PureCloud } from '../../types/config.js';
import { gcLoginClientCredentialsGrant, BuilderHttpError, AvailableTopicEntityListing, gcGetNotificationsAvailabletopics } from '../../util/http.js';
import { checkAndThrow, getEnv } from '../../util/utils.js';
import { log } from '../../log/logger.js';
import { mergeSpecificationPreprocessingCfg } from './swaggerUtils.js';
import { processRefs } from './swaggerPreprocessing.js';

const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;

//#region Notifications Preprocessing

export async function swaggerAddNotifications(gcConfig: PureCloud, swagger: SwaggerSpec, overrideCfg: SpecificationPreprocessing | null): Promise<string> {
	let cfg = mergeSpecificationPreprocessingCfg(overrideCfg);
	return new Promise<string>((resolve, reject) => {

		try {
			// Skip notifications
			if (getEnv('EXCLUDE_NOTIFICATIONS') === true || cfg.notifications.addNotifications !== true) {
				log.info('Not adding notifications to schema');
				resolve("");
			}

			// Check PureCloud settings
			checkAndThrow(gcConfig, 'clientId', 'Environment variable PURECLOUD_CLIENT_ID must be set!');
			checkAndThrow(gcConfig, 'clientSecret', 'Environment variable PURECLOUD_CLIENT_SECRET must be set!');
			checkAndThrow(gcConfig, 'environment', 'PureCloud environment was blank!');

			gcLoginClientCredentialsGrant(gcConfig.environment, gcConfig.clientId, gcConfig.clientSecret)
				.then((access_token) => {
					return gcGetNotificationsAvailabletopics(gcConfig.environment, access_token);
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

					// Process schemas and transform to swagger definitions
					let swagger_notifications: SwaggerSpec = {
						paths: {},
						definitions: {},
						securityDefinitions: {}
					} as SwaggerSpec;

					log.info(`Processing ${notifications.entities.length} notification schemas...`);
					_.forEach(notifications.entities, (entity) => {
						if (!entity.schema) {
							log.warn(`Notification ${entity.id} does not have a defined schema!`);
							return;
						}

						const schemaName = getNotificationClassName(entity.schema.id.toString());
						log.info(`Notification mapping: ${entity.id} (${schemaName})`);
						notificationMappings.notifications.push({ topic: entity.id, class: schemaName });
						swaggerExtractDefinitions(swagger_notifications, cfg, entity.schema);
						swagger_notifications.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
					});

					// Remove type: any
					swaggerProcessAnyTypes(swagger_notifications, cfg);

					// Only for Swagger and legacy sdk
					// if ((cfg.specific as SwaggerPreprocessing).processRefs === true) {
					// 	processRefs(swagger_notifications);
					// }

					// Merge Notification Topics with Swagger
					if (swagger_notifications.definitions) {
						for (let modelName in swagger_notifications.definitions) {
							if (!swagger.definitions[modelName]) swagger.definitions[modelName] = swagger_notifications.definitions[modelName];
						}
					}

					// Process Refs for all swagger and notification topics - after swagger diff
					if ((cfg.specific as SwaggerPreprocessing).processRefs === true) {
						processRefs(swagger);
					}

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

function getNotificationClassName(id: string): string {
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

function swaggerProcessAnyTypes(swagger: SwaggerSpec, cfg: SpecificationPreprocessing) {
	if (cfg.notifications.replaceTypeAny !== true) return;

	const keys = Object.keys(swagger.definitions);
	keys.forEach((key, index) => {
		let obj = swagger.definitions[key].properties;
		if (obj) {
			const keys = Object.keys(obj);
			keys.forEach((key2, index) => {
				let obj2 = obj[key2];
				if (obj2) {
					if (obj2.hasOwnProperty("type") && obj2["type"] === "any") {
						obj2.type = "string" as ItemsType;
						obj2.format = "date-time" as Format;
					}
				}
			});
		}
	});
}

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function swaggerExtractDefinitions(swagger: SwaggerSpec, cfg: SpecificationPreprocessing, entity: { [key: string]: any }) {
	try {
		_.forOwn(entity, (property, key) => {
			// Rewrite URN refs to JSON refs
			if (key == '$ref' && !property.startsWith('#')) {
				entity[key] = '#/definitions/' + getNotificationClassName(property);
			}

			// Force int64 integers
			if (cfg.notifications.forceInt64Integers == true) {
				if (key == 'type' && property == 'integer') {
					if (!entity['format']) {
						entity['format'] = 'int64';
					}
				}
			}
			// Remove enum duplicates
			if (cfg.notifications.removeEnumDuplicates == true) {
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

			// Recurse on objects
			if (typeof property !== 'object') return;
			swaggerExtractDefinitions(swagger, cfg, property);

			// Update object to ref
			if (property.id && typeof property.id === 'string') {
				let className = getNotificationClassName(property.id);

				// Store definition
				swagger.definitions[className] = JSON.parse(JSON.stringify(property));

				// Set reference
				entity[key] = {
					type: 'object',
					$ref: `#/definitions/${className}`,
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

//#endregion

