import fs from 'fs-extra';
import log from '../../../../modules/log/logger';


export class PreBuildPostRun {
	init() {
		try {
			log.debug('PreBuildPostRun initialization started');
			var swaggerCodegenConfigFilePath = process.argv[2];
			var versionFilePath = process.argv[3];
			
			log.debug(`Command line arguments parsed, ${swaggerCodegenConfigFilePath}, ${versionFilePath}`);
			
			// Validate arguments
			if (!swaggerCodegenConfigFilePath) {
				log.debug('Missing swagger codegen config file path');
				throw new Error('Swagger codegen config file path is required');
			}
			if (!versionFilePath) {
				log.debug('Missing version file path');
				throw new Error('Version file path is required');
			}
			
			// Validate version file exists
			if (!fs.existsSync(versionFilePath)) {
				log.debug(`Version file does not exist', ${versionFilePath}`);
				throw new Error(`Version file does not exist: ${versionFilePath}`);
			}
			
			log.debug('Loading version file');
			var version = fs.readJsonSync(versionFilePath);
			log.debug(`Version file loaded', ${version}`);
			
			log.debug('Creating configuration object');
			var config = {
				basePath: 'https://api.mypurecloud.com',
				packageName: 'platform-client',
				packageVersion: version.displayFull,
				httpUserAgent: 'PureCloud SDK',
			};
			log.debug(`Configuration object created', ${config}`);

			log.debug(`Writing configuration to file', filePath: ${swaggerCodegenConfigFilePath}`);
			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			log.debug('Configuration file written successfully');
			console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
			
			// Verify file was written
			if (fs.existsSync(swaggerCodegenConfigFilePath)) {
				log.debug('Configuration file verification successful');
			} else {
				log.debug('Warning: Configuration file was not created');
			}
			log.debug('PreBuildPostRun completed successfully');
		} catch (err) {
			log.error(`PreBuildPostRun failed: ${err instanceof Error ? err.message : err}`);			
			process.exitCode = 1;
			console.log(err);
		}
	}
	;
}
// Call the method directly
log.debug('Starting PreBuildPostRun script execution');
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();
log.debug('PreBuildPostRun script execution completed');