

import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import platformClient from 'purecloud-platform-client-v2';
import { Models } from 'purecloud-platform-client-v2';
import { log } from '../log/logger.js';
import { Config, PureCloud } from '../types/config'
import { SwaggerDiff } from '../swagger/swaggerDiff';
import { ItemsType, Format } from '../types/swagger'

const NOTIFICATION_ID_REGEX = /^urn:jsonschema:(.+):v2:(.+)$/i;

export async function addNotifications(swaggerDiff: SwaggerDiff, pureCloud: PureCloud, excludeNotifications: boolean, sdkRepoPath: string, forceInt64Integers: boolean, removeEnumDuplicates: boolean): Promise<void> {
    try {
        // Skip notifications
        if (excludeNotifications === true) {
            log.info('Not adding notifications to schema');
            return;
        }

        // Check PureCloud settings
        if (!pureCloud['clientId'] || pureCloud['clientId'] === '') {
            throw new Error('Environment variable PURECLOUD_CLIENT_ID must be set!');
        }
        if (!pureCloud['clientSecret'] || pureCloud['clientSecret'] === '') {
            throw new Error('Environment variable PURECLOUD_CLIENT_SECRET must be set!');
        }
        if (!pureCloud['environment'] || pureCloud['environment'] === '') {
            throw new Error('PureCloud environment was blank!');
        }

        const client = platformClient.ApiClient.instance;
        client.setEnvironment(pureCloud.environment);
        let notificationsApi = new platformClient.NotificationsApi();

        await client.loginClientCredentialsGrant(pureCloud.clientId, pureCloud.clientSecret);
        let notifications: Models.AvailableTopicEntityListing = await notificationsApi.getNotificationsAvailabletopics({ 'expand': ['schema'] });

        type Notification = {
            topic: string; // Replace 'string' with the appropriate type for the 'topic' property
            class: string;
        }

        type NotificationMappings = {
            notifications: Notification[];
        };

        const notificationMappings: NotificationMappings = { notifications: [] };

        if (notifications.entities) {
            // Process schemas
            log.info(`Processing ${notifications.entities.length} notification schemas...`);
            _.forEach(notifications.entities, (entity) => {
                if (!entity.id || !entity.schema) {
                    log.warn(`Notification ${entity.id} does not have a defined schema!`);
                    return;
                }

                const schemaName = getNotificationClassName(entity.schema.id.toString());
                log.info(`Notification mapping: ${entity.id} (${schemaName})`);
                notificationMappings.notifications.push({ topic: entity.id, class: schemaName });
                extractDefinitons(swaggerDiff, forceInt64Integers, removeEnumDuplicates, entity.schema);
                if (!swaggerDiff.newSwagger) {
                    throw new Error('New Swagger is undefined');
                }
                swaggerDiff.newSwagger.definitions[schemaName] = JSON.parse(JSON.stringify(entity.schema));
            });

            // Write mappings to file
            let mappingFilePath = path.resolve(path.join(sdkRepoPath, 'notificationMappings.json'));
            log.info(`Writing Notification mappings to ${mappingFilePath}`);
            fs.writeFileSync(mappingFilePath, JSON.stringify(notificationMappings, null, 2));
        }

        return;
    } catch (err: unknown) {
        log.error(`addNotifications caught exception: ${err}`);
        throw err;
    }
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

// Receives AvailableTopic.schema of Type "schema"?: { [key: string]: object; };
function extractDefinitons(swaggerDiff: SwaggerDiff, forceInt64Integers: boolean, removeEnumDuplicates: boolean, entity: { [key: string]: any }): void {
    try {
        _.forOwn(entity, (property, key) => {
            // Rewrite URN refs to JSON refs
            if (key == '$ref' && !property.startsWith('#')) {
                entity[key] = '#/definitions/' + getNotificationClassName(property);
            }

            // Force int64 integers
            if (forceInt64Integers == true) {
                if (key == 'type' && property == 'integer') {
                    if (!entity['format']) {
                        entity['format'] = 'int64';
                    }
                }
            }
            // Remove enum duplicates
            if (removeEnumDuplicates == true) {
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
            extractDefinitons(swaggerDiff, forceInt64Integers, removeEnumDuplicates, property);

            // Update object to ref
            if (property.id && typeof property.id === 'string') {
                let className = getNotificationClassName(property.id);

                // Store definition
                swaggerDiff.newSwagger.definitions[className] = JSON.parse(JSON.stringify(property));

                // Set reference
                entity[key] = {
                    type: 'object',
                    $ref: `#/definitions/${className}`,
                };
            }
        });
    } catch (err: unknown) {
        log.error(`extractDefinitons caught exception: ${err}`);
        throw err;
    }
}

export function sanitizeSwagger(swaggerDiff: SwaggerDiff, config: Config, forceCSVCollectionFormatInTags: string[], quarantineOperationIds: string[], overrideOperationIds: Record<string, any>): void {
    log.debug('Processing swagger paths');
    processPaths(swaggerDiff, config);

    log.debug('Processing swagger references');
    processRefs(swaggerDiff);

    log.debug('Processing any types in schema');
    processAnyTypes(swaggerDiff);

    log.debug('Forcing CSV Collection Format');
    forceCSVCollectionFormat(swaggerDiff, forceCSVCollectionFormatInTags);

    log.debug('Quarantine Operations');
    quarantineOperations(swaggerDiff, quarantineOperationIds);

    log.debug('Override Operations');
    overrideOperations(swaggerDiff, overrideOperationIds);
}

function processAnyTypes(swaggerDiff: SwaggerDiff): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    const keys = Object.keys(swaggerDiff.newSwagger.definitions);
    keys.forEach((key, index) => {
        if (!swaggerDiff.newSwagger) {
            throw new Error('New Swagger is undefined');
        }
        if (swaggerDiff.newSwagger.definitions[key].properties) {
            const keys = Object.keys(swaggerDiff.newSwagger.definitions[key].properties);
            keys.forEach((key2, index) => {
                if (!swaggerDiff.newSwagger) {
                    throw new Error('New Swagger is undefined');
                }
                if (swaggerDiff.newSwagger.definitions[key].properties) {
                    let obj2 = swaggerDiff.newSwagger.definitions[key].properties[key2];
                    if (obj2) {
                        if (obj2.hasOwnProperty("type") && obj2["type"] === "any") {
                            obj2.type = "string" as ItemsType;
                            obj2.format = "date-time" as Format;
                        }
                    }
                }
            });
        }
    });
}

function forceCSVCollectionFormat(swaggerDiff: SwaggerDiff, forceCSVCollectionFormatInTags: string[]): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    if (forceCSVCollectionFormatInTags && forceCSVCollectionFormatInTags.length > 0) {
        log.info(`Updating CollectionFormat from multi to csv for operations with tags: ${forceCSVCollectionFormatInTags.toString()}`);
        const paths = Object.keys(swaggerDiff.newSwagger.paths);
        for (const path of paths) {
            const methods = Object.keys(swaggerDiff.newSwagger.paths[path]);
            for (const method of methods) {
                let operation = swaggerDiff.newSwagger.paths[path][method];
                let overrideOperation = false;
                for (let overrideTag of forceCSVCollectionFormatInTags) {
                    if (operation && operation.tags && operation.tags.includes(overrideTag)) {
                        overrideOperation = true;
                        break;
                    }
                }
                if (overrideOperation === true) {
                    if (operation.parameters && operation.parameters.length > 0) {
                        for (let opParameter of operation.parameters) {
                            if (opParameter.in && opParameter.in === "query" && opParameter.type && opParameter.type === "array" && opParameter.collectionFormat && opParameter.collectionFormat === "multi") {
                                opParameter.collectionFormat = "csv";
                            }
                        }
                    }
                }
            }
        }
    }
    return;
}

