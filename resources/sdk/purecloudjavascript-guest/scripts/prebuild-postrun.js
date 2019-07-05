const fs = require('fs-extra');
const path = require('path');

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var moduleName = process.argv[4];
	var projectName = process.argv[5];

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
		invokerPackage: projectName || 'purecloud-platform-client-v2'
	};

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}
