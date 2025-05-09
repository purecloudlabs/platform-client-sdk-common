import fs from 'fs-extra';
import path from 'path';
export class PreBuildPostRun {
	init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			var version = fs.readJsonSync(process.argv[3]);
			var artifactId = process.argv[4];

			var config = {
				artifactId: artifactId || 'platform-client',
				artifactVersion: version.displayFull,
				apiPackage: 'com.mypurecloud.sdk.v2.api',
				modelPackage: 'com.mypurecloud.sdk.v2.model',
				invokerPackage: 'com.mypurecloud.sdk.v2',
				groupId: 'com.mypurecloud',
				localVariablePrefix: 'pc',
				serializableModel: 'true',
				hideGenerationTimestamp: 'true',
				httpUserAgent: 'PureCloud SDK',
				packageDescription: 'A Kotlin package to interface with the PureCloud Platform API',
				packageUrl: 'https://developer.genesys.cloud/api/rest/client-libraries/kotlin/latest/'
			};

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);

			// TODO remove this when kotlin gets its own dedicated repo
			var outputDir = path.join(process.env['SDK_REPO'], 'build');
			fs.readdirSync(outputDir).forEach(file => {
				if (file.includes("gradle")) {
					fs.unlinkSync(path.join(outputDir, file));
				}
			});
			fs.unlinkSync(path.join(outputDir, "pom.xml"));
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