function quarantineOperations(swaggerDiff: SwaggerDiff, quarantineOperationIds: string[]): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    if (quarantineOperationIds && quarantineOperationIds.length > 0) {
        log.info(`Quarantine for OperationIds: ${quarantineOperationIds.toString()}`);
        const paths = Object.keys(swaggerDiff.newSwagger.paths);
        for (const path of paths) {
            const methods = Object.keys(swaggerDiff.newSwagger.paths[path]);
            for (const method of methods) {
                let operation = swaggerDiff.newSwagger.paths[path][method];
                if (operation && operation.operationId && quarantineOperationIds.includes(operation.operationId)) {
                    // Remove Operation
                    delete swaggerDiff.newSwagger.paths[path][method];
                }
            }
            const remainingMethods = Object.keys(swaggerDiff.newSwagger.paths[path]);
            if (remainingMethods.length == 0) {
                delete swaggerDiff.newSwagger.paths[path];
            }
        }
    }
    return;
}

function overrideOperations(swaggerDiff: SwaggerDiff, overrideOperationIds: Record<string, any>): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    if (overrideOperationIds && Object.keys(overrideOperationIds).length > 0) {
        const overridePaths = Object.keys(overrideOperationIds);
        for (const path of overridePaths) {
            const overrideMethods = Object.keys(overrideOperationIds[path]);
            for (const method of overrideMethods) {
                let newOperationId = overrideOperationIds[path][method];
                if (swaggerDiff.newSwagger.paths && swaggerDiff.newSwagger.paths[path] && swaggerDiff.newSwagger.paths[path][method]) {
                    let operation = swaggerDiff.newSwagger.paths[path][method];
                    if (operation && operation.operationId) {
                        log.info(`Override OperationId (path: ${path}, method: ${method}): old=${operation.operationId}, new=${newOperationId}`);
                        operation.operationId = newOperationId;
                    }
                    if (operation && operation["x-purecloud-method-name"]) {
                        operation["x-purecloud-method-name"] = newOperationId;
                    }
                }
            }
        }
    }
    return;
}

function processPaths(swaggerDiff: SwaggerDiff, config: Config): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    const paths = Object.keys(swaggerDiff.newSwagger.paths);
    for (const path of paths) {
        if (!path.startsWith("/api/v2") || (path.startsWith("/api/v2/apps") && config.settings.swaggerCodegen.codegenLanguage === "purecloudpython")) {
            delete swaggerDiff.newSwagger.paths[path]
        }
    }

    if (config.settings.swaggerCodegen.codegenLanguage !== "purecloudpython") return

    const definitions = Object.keys(swaggerDiff.newSwagger.definitions);
    for (const definition of definitions) {
        if (definition.endsWith("_")) {
            delete swaggerDiff.newSwagger.definitions[definition]
        }
    }
}

function processRefs(swaggerDiff: SwaggerDiff): void {
    if (!swaggerDiff.newSwagger) {
        throw new Error('New Swagger is undefined');
    }
    const keys = Object.keys(swaggerDiff.newSwagger.definitions);
    keys.forEach((key, index) => {
        if (!swaggerDiff.newSwagger) {
            throw new Error('New Swagger is undefined');
        }
        if (swaggerDiff.newSwagger.definitions[key].properties) {
            const keys = Object.keys(swaggerDiff.newSwagger.definitions[key].properties);
            keys.forEach((key2, index) => {
                if (!swaggerDiff.newSwagger) {
                    throw new Error('New Swagger is undefined');
                }
                if (swaggerDiff.newSwagger.definitions[key].properties) {
                    let obj2 = swaggerDiff.newSwagger.definitions[key].properties[key2];
                    if (obj2) {
                        if (obj2.hasOwnProperty("$ref") && (obj2.hasOwnProperty("readOnly") || obj2.hasOwnProperty("description"))) {
                            if (obj2.readOnly === true && obj2.hasOwnProperty("description")) {
                                obj2.description = `${obj2.description} readOnly`
                            }

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
