const fs = require('fs');
const path = require('path');

const docsDir = process.argv[2];
const dataFileName = process.argv[3];

let dataFile = {};

const dir = fs.opendirSync(docsDir);
let dirent;

// Read docs dir to find swaggerTag category API data
while ((dirent = dir.readSync()) !== null) {
	const nameLowerCase = dirent.name.toLowerCase();
	const swaggerTag = nameLowerCase.replace('api.json', '');
	// Looking for a filename like UsersAPI.json
	if (!nameLowerCase.endsWith('api.json')) continue;

	// Read API data for category
	const swaggerTagFilePath = path.join(docsDir, dirent.name);
	let swaggerTagOperations = JSON.parse(fs.readFileSync(swaggerTagFilePath, 'utf8'));
	dataFile[swaggerTag] = {};

	// Iterate operations in category
	for (const operationPath of Object.keys(swaggerTagOperations)) {
		// Set operation data
		dataFile[swaggerTag][operationPath] = swaggerTagOperations[operationPath];

		// Load example content and set on operation data
		const exampleFilePath = path.join(docsDir, dataFile[swaggerTag][operationPath].operationId + '-example.txt');
		dataFile[swaggerTag][operationPath].example = fs.readFileSync(exampleFilePath, 'utf8');
	}

	// Delete soure file
	fs.unlinkSync(swaggerTagFilePath);
}

dir.closeSync();

// Write aggregated output
fs.writeFileSync(dataFileName, JSON.stringify(dataFile, null, 2));
