import fs from 'fs-extra';
import { log } from '../../../../modules/log/logger';

export class PreBuildPostRun {
	public init(): void {
		try {
			log.debug('PreBuildPostRun initialization started');
			
			const swaggerCodegenConfigFilePath = process.argv[2];
			const version = fs.readJsonSync(process.argv[3]);
			const packageName = process.argv[4];
			const aggregateModels = process.argv[5];

			let config = {
				projectName: packageName || 'PureCloudPlatformApiSdk',
				projectDescription: 'An iOS library to interface with the PureCloud Platform API',
				podSummary: 'An iOS library to interface with the PureCloud Platform API',
				podDescription: 'An iOS library to interface with the PureCloud Platform API',
				podSource: `{ :git => 'git@github.com:MyPureCloud/platform-client-sdk-ios.git', :tag => '${version.displayFull}' }`,
				podAuthors: 'Genesys Developer Evangelists',
				podSocialMediaURL: 'https://twitter.com/PureCloud_Dev',
				podDocsetURL: 'https://mypurecloud.github.io/platform-client-sdk-ios/',
				podLicense: 'MIT',
				podHomepage: 'https://developer.genesys.cloud/',
				podDocumentationURL: 'https://mypurecloud.github.io/platform-client-sdk-ios/',
				podVersion: version.displayFull,
				aggregateModels: (aggregateModels.toLowerCase() === "true")
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
