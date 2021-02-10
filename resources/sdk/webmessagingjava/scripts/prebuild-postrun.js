const fs = require('fs-extra');
const path = require('path');

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var artifactId = process.argv[4];

	var config = {
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
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}
