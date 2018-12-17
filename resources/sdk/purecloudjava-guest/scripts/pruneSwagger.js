const _ = require('lodash');
const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');


try {
	// Get swagger from here and process
	var newSwaggerSourcePath = process.argv[2];
	// Put it here
	var newSwaggerPath = process.argv[3];

	console.log(`newSwaggerSourcePath=${newSwaggerSourcePath}`);
	console.log(`newSwaggerPath=${newSwaggerPath}`);

	const loadPromise = newSwaggerSourcePath.startsWith('http') 
		? downloadFile(newSwaggerSourcePath)
		: readFile(newSwaggerSourcePath);

	loadPromise
		.then((swagger) => {
			const guestPaths = {};
			_.forOwn(swagger.paths, (resource, resourcePath) => {
				if (resourcePath.startsWith('/api/v2/webchat/guest'))
					guestPaths[resourcePath] = resource;
			});
			swagger.paths = guestPaths;

			fs.outputJsonSync(newSwaggerPath, swagger);
		})
		.catch((err) => {
			process.exitCode = 1;
			console.log(err);
		});

} catch(err) {
	process.exitCode = 1;
	console.log(err);
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
		} catch(err) {
			reject(err);
		}
	});
}