import fs from 'fs-extra';
export class PreBuildPostRun {
	init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			var version = fs.readJsonSync(process.argv[3]);
			var artifactId = process.argv[4];

			const config = {
				artifactId: artifactId || 'platform-client',
				artifactVersion: version.displayFull,
				apiPackage: 'com.mypurecloud.sdk.v2.guest.api',
				modelPackage: 'com.mypurecloud.sdk.v2.guest.model',
				invokerPackage: 'com.mypurecloud.sdk.v2.guest',
				groupId: 'com.mypurecloud',
				localVariablePrefix: 'pc',
				serializableModel: 'true',
				hideGenerationTimestamp: 'false',
				httpUserAgent: 'PureCloud Guest Chat SDK',
				packageDescription: 'A Java package to interface with the PureCloud Platform API Guest Chat APIs',
				packageUrl: 'https://developer.mypurecloud.com/api/rest/client-libraries/java-guest/'
			};

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
		} catch (err) {
			process.exitCode = 1;
			console.log(err);
		}
	}
	;
}
// Call the method directly
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();


