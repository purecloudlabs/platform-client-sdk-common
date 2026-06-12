import fs from 'fs-extra';
import { log } from '../../../../modules/log/logger';

export class PreBuildPostRun {
	public init(): void {
		try {
			log.debug('PreBuildPostRun initialization started');
			
			let swaggerCodegenConfigFilePath = process.argv[2];
			let version = fs.readJsonSync(process.argv[3]);
			let packageName = process.argv[4];

			let config = {
				packageName: packageName || 'PureCloudPlatformApiSdk',
				packageVersion: version.displayFull,
				packageTitle: 'PureCloud Platform API SDK',
				packageDescription: 'A Python library to interface with the PureCloud Platform API',
				packageAuthor: 'Genesys Developer Evangelists',
				packageAuthorEmail: 'DeveloperEvangelists@Genesys.com',
				packageUrl: 'https://mypurecloud.github.io/platform-client-sdk-python/',
				packageKeywords: 'PureCloud Platform API Genesys',
				install_requires: '',
				httpUserAgent: 'PureCloud SDK'
			};

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			log.debug(`Config file written to ${swaggerCodegenConfigFilePath}`);
		} catch (err: unknown) {
			process.exitCode = 1;
			log.error(`PreBuildPostRun exception: ${err}`);
		}
	}
}

// Call the method directly
log.debug('Starting PreBuildPostRun script execution');
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();
log.debug('PreBuildPostRun script execution completed');
