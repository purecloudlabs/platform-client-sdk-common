import program from 'commander';
import path from 'path';
import { existsSync }  from 'fs';
import { Builder } from './modules/builder/builder'
import log from './modules/log/logger';

const sdkLanguageRegex = /^(purecloudjava|purecloudjava-guest|purecloudjavascript|purecloudjavascript-guest|pureclouddotnet|pureclouddotnet-guest|purecloudpython|purecloudios|purecloudswift4|purecloudgo|purecloudkotlin|clisdkclient|webmessagingjava)$/i;

export class SdkBuilder {
	constructor() {
		log.debug('SdkBuilder constructor started');
		try {
			// Parse language regex for hoomans
			let sdkLanguages = sdkLanguageRegex.toString().substring(3,sdkLanguageRegex.toString().length - 4).replace(/\|/gi, ", ");
			log.debug(`Parsed SDK languages: ${sdkLanguages}`);
		
			log.debug('Setting up commander program');
			program
				.version('1.0.0')
				.option('--config <path>', 'Path to SDK config file')
				.option('--localconfig <path>', 'Path to SDK local config file')
				.option('--sdk [language]', `Generate the SDK for the given swager-codegen language using the default config. Languages: ${sdkLanguages}`, sdkLanguageRegex)
				.parse(process.argv);
			log.debug(`Commander program parsed - SDK: ${program.sdk}, Config: ${program.config}, LocalConfig: ${program.localconfig}`);
		
			if (program.sdk) {
				log.debug(`SDK language specified: ${program.sdk}`);
				// Value is true when a value was specified but didn't match regex
				if (program.sdk === true) {
					log.error('Invalid SDK language detected - regex validation failed');
					throw new Error('Invalid SDK language!');
				}
		
				let configPath = path.resolve(path.join('./resources/sdk', program.sdk.toLowerCase()));
				log.debug(`Resolved config path: ${configPath}`);
				
				let config = program.config ? program.config : jsonOrYaml(path.join(configPath, 'config'));
				let localconfig = program.localconfig ? program.localconfig : jsonOrYaml(path.join(configPath, 'localconfig'));
				log.debug(`Config files determined - Config: ${config}, LocalConfig: ${localconfig}`);
				
				log.info(`Invoking SDK build for language: ${program.sdk}`);
				build(config, localconfig);
				return;
			}
		
			if (program.config) {
				log.debug(`Using custom config path - Config: ${program.config}, LocalConfig: ${program.localconfig}`);
				build(program.config, program.localconfig);
				return;
			}
		
			log.debug('No valid options provided, showing help');
			program.help();
		} catch (err: unknown) {
			log.error(`Error caught in SdkBuilder constructor: ${err}`);
			if (err instanceof Error) {
				abort(err);
			}
		}
	}
}


function abort(err: Error) {
	log.error(`Aborting SDK Builder - ${err.name}: ${err.message}`);
	log.error(`Stack trace: ${err.stack}`);
	log.error('Exiting SDK Builder with exit code 1');
	process.exitCode = 1;
}

function build(configPath: string, localConfigPath: string) {
	log.info(`Starting build process - Config: ${configPath}, LocalConfig: ${localConfigPath}`);
	let b = new Builder();
	log.debug('Builder instance created');
	
	b.init(configPath, localConfigPath)
		.then(() => {
			log.info('Builder initialization completed successfully');
			return b.fullBuild();
		})
		.then(() => {
			log.info('Full build completed successfully');
			log.info('SDK Builder script complete');
		})
		.catch((err) => {
			log.error(`Build process failed: ${err}`);
			abort(err);
		});
}


function jsonOrYaml(filePath : string) {
	log.debug(`Looking for config file: ${filePath}`);
	let jsonConfig = `${filePath}.json`;
	let yamlConfig = `${filePath}.yml`;
	log.debug(`Checking config file variants: ${jsonConfig}, ${yamlConfig}`);

	if (existsSync(jsonConfig)) {
		log.debug(`JSON config file found: ${jsonConfig}`);
		log.info(`Found config file ${jsonConfig}`);
		return jsonConfig;
	}

	if (existsSync(yamlConfig)) {
		log.debug(`YAML config file found: ${yamlConfig}`);
		log.info(`Found config file ${yamlConfig}`);
		return yamlConfig;
	}

	log.warn(`No config file found - searched: ${jsonConfig}, ${yamlConfig}`);
	log.warn(`Unable to find config file: ${filePath}`);
	return;
}

log.info('Starting SdkBuilder application');
new SdkBuilder();
log.info('SdkBuilder application initialization completed');

