import fs from 'fs';
import path from 'path';

interface APIData {
	operationId?: string;
	functionName?: string;
	signature?: string;
	parameters?: Parameter[];
	example?: string;
	return?: string;
}

interface Parameter {
	name: string;
	type: string;
	required: string;
}


export default class CombineApis {

	dataFile: APIData = {};
	dirent: fs.Dirent;

	combineApiDataFiles(docsDir: string, dataFileName: string) {

		const dir = fs.opendirSync(docsDir);

		try {
			// Read docs dir to find swaggerTag category API data
			while ((this.dirent = dir.readSync()) !== null) {
				const nameLowerCase = this.dirent.name.toLowerCase();
				const swaggerTag = nameLowerCase.replace('api.json', '');
				// Looking for a filename like UsersAPI.json
				if (!nameLowerCase.endsWith('api.json')) continue;

				// Read API data for category
				const swaggerTagFilePath = path.join(docsDir, this.dirent.name);
				let swaggerTagOperations = JSON.parse(fs.readFileSync(swaggerTagFilePath, 'utf8'));

				// Iterate operations in category
				for (const operationPath of Object.keys(swaggerTagOperations)) {
					const operationId = swaggerTagOperations[operationPath].operationId;

					// Operations can exist in multiple categories. Skip this one if we already processed it.
					if (this.dataFile[operationId]) continue;

					// Set operation data
					this.dataFile[operationId] = swaggerTagOperations[operationPath];

					// Load example content and set on operation data (swagger-codegen uses the value in functionName to write the example file, not the lowercased operationId)
					const exampleFilePath = path.join(docsDir, this.dataFile[operationId].functionName + '-example.txt');
					if (!fs.existsSync(exampleFilePath)) {
						console.log('WARNING example file does not exist:', exampleFilePath);
						continue;
					}
					this.dataFile[operationId].example = fs.readFileSync(exampleFilePath, 'utf8');

					// Delete example file
					fs.unlinkSync(exampleFilePath);
				}

				// Delete source file
				fs.unlinkSync(swaggerTagFilePath);
			}

			dir.closeSync();

			// Write aggregated output
			fs.writeFileSync(dataFileName, JSON.stringify(this.dataFile, null, 2));
		} catch (err) {
			console.log(err);
			process.exit(-1);
		}
	}

}

const combineApis = new CombineApis();
const docsDir = process.argv[2];
const dataFileName = process.argv[3];
combineApis.combineApiDataFiles(docsDir, dataFileName);