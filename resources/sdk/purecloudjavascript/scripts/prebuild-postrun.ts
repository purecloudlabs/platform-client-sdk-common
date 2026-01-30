import fs from 'fs-extra';

export class PreBuildPostRun {
	init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			console.log(swaggerCodegenConfigFilePath)
			console.log("swaggerCodegenConfigFilePath")
			var version = fs.readJsonSync(process.argv[3]);
			var moduleName = process.argv[4];
			var projectName = process.argv[5];
			let enableCustomHeaders: boolean = false;
			if (process.argv[6] && process.argv[6].toLowerCase() === 'true') enableCustomHeaders = true;

			var config = {
				moduleName: moduleName || 'platformClient',
				projectName: projectName || 'purecloud-platform-client-v2',
				projectDescription: 'A JavaScript library to interface with the PureCloud Platform API',
				projectVersion: version.displayFull,
				projectLicenseName: 'MIT',
				usePromises: true,
				useInheritance: false,
				emitModelMethods: true,
				emitJSDoc: true,
				localVariablePrefix: 'pc',
				invokerPackage: projectName || 'purecloud-platform-client-v2',
				enableCustomHeaders: enableCustomHeaders || false
			};

			if (enableCustomHeaders == true) console.log("Custom Headers Support enabled");

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