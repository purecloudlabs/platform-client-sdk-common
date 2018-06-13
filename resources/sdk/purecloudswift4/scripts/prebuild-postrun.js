const fs = require('fs-extra');
const path = require('path');

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var packageName = process.argv[4];

	var config = {
		projectName: packageName || 'PureCloudPlatformSDK',
		projectDescription: 'An iOS library to interface with the PureCloud Platform API',
		podSummary: 'An iOS library to interface with the PureCloud Platform API',
		podDescription: 'An iOS library to interface with the PureCloud Platform API',
		podSource: `{ :git => 'git@github.com:MyPureCloud/platform-client-sdk-ios.git', :tag => '${version.displayFull}' }`,
		podAuthors: 'Genesys Developer Evangelists',
		podSocialMediaURL: 'https://twitter.com/PureCloud_Dev',
		podDocsetURL: 'https://developer.mypurecloud.com/api/rest/client-libraries/ios/',
		podLicense: 'MIT',
		podHomepage: 'https://developer.mypurecloud.com/',
		podDocumentationURL: 'https://developer.mypurecloud.com/api/rest/client-libraries/ios/',
		podVersion: version.displayFull,
		// responseAs: '',
		// unwrapRequired: '',
		// swiftUseApiNamespace: '',
		// PromiseKit: ''
	};

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}
