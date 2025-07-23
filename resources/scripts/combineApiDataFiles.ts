import fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import log from '../../modules/log/logger';

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
	rl: readline.Interface;

	constructor() {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
	}

	private waitForUserInput(): Promise<string> {
		return new Promise((resolve) => {
			this.rl.question('Press Enter to continue, or type "q" to quit: ', (answer) => {
				resolve(answer.trim().toLowerCase());
			});
		});
	}

	async combineApiDataFiles(docsDir: string, dataFileName: string) {

		const dir = fs.opendirSync(docsDir);
		log.debug('Starting combineApiDataFiles');
		log.debug(`docsDir: ${docsDir}, dataFileName: ${dataFileName}`);
		log.debug('Directory opened successfully');

		let totalFilesProcessed = 0;
		let totalOperationsProcessed = 0;
		let skippedFiles = 0;
		let duplicateOperations = 0;

		try {
			// Read docs dir to find swaggerTag category API data
			while ((this.dirent = dir.readSync()) !== null) {
				log.debug(`Processing directory entry: ${this.dirent.name}`);

				const nameLowerCase = this.dirent.name.toLowerCase();
				const swaggerTag = nameLowerCase.replace('api.json', '');

				log.debug(`nameLowerCase: ${nameLowerCase}, swaggerTag: ${swaggerTag}`);

				// Looking for a filename like UsersAPI.json
				if (!nameLowerCase.endsWith('api.json')) {
					log.debug(`Skipping non-API file: ${this.dirent.name}`);
					skippedFiles++;
				} else {
					log.debug(`Processing API file: ${this.dirent.name}`);
					totalFilesProcessed++;

					// Read API data for category
					const swaggerTagFilePath = path.join(docsDir, this.dirent.name);
					log.debug(`Reading file: ${swaggerTagFilePath}`);
					
					let swaggerTagOperations = JSON.parse(fs.readFileSync(swaggerTagFilePath, 'utf8'));
					const operationKeys = Object.keys(swaggerTagOperations);
					log.debug(`Found ${operationKeys.length} operations in ${this.dirent.name}`);
					log.debug(`Operation keys: ${operationKeys.join(', ')}`);

					// Iterate operations in category
					for (const operationPath of operationKeys) {
						const operation = swaggerTagOperations[operationPath];
						const operationId = operation.operationId;
						
						log.debug(`Processing operation: ${operationPath}, operationId: ${operationId}`);
						log.debug(`Operation data keys: ${Object.keys(operation).join(', ')}`);

						// Operations can exist in multiple categories. Skip this one if we already processed it.
						if (this.dataFile[operationId]) {
							log.debug(`Skipping duplicate operation: ${operationId}`);
							duplicateOperations++;
							continue;
						}

						// Set operation data
						this.dataFile[operationId] = swaggerTagOperations[operationPath];
						log.debug(`Added operation to dataFile: ${operationId}`);
						log.debug(`Operation functionName: ${this.dataFile[operationId].functionName}`);

						// Load example content and set on operation data (swagger-codegen uses the value in functionName to write the example file, not the lowercased operationId)
						const exampleFilePath = path.join(docsDir, this.dataFile[operationId].functionName + '-example.txt');
						log.debug(`Looking for example file: ${exampleFilePath}`);
						
						if (!fs.existsSync(exampleFilePath)) {
							log.warn(`Example file does not exist: ${exampleFilePath}`);
							continue;
						}
						
						log.debug(`Reading example file: ${exampleFilePath}`);
						this.dataFile[operationId].example = fs.readFileSync(exampleFilePath, 'utf8');
						log.debug(`Example content length: ${this.dataFile[operationId].example?.length || 0}`);

						// Delete example file
						log.debug(`Deleting example file: ${exampleFilePath}`);
						//TBD fs.unlinkSync(exampleFilePath);
						
						totalOperationsProcessed++;
					}

					// Delete source file
					log.debug(`Deleting source file: ${swaggerTagFilePath}`);
					fs.unlinkSync(swaggerTagFilePath);
				}
			}

			dir.closeSync();
			this.rl.close();
			log.debug('Directory closed');

			log.info('Processing summary:');
			log.info(`  - Total files processed: ${totalFilesProcessed}`);
			log.info(`  - Total operations processed: ${totalOperationsProcessed}`);
			log.info(`  - Files skipped (non-API): ${skippedFiles}`);
			log.info(`  - Duplicate operations skipped: ${duplicateOperations}`);
			log.info(`  - Final dataFile keys count: ${Object.keys(this.dataFile).length}`);

			// Write aggregated output
			log.debug(`Writing output to: ${dataFileName}`);
			const outputData = JSON.stringify(this.dataFile, null, 2);
			log.debug(`Output data size: ${outputData.length} characters`);
			fs.writeFileSync(dataFileName, outputData);
			log.info('File written successfully');
			
		} catch (err) {
			log.error(`Exception occurred: ${err}`);
			log.error(`Stack trace: ${err.stack}`);
			process.exit(-1);
		}
	}

}

const combineApis = new CombineApis();
const docsDir = process.argv[2];
const dataFileName = process.argv[3];
log.info(`Starting script - docsDir: ${docsDir}, dataFileName: ${dataFileName}`);

// Run the async method
(async () => {
	await combineApis.combineApiDataFiles(docsDir, dataFileName);
})();