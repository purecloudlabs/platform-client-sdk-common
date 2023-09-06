import fs from 'fs-extra';
import cp from 'child_process';
import path from 'path';
import Mustache from 'mustache';
export class PreBuildPostRun {
	init() {
		try {
			var swaggerCodegenConfigFilePath = process.argv[2];
			var version = fs.readJsonSync(process.argv[3]);
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
				packageName: packageName || 'PureCloudPlatform.Client',
				packageVersion: version.displayFull,
				packageTitle: 'PureCloud Platform Client SDK',
				packageProductName: 'PureCloudPlatformClient',
				packageDescription: 'A .NET library to interface with the PureCloud Public API',
				packageCompany: 'Genesys',
				packageCopyright: 'Copyright © Genesys 2022',
				httpUserAgent: 'PureCloud SDK',
				targetFramework: 'v4.7'
			};

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);

			generateNotificationTopicsFile(notificationsTemplatePath, notificationsDataPath, notificationsOutPath, packageName);

			console.log('downloading nuget...');
			let data = cp.execFileSync('curl', ['--silent', '-L', 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'], {
				encoding: 'binary',
				maxBuffer: 1024 * 1024 * 10
			});
			fs.writeFileSync(nugetPath, data, 'binary');
		} catch (err) {
			process.exitCode = 1;
			console.log(err);
		}
	}
	;
}

function generateNotificationTopicsFile(templatePath, dataPath, outPath, namespace) {
	var notificationsRaw = fs.readFileSync(dataPath, 'utf8');
	var notifications = JSON.parse(notificationsRaw);
	notifications.namespace = namespace;
	var notificationsTemplate = fs.readFileSync(templatePath, 'utf8');

	var notificationsClass = Mustache.render(notificationsTemplate, notifications);
	fs.writeFileSync(outPath, notificationsClass, 'utf8');
	console.log(`File written to ${outPath}`);
}

const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();