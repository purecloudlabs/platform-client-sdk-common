import cp from 'child_process';
import fs from 'fs-extra';
import Mustache from 'mustache';
import path from 'path';

try {
	var swaggerCodegenConfigFilePath = process.argv[2];
	var version = fs.existsSync(process.argv[3]) ? require(path.resolve(process.argv[3])) : undefined;
	var packageName = process.argv[4];
	var nugetPath = process.argv[5];

	console.log(`swaggerCodegenConfigFilePath=${swaggerCodegenConfigFilePath}`);
	console.log(`version=${JSON.stringify(version)}`);
	console.log(`packageName=${packageName}`);

	var config = {
		packageName: packageName || 'PureCloudPlatform.Client.Guest',
		packageVersion: version ? version.displayFull : '',
		packageTitle: 'PureCloud Platform Guest Chat SDK',
		packageProductName: 'PureCloudPlatformGuestChat',
		packageDescription: 'A .NET library to interface with the PureCloud Platform API Guest Chat APIs',
		packageCompany: 'Genesys',
		packageCopyright: 'Copyright © Genesys 2020',
		httpUserAgent: 'PureCloud Guest Chat SDK',
		targetFramework: 'v4.7'
	};

	fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
	console.log(`Config file written to ${swaggerCodegenConfigFilePath}`);

	console.log('downloading nuget...');
	let data = cp.execFileSync('curl', ['--silent', '-L', 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe'], {
		encoding: 'binary',
		maxBuffer: 1024 * 10000
	});
	fs.writeFileSync(nugetPath, data, 'binary');
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}
