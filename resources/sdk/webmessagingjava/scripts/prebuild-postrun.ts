import fs from 'fs-extra';
import { log } from '../../../../modules/log/logger';

export class PreBuildPostRun {
	public init(): void {
		try {
			log.debug('PreBuildPostRun initialization started');

			let swaggerCodegenConfigFilePath = process.argv[2];
			let version = fs.readJsonSync(process.argv[3]);
			let artifactId = process.argv[4];

			let config = {
				artifactId: artifactId || 'platform-client',
				artifactVersion: version.displayFull,
				apiPackage: 'cloud.genesys.webmessaging.sdk.api',
				httpUserAgent: 'PureCloud SDK',
				modelPackage: 'cloud.genesys.webmessaging.sdk.model',
				invokerPackage: 'cloud.genesys.webmessaging.sdk',
				groupId: 'cloud.genesys',
				localVariablePrefix: 'gc',
				serializableModel: 'true',
				hideGenerationTimestamp: 'false',
				packageDescription: 'A customer-side development kit for creating custom Genesys Cloud Web Messaging experiences',
				packageUrl: 'https://developer.mypurecloud.com/api/rest/client-libraries/webmessaging-java/',
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
