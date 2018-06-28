const cp = require('child_process');
const fs = require('fs-extra');
const path = require('path');

var Mustache = require('mustache');

function generateNotificationTopicsFile(templatePath, dataPath, outPath, namespace) {
	var notificationsRaw = fs.readFileSync(dataPath, 'UTF-8');
	var notifications = JSON.parse(notificationsRaw);
	notifications.namespace = namespace;
	var notificationsTemplate = fs.readFileSync(templatePath, 'UTF-8');

	var notificationsClass = Mustache.render(notificationsTemplate, notifications);
	fs.writeFileSync(outPath, notificationsClass, 'UTF-8');
	console.log(`File written to ${outPath}`);
}

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = require(path.resolve(process.argv[3]));
	var packageName = process.argv[4];
	var notificationsTemplatePath = process.argv[5];
	var notificationsDataPath = process.argv[6];
	var notificationsOutPath = process.argv[7];
	var nugetPath = process.argv[8];

	console.log(`swaggerCodegenConfigFilePath=${swaggerCodegenConfigFilePath}`);
	console.log(`version=${JSON.stringify(version)}`);
	console.log(`packageName=${packageName}`);
	console.log(`notificationsTemplatePath=${notificationsTemplatePath}`);
	console.log(`notificationsDataPath=${notificationsDataPath}`);
	console.log(`notificationsOutPath=${notificationsOutPath}`);

	var config = {
		'packageName': packageName || 'PureCloudPlatform.Client',
		'packageVersion': version.displayFull,
		'packageTitle':'PureCloud Platform Client SDK',
		'packageProductName':'PureCloudPlatformClient',
		'packageDescription':'A .NET library to interface with the PureCloud Public API',
		'packageCompany':'Genesys',
		'packageCopyright':'Copyright © Genesys 2017',
		'httpUserAgent':'PureCloud SDK',
		'targetFramework':'net452'
	};

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);

	generateNotificationTopicsFile(notificationsTemplatePath, notificationsDataPath, notificationsOutPath, packageName);

	console.log('downloading nuget...');
	let data = cp.execFileSync('curl', ['--silent', '-L', 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'], {encoding: 'binary'});
	fs.writeFileSync(nugetPath, data, 'binary');
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}