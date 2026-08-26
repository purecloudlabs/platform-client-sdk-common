import { ItemsType, Format, OpenApiSpec, CollectionFormat, Components } from '../types/swagger.js';
import { Builder } from '../builder/builder.js';
import { log } from '../log/logger.js';

// Preview in OAS contains public as well

// Remove/replace response ref corresponding to definition of type array

// This function will combine the public openapi with the preview openapi
export function combineOpenApi(publicOpenApi: OpenApiSpec, preview: OpenApiSpec): OpenApiSpec {
    log.info('Combining public and preview openapi docs into one');

    // Set new file equal to public file for now
	let newSpecificationFile = publicOpenApi;

    if (!newSpecificationFile.tags) newSpecificationFile.tags = [];
	// Search for tags that are in the preview swagger but not in the public swagger and add to new new JSON object
	let publicTagNames = publicOpenApi.tags.map((otag) => otag.name);
	preview.tags.forEach((previewTag) => {
		if (!publicTagNames.includes(previewTag.name)) {
			newSpecificationFile.tags.push(previewTag);
		}
	});

    if (!newSpecificationFile.components) newSpecificationFile.components = {} as Components;
    if (!newSpecificationFile.components.securitySchemes) newSpecificationFile.components.securitySchemes = {};
    // Search for securityDefinitions that are in the preview swagger but not in the public swagger and add to new new JSON object
	let publicSecuritySchemeNames = Object.keys(publicOpenApi.components.securitySchemes ?? {});
	let previewSecuritySchemeNames = Object.keys(preview.components.securitySchemes ?? {});
	for (let previewName of previewSecuritySchemeNames) {
		if (!publicSecuritySchemeNames.includes(previewName)) {
			newSpecificationFile.components.securitySchemes[previewName] = preview.components.securitySchemes[previewName];
		}
	}

	// mark preview paths as preview(similar to marking as deprecated)
	for (const [key1, value1] of Object.entries(preview.paths)) {
		for (const [key, value] of Object.entries(value1)) {
			preview.paths[key1][key]['x-genesys-preview'] = true;
		}
	}

    if (!newSpecificationFile.paths) newSpecificationFile.paths = {};
	// Search for paths in the preview swagger not in the public swagger(should be all paths) and add preview paths to new JSON object
	let previewPaths = Object.keys(preview.paths);
	let publicPaths = Object.keys(publicOpenApi.paths);
	for (let previewPath of previewPaths) {
		if (publicPaths.includes(previewPath)) {
			// Path does exist in public swagger, add the preview HTTP method to the existing path in the new JSON object
			for (const [key, value] of Object.entries(preview.paths[previewPath])) {
				// Only set this preview operation if it is not defined in publicOpenApi (no override)
				if (!publicOpenApi.paths[previewPath][key]) newSpecificationFile.paths[previewPath][key] = value;
			}
		} else {
			// Path does not exist in public swagger, add the preview path to the new JSON objects paths
			newSpecificationFile.paths[previewPath] = preview.paths[previewPath];
		}
	}

    if (!newSpecificationFile.components.schemas) newSpecificationFile.components.schemas = {};
	// Search for definitions in the preview swagger not in the public swagger and add preview definitions to new JSON object
	let previewDefinitionNames = Object.keys(preview.components.schemas);
	let publicDefinitionNames = Object.keys(publicOpenApi.components.schemas);
	for (let previewDefinitionName of previewDefinitionNames) {
		if (!publicDefinitionNames.includes(previewDefinitionName)) {
			newSpecificationFile.components.schemas[previewDefinitionName] = preview.components.schemas[previewDefinitionName];
		}
	}

	return newSpecificationFile;
}

// This function will pre-process the openapi file before submitting it to the generator
export async function openapiPreprocessing(builder: Builder, openapi: OpenApiSpec) {

    // Response: array of $ref
    // For Responses with $ref (main schema)
    // - where $ref is a Definition/Schema of type: array of $ref
    // - replace response $ref with its array of $ref


    // Override


    // Filter: keepOnly/quarantine





    return;
}