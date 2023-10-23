import fs from 'fs-extra';
import path from 'path';

export class PreBuildPostRun {

	public init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			var version = fs.readJsonSync(process.argv[3]);
			var packageName = process.argv[4];

			var config = {
				basePath: 'https://api.mypurecloud.com',
				packageName: packageName || 'platform-client',
				packageVersion: version.displayFull,
				majorVersion: `v${version.major}`,
				httpUserAgent: 'PureCloud SDK'
			};

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
		} catch (err) {
			process.exitCode = 1;
			console.log(err);
		}
	};
}

// Call the method directly
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();


