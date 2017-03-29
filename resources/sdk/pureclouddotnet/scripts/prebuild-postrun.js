const fs = require('fs-extra');
const path = require('path');

//var Mustache = require('mustache');

/*
//TODO: Implement this
function generateNotificationTopicsFile() {
	try {
		var notificationsRaw = fs.readFileSync('bin/notificationMappings.json', 'UTF-8');
		var notifications = JSON.parse(notificationsRaw);
		var notificationsTemplate = fs.readFileSync('buildScripts/notifications.mustache', 'UTF-8');

		var notificationsClass = Mustache.render(notificationsTemplate, notifications);
		fs.writeFileSync('Extensions/Client/NotificationTopics.cs', notificationsClass, 'UTF-8');
	} catch(e) {
		if (e.code === 'ENOENT') {
			console.log('File not found!');
			console.log(e);
		} else {
			deferred.reject(e);
		}
	}
}
*/

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var packageName = process.argv[4];

	var config = {
		"packageName": packageName || "PureCloudPlatform.Client",
		"packageVersion": version.displayFull,
		"packageTitle":"PureCloud Platform Client SDK",
	    "packageProductName":"PureCloudPlatformClient",
	    "packageDescription":"A .NET library to interface with the PureCloud Public API",
	    "packageCompany":"Genesys",
	    "packageCopyright":"Copyright © Genesys 2017",
	    "httpUserAgent":"PureCloud SDK"
	};

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}