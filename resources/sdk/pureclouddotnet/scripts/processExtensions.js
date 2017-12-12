const dot = require('dot');
const fs = require('fs-extra');
const klawSync = require('klaw-sync');
const path = require('path');

try {
	dot.templateSettings.strip = false;

	const extensionsSource = path.resolve(process.argv[2]);
	const extensionsDest = path.resolve(process.argv[3]);
	const packageName = process.argv[4];

	console.log(`extensionsSource=${extensionsSource}`);
	console.log(`extensionsDest=${extensionsDest}`);
	console.log(`packageName=${packageName}`);

	let paths = klawSync(extensionsSource, { 
		nodir: true, 
		filter: (data) => data.path.toLowerCase().endsWith('.cs') 
	});

	paths.forEach((filePath) => {
		// Determine output location
		let fileDest = filePath.path.replace(extensionsSource, extensionsDest);
		fs.ensureDirSync(path.dirname(fileDest));

		let templateString = fs.readFileSync(filePath.path, 'utf8');
		let template = dot.template(templateString, null, { packageName: packageName });
		let result = template({ packageName: packageName });
		fs.writeFileSync(filePath.path.replace(extensionsSource, extensionsDest), result);
		console.log(`Extension templated to ${fileDest}`);
	});
} catch(err) {
	process.exitCode = 1;
	console.log(err);
}