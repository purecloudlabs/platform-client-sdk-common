import fs from 'fs-extra';
import childProcess from 'child_process';
import Mustache from 'mustache';
import { log } from '../../../../modules/log/logger';

export class PreBuildPostRun {
	public init(): void {
		try {
			log.debug('PreBuildPostRun initialization started');

			let swaggerCodegenConfigFilePath = process.argv[2];
			let version = fs.readJsonSync(process.argv[3]);
			let packageName = process.argv[4];
			let notificationsTemplatePath = process.argv[5];
			let notificationsDataPath = process.argv[6];
			let notificationsOutPath = process.argv[7];
			let nugetPath = process.argv[8];

			log.debug(`swaggerCodegenConfigFilePath=${swaggerCodegenConfigFilePath}`);
			log.debug(`version=${JSON.stringify(version)}`);
			log.debug(`packageName=${packageName}`);
			log.debug(`notificationsTemplatePath=${notificationsTemplatePath}`);
			log.debug(`notificationsDataPath=${notificationsDataPath}`);
			log.debug(`notificationsOutPath=${notificationsOutPath}`);

			let config = {
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
			log.debug(`Config file written to ${swaggerCodegenConfigFilePath}`);

			generateNotificationTopicsFile(notificationsTemplatePath, notificationsDataPath, notificationsOutPath, packageName);

			log.debug('downloading nuget...');
			let data = childProcess.execFileSync('curl', ['--silent', '-L', 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'], {
				encoding: 'binary',
				maxBuffer: 1024 * 1024 * 10
			});
			fs.writeFileSync(nugetPath, data, 'binary');
		} catch (err: unknown) {
			process.exitCode = 1;
			log.error(`PreBuildPostRun exception: ${err}`);
		}
	}
}

function generateNotificationTopicsFile(templatePath: string, dataPath: string, outPath: string, namespace: string): void {
	let notificationsRaw = fs.readFileSync(dataPath, 'utf8');
	let notifications = JSON.parse(notificationsRaw);
	notifications.namespace = namespace;
	let notificationsTemplate = fs.readFileSync(templatePath, 'utf8');

	let notificationsClass = Mustache.render(notificationsTemplate, notifications);
	fs.writeFileSync(outPath, notificationsClass, 'utf8');
	log.debug(`File written to ${outPath}`);
}

// Call the method directly
log.debug('Starting PreBuildPostRun script execution');
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();
log.debug('PreBuildPostRun script execution completed');
