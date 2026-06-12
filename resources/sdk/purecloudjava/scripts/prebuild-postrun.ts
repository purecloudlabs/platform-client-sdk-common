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
				apiPackage: 'com.mypurecloud.sdk.v2.api',
				modelPackage: 'com.mypurecloud.sdk.v2.model',
				invokerPackage: 'com.mypurecloud.sdk.v2',
				groupId: 'com.mypurecloud',
				localVariablePrefix: 'pc',
				serializableModel: 'true',
				hideGenerationTimestamp: 'false',
				httpUserAgent: 'PureCloud SDK',
				packageDescription: 'A Java package to interface with the PureCloud Platform API',
				packageUrl: 'https://mypurecloud.github.io/platform-client-sdk-java/'
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
