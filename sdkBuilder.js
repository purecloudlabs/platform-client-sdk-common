const program = require('commander');
const path = require('path');
const fs = require('fs');

const swaggerDiff = require('./modules/swaggerDiff');
const Builder = require('./modules/builder');
const sdkLanguageRegex = /^(purecloudjava|pureclouddotnet|purecloudruby|purecloudpython)$/i;

try {
	program
		.version('1.0.0')
		.option('--config <path>', 'Path to SDK config file')
		.option('--localconfig <path>', 'Path to SDK local config file')
		.option('--sdk [language]', 'Generate the SDK for the given swager-codegen language using the default config', sdkLanguageRegex)
		.parse(process.argv);

	if (program.sdk) {
		// Value is true when a value was specified but didn't match regex
		if (program.sdk === true)
			throw new Error('Invalid SDK language!');

		var configPath = path.resolve(path.join('./resources/sdk', program.sdk.toLowerCase()));
		var config = program.config ? program.config : jsonOrYaml(path.join(configPath, 'config'));
		var localconfig = program.localconfig ? program.localconfig : jsonOrYaml(path.join(configPath, 'localconfig'));
		console.log(`Invoking SDK build for language: ${program.sdk}`);
		build(config, localconfig);
		return;
	}

	if (program.config) {
		build(program.config, program.localconfig);
		return;
	}

	program.help();
} catch(err) {
	abort(err);
}



function abort(err) {
	console.log(err);
	console.log('Exiting SDK Builder with exit code 1');
	process.exitCode = 1;
}

function build(config, localconfig) {
	var builder = new Builder(config, localconfig);
	builder.fullBuild()
		.then(() => console.log('SDK Builder script complete'))
		.catch((err) => abort(err));
}

function jsonOrYaml(filePath) {
	var jsonConfig = `${filePath}.json`;
	var yamlConfig = `${filePath}.yml`;

	if (fs.existsSync(jsonConfig)) {
		console.log(`Found config file ${jsonConfig}`);
		return jsonConfig;
	}

	if (fs.existsSync(yamlConfig)) {
		console.log(`Found config file ${yamlConfig}`);
		return yamlConfig;
	}

	console.log(`Unable to find config file: ${filePath}`);
	return;
}