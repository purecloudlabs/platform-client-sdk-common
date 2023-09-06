import _ from 'lodash';
import fs from 'fs-extra';
import request from 'request-promise';
import path from 'path';
export class PruneSwagger {
	init() {
		try {
			// Get swagger from here and process
			var newSwaggerSourcePath = process.argv[2];
			// Put it here
			var newSwaggerPath = process.argv[3];

			console.log(`newSwaggerSourcePath=${newSwaggerSourcePath}`);
			console.log(`newSwaggerPath=${newSwaggerPath}`);

			const loadPromise = newSwaggerSourcePath.startsWith('http') ? downloadFile(newSwaggerSourcePath) : readFile(newSwaggerSourcePath);

			loadPromise
				.then((swagger) => {
					const guestPaths = {};
					const models = {};
					_.forOwn(swagger.paths, (resource, resourcePath) => {
						if (!resourcePath.startsWith('/api/v2/webchat/guest')) return;

						// Add resource
						guestPaths[resourcePath] = resource;

						// Get models from each resource method body and response
						_.forOwn(resource, (methodConfig, method) => {
							console.log(`Adding resource: ${method.toUpperCase()} ${resourcePath}`);

							// Get body param models
							let bodyParam;
							methodConfig.parameters.some((param) => {
								if (param.in === 'body') {
									bodyParam = param;
									return true;
								}
							});
							if (bodyParam && bodyParam.schema) extractModels(bodyParam.schema, swagger.definitions, models);

							// Get response models
							_.forOwn(methodConfig.responses, (responseConfig, responseCode) => {
								if (responseConfig.schema) {
									extractModels(responseConfig.schema, swagger.definitions, models);
								}
							});
						});
					});

					swagger.paths = guestPaths;
					swagger.definitions = models;

					fs.outputJsonSync(newSwaggerPath, swagger);
				})
				.catch((err) => {
					process.exitCode = 1;
					console.log(err);
				});
		} catch (err) {
			process.exitCode = 1;
			console.log(err);
		}
	}
	;
}

function downloadFile(url) {
	return request({
		method: 'GET',
		uri: url,
		json: true
	});
}

function readFile(filePath) {
	return new Promise((resolve, reject) => {
		try {
			resolve(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
		} catch (err) {
			reject(err);
		}
	});
}

function extractModels(schema, modelSource, models = {}) {
	_.forOwn(schema, (value, key) => {
		if (key === '$ref' && typeof value === 'string') {
			const modelName = value.split('/').pop();
			if (!models[modelName]) {
				// console.log('Extracting model: ' + modelName);
				models[modelName] = modelSource[modelName];
				extractModels(models[modelName], modelSource, models);
			} else {
				// console.log('Model already known: ' + modelName);
			}
		}

		if (typeof value === 'object') {
			extractModels(value, modelSource, models);
		}
	});
}


// Call the method directly
const pruneSwagger = new PruneSwagger();
pruneSwagger.init();


