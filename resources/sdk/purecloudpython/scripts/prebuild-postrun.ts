import fs from 'fs-extra';
export class PreBuildPostRun {
	init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			var version = fs.readJsonSync(process.argv[3]);
			var packageName = process.argv[4];

			var config = {
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

