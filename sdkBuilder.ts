import { program, Option } from 'commander';
import path from 'path';
import { existsSync } from 'fs';
import { Builder } from './modules/builder/builder.js'
import { log } from './modules/log/logger.js';

const sdkLanguageChoices = [
	'purecloudjava',
	'purecloudjavascript',
	'pureclouddotnet',
	'purecloudpython',
	'purecloudios',
	'purecloudswift4',
	'purecloudgo',
	'clisdkclient',
	'webmessagingjava'
];

class SdkBuilder {
	private _config_path: string;
	private _localconfig_path: string;

	constructor() {
		this._config_path = '';
		this._localconfig_path = '';
	}

	public initialize(): void {
		log.info('SdkBuilder initializer started');
		try {
			log.debug(`Parsed SDK languages: ${sdkLanguageChoices.join(', ')}`);

			log.debug('Setting up commander program');
			program
				.version('1.0.0')
				.option('--config <path>', 'Path to SDK config file')
				.option('--localconfig <path>', 'Path to SDK local config file')
				.addOption(new Option('--sdk [language]', `Generate the SDK for the given swager-codegen language using the default config. Languages: ${sdkLanguageChoices.join(', ')}`).choices(sdkLanguageChoices));
			program.exitOverride();
			program.parse(process.argv);

			const cmdOptions = program.opts();
			log.debug(`Commander program parsed - SDK: ${cmdOptions.sdk}, Config: ${cmdOptions.config}, LocalConfig: ${cmdOptions.localconfig}`);

			if (cmdOptions.sdk) {
				log.debug(`SDK language specified: ${cmdOptions.sdk}`);
				if (cmdOptions.sdk === true) {
					log.error('Invalid SDK language detected - validation failed');
					throw new Error('Invalid SDK language!');
				}

				let configPath = path.resolve(path.join('./resources/sdk', cmdOptions.sdk.toLowerCase()));
				log.debug(`Resolved config path: ${configPath}`);

				let config = cmdOptions.config ? cmdOptions.config : jsonOrYaml(path.join(configPath, 'config'));
				let localconfig = cmdOptions.localconfig ? cmdOptions.localconfig : jsonOrYaml(path.join(configPath, 'localconfig'));
				log.debug(`Config files determined - Config: ${config}, LocalConfig: ${localconfig}`);

				log.info(`Invoking SDK build for language: ${cmdOptions.sdk}`);
				this._config_path = config;
				this._localconfig_path = localconfig;
				return;
			}

			if (cmdOptions.config) {
				log.debug(`Using custom config path - Config: ${cmdOptions.config}, LocalConfig: ${cmdOptions.localconfig}`);
				this._config_path = cmdOptions.config;
				this._localconfig_path = cmdOptions.localconfig;
				return;
			}

			log.info('No valid options provided, showing help');
			program.help();
		} catch (err: unknown) {
			log.error(`Error caught in SdkBuilder initializer: ${err}`);
			if (err instanceof Error) {
				log.error(`Aborting SDK Builder - ${err.name}: ${err.message}`);
				log.error(`Stack trace: ${err.stack}`);
			}
			throw err;
		}
	}

	public async build(): Promise<void> {
		try {
			log.info(`Starting build process - Config: ${this._config_path}, LocalConfig: ${this._localconfig_path}`);
			let b = new Builder();
			log.debug('Builder instance created');

			log.debug('Starting Builder initialization');
			await b.init(this._config_path, this._localconfig_path);
			log.debug('Builder initialization completed successfully');

			log.debug('Starting Full build');
			await b.fullBuild();
			log.debug('Full build completed successfully');

			log.info('SDK Builder script complete');
		} catch (err: unknown) {
			log.error(`Build process exception: ${err}`);
			if (err instanceof Error) {
				log.error(`Aborting SDK Builder - ${err.name}: ${err.message}`);
				log.error(`Stack trace: ${err.stack}`);
			}
			throw err;
		}
	}
}

function jsonOrYaml(filePath: string): string {
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
	return '';
}

log.info('Starting SdkBuilder application');
try {
	let sdkBuilder: SdkBuilder = new SdkBuilder();
	sdkBuilder.initialize();
	log.info('SdkBuilder application initialization completed');

	await sdkBuilder.build();
	log.info('SdkBuilder application building completed');
} catch (err: unknown) {
	log.error('Exiting SDK Builder with exit code 1');
	process.exitCode = 1;
}
