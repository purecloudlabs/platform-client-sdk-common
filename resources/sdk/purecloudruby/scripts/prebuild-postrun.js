const fs = require('fs-extra');
const path = require('path');

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var gemName = process.argv[4];
	var moduleName = process.argv[5];

	var config = {
      "gemVersion": version.displayFull,
      "gemName": gemName || "purecloud",
      "moduleName": moduleName || "PureCloud",
      "gemLicense": "MIT",
      "gemSummary": "PureCloud Platform API Library",
      "gemDescription": "A Ruby library to interface with the PureCloud Platform API",
      "gemHomepage": "https://developer.mypurecloud.com/api/rest/client-libraries/ruby/latest/",
      "gemAuthor": "Genesys Developer Evangelists",
      "gemAuthorEmail": "developerevangelists@inin.com",
      "httpUserAgent": `PureCloud SDK`,
      "gitUserId": "mypurecloud",
      "gitRepoId": "purecloud_api_sdk_ruby"
    };

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}