const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
	dot.templateSettings.strip = false;

	const rootPath = path.resolve(process.argv[2]);
	const commandServicePath = path.resolve(process.argv[3]);
	const generalPath = path.resolve(process.argv[4]);

	console.log(`rootPath=${rootPath}`);
	console.log(`commandServicePath=${commandServicePath}`);
	console.log(`generalPath=${generalPath}`);

	const definitionsPath = path.join(path.dirname(require.main.filename), "../resources/resourceDefinitions.json")
	const resourceDefinitions = JSON.parse(fs.readFileSync(definitionsPath, 'utf8'))

	const rootFileName = rootPath.split("/").pop()
	const rootDir = rootPath.replace(rootFileName, "")

	generateRootFiles(rootDir, resourceDefinitions)
	processRoot(rootDir, rootFileName, resourceDefinitions)
	processCommandService(commandServicePath, resourceDefinitions)
	processGeneral(generalPath, resourceDefinitions)
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}

function generateRootFiles(rootDir, resourceDefinitions) {
	let commandMappings = new Map()
	for (const path of Object.keys(resourceDefinitions)) {
		const supercommand = resourceDefinitions[path].supercommand
		if (supercommand !== undefined) {
			let entry = commandMappings.get(supercommand) || new Set()
			entry.add(resourceDefinitions[path].tag)
			commandMappings.set(supercommand, entry)
		}
	}

	const templateString = `
package {{=it.supercommand}}

import (
	{{=it.import}}
)

func init() {
	{{=it.addcommand}}
}
`

	for (const [supercommand, value] of commandMappings) {
		let imports = []
		let addcommands = []
		for (const subcommand of value) {
			imports.push(`"github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/${subcommand}"`)
			addcommands.push(`${supercommand}Cmd.AddCommand(${subcommand}.Cmd${subcommand}())`)
		}

		const commandPath = path.join(rootDir, supercommand)
		const commandFile = path.join(commandPath, `${supercommand}root.go`)

		writeTemplate(templateString, { supercommand: supercommand, import: imports.join("\n\t"), addcommand: addcommands.join("\n\t")}, commandFile)
  	}
}

function processRoot(rootDir, rootFileName, resourceDefinitions) {
	let exclusionList = new Set()
	exclusionList = exclusionList.add(rootFileName)
	for (const resourceDefinition of Object.values(resourceDefinitions)) {
		if (resourceDefinition.supercommand !== undefined) {
			exclusionList = exclusionList.add(resourceDefinition.tag)
		}
	}

	let addCommands = []
	let addImports = []

	const dir = fs.opendirSync(rootDir)
	let dirent
	while ((dirent = dir.readSync()) !== null) {
		if (exclusionList.has(dirent.name)) continue
		// imports for packages under cmd
		addImports.push(`"github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/${dirent.name}"`)
		let packageName = `${dirent.name}`;
		// adding each command to the rootCmd
		addCommands.push(`rootCmd.AddCommand(${packageName}.Cmd${packageName}())`)
	}
	dir.closeSync()

	const rootPath = path.join(rootDir, rootFileName)
	let templateString = fs.readFileSync(rootPath, 'utf8');
	writeTemplate(templateString, { addImports: addImports.join("\n\t"), addCommands: addCommands.join("\n\t") }, rootPath)
}

function processCommandService(commandServicePath, resourceDefinitions) {
	let overridePaths = []
	for (const path of Object.keys(resourceDefinitions)) {
		if (resourceDefinitions[path].entityListing == true) {
			overridePaths.push(`listOverrides["${path}"] = 1`)
		}
	}

	const listOverrides = overridePaths.join("\n\t\t")
	let templateString = fs.readFileSync(commandServicePath, 'utf8');
	writeTemplate(templateString, { listOverrides: listOverrides }, commandServicePath)
}

function processGeneral(generalPath, resourceDefinitions) {
	let commands = []
	for (const resourceDefinition of Object.values(resourceDefinitions)) {
		if (resourceDefinition.doNotPluralize == true) {
			commands.push(`notPluralCommands = append(notPluralCommands, "${resourceDefinition.tag}")`)
		}
	}

	const notPluralCommands = commands.join("\n\t\t")
	let templateString = fs.readFileSync(generalPath, 'utf8');
	writeTemplate(templateString, { notPluralCommands: notPluralCommands }, generalPath)
}

function writeTemplate(templateString, templateObj, filePath) {
	let template = dot.template(templateString, null, templateObj);
	let result = template(templateObj);

	fs.writeFileSync(filePath, result);
	console.log(`Extension templated to ${filePath}`);
}
