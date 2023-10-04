import program from 'commander';
import path from 'path';
import { existsSync }  from 'fs';
import { Builder } from './modules/builder/builder'

const sdkLanguageRegex = /^(purecloudjava|purecloudjava-guest|purecloudjavascript|purecloudjavascript-guest|pureclouddotnet|pureclouddotnet-guest|purecloudpython|purecloudios|purecloudswift4|purecloudgo|purecloudkotlin|clisdkclient|webmessagingjava)$/i;

export class SdkBuilder {
	constructor() {
		try {
			// Parse language regex for hoomans
			let sdkLanguages = sdkLanguageRegex.toString().substring(3,sdkLanguageRegex.toString().length - 4).replace(/\|/gi, ", ");
		
			program
				.version('1.0.0')
				.option('--config <path>', 'Path to SDK config file')
				.option('--localconfig <path>', 'Path to SDK local config file')
				.option('--sdk [language]', `Generate the SDK for the given swager-codegen language using the default config. Languages: ${sdkLanguages}`, sdkLanguageRegex)
				.parse(process.argv);
		
			if (program.sdk) {
				// Value is true when a value was specified but didn't match regex
				if (program.sdk === true)
					throw new Error('Invalid SDK language!');
		
				let configPath = path.resolve(path.join('./resources/sdk', program.sdk.toLowerCase()));
				let config = program.config ? program.config : jsonOrYaml(path.join(configPath, 'config'));
				let localconfig = program.localconfig ? program.localconfig : jsonOrYaml(path.join(configPath, 'localconfig'));
				console.log(`Invoking SDK build for language: ${program.sdk}`);
				build(config, localconfig);
				return;
			}
		
			if (program.config) {
				build(program.config, program.localconfig);
				return;
			}
		
			program.help();
		} catch (err: unknown) {
			if (err instanceof Error) {
			abort(err);
		}
	}
	}
}

function abort(err: Error) {
	console.log(err);
	console.log('Exiting SDK Builder with exit code 1');
	process.exitCode = 1;
}

function build(configPath: string, localConfigPath: string) {
	let b = new Builder();
	b.init(configPath, localConfigPath).then(() => 
			b.fullBuild())
		.then(() => console.log('SDK Builder script complete'))
		.catch((err) => abort(err));
}


function jsonOrYaml(filePath : string) {
	let jsonConfig = `${filePath}.json`;
	let yamlConfig = `${filePath}.yml`;

	if (existsSync(jsonConfig)) {
		console.log(`Found config file ${jsonConfig}`);
		return jsonConfig;
	}

	if (existsSync(yamlConfig)) {
		console.log(`Found config file ${yamlConfig}`);
		return yamlConfig;
	}

	console.log(`Unable to find config file: ${filePath}`);
	return;
}

new SdkBuilder();

