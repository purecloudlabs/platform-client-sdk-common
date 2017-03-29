const fs = require('fs-extra');
const path = require('path');

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var packageName = process.argv[4];

      var config = {
            "packageName": packageName || "PureCloudPlatformApiSdk",
            "packageVersion": version.displayFull,
            "packageTitle": "PureCloud Platform API SDK",
            "packageDescription": "A Python library to interface with the PureCloud Platform API",
            "packageAuthor": "Genesys Developer Evangelists",
            "packageAuthorEmail": "DeveloperEvangelists@inin.com",
            "packageUrl": "https://developer.mypurecloud.com/api/rest/client-libraries/python/latest/",
            "packageKeywords": "PureCloud Platform API Genesys",
            "install_requires": "",
            "httpUserAgent":"PureCloud SDK"
      };

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}