const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
	dot.templateSettings.strip = false;

	const rootPath = path.resolve(process.argv[2]);
	const duplicateMappingsPath = path.resolve(process.argv[3]);
	const topLevelCommandsPath = path.resolve(process.argv[4]);
	const resourceDefinitionsPath = path.join(path.dirname(require.main.filename), "../resources/resourceDefinitions.json")

	console.log(`rootPath=${rootPath}`);
	console.log(`duplicateMappingsPath=${duplicateMappingsPath}`);
	console.log(`topLevelCommandsPath=${topLevelCommandsPath}`);

	const resourceDefinitions = JSON.parse(fs.readFileSync(resourceDefinitionsPath, 'utf8'))
	const duplicateMappings = JSON.parse(fs.readFileSync(duplicateMappingsPath, 'utf8'))
	const topLevelCommands = JSON.parse(fs.readFileSync(topLevelCommandsPath, 'utf8'))

	const rootFileName = rootPath.split("/").pop()
	const rootDir = rootPath.replace(rootFileName, "")

	generateSuperCommandFiles(rootDir, topLevelCommands)
	generateRootFiles(rootDir, resourceDefinitions, duplicateMappings)
	processRoot(rootDir, rootFileName, resourceDefinitions, duplicateMappings, topLevelCommands)
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}

// Creates command root files if they don't already exist
function generateSuperCommandFiles(rootDir, topLevelCommands) {
	const templateString = `
package {{=it.supercommand}}

import (
	"github.com/spf13/cobra"
)

var {{=it.supercommand}}Cmd = &cobra.Command{
	Use:   "{{=it.supercommand}}",
	Short: "Manages Genesys Cloud {{=it.supercommand}}",
	Long:  \`Manages Genesys Cloud {{=it.supercommand}}\`,
}

func Cmd{{=it.supercommand}}() *cobra.Command {
	return {{=it.supercommand}}Cmd
}
`
	for (const supercommand of topLevelCommands) {
		const commandPath = path.join(rootDir, supercommand)
		const commandFile = path.join(commandPath, `${supercommand}.go`)
		if (!fs.existsSync(commandFile)) {
			fs.mkdirSync(commandPath)
			writeTemplate(templateString, { supercommand: supercommand }, commandFile)
		}
	}
}

// Generates root files to attach subcommands to supercommands
function generateRootFiles(rootDir, resourceDefinitions, duplicateMappings) {
	let commandMappings = new Map()
	for (const path of Object.keys(resourceDefinitions)) {
		const supercommand = resourceDefinitions[path].supercommand
		if (supercommand !== undefined) {
			let entry = commandMappings.get(supercommand) || new Set()
			const key = `${resourceDefinitions[path].name}_${supercommand}`
			const value = duplicateMappings[key]
			entry.add(value ? key : resourceDefinitions[path].name)
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

// Adds imports for every command and attaches them to the root
function processRoot(rootDir, rootFileName, resourceDefinitions, duplicateMappings, topLevelCommands) {
	let exclusionList = new Set()
	exclusionList.add(rootFileName)
	for (const resourceDefinition of Object.values(resourceDefinitions)) {
		if (resourceDefinition.supercommand !== undefined && !topLevelCommands.includes(resourceDefinition.name)) {
			exclusionList.add(resourceDefinition.name)
		}
	}
	for (const duplicateCommand of Object.keys(duplicateMappings)) {
		exclusionList.add(duplicateCommand)
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

function writeTemplate(templateString, templateObj, filePath) {
	let template = dot.template(templateString, null, templateObj);
	let result = template(templateObj);

	fs.writeFileSync(filePath, result);
	console.log(`Extension templated to ${filePath}`);
}
