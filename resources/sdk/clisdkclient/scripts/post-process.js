const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
	dot.templateSettings.strip = false;

	const rootPath = path.resolve(process.argv[2]);
	const topLevelCommandsPath = path.resolve(process.argv[3]);
	const resourceDefinitionsPath = path.resolve(process.argv[4]);

	console.log(`rootPath=${rootPath}`);
	console.log(`topLevelCommandsPath=${topLevelCommandsPath}`);

	const resourceDefinitions = JSON.parse(fs.readFileSync(resourceDefinitionsPath, 'utf8'));
	const topLevelCommands = JSON.parse(fs.readFileSync(topLevelCommandsPath, 'utf8'));

	const rootFileName = rootPath.split('/').pop();
	const rootDir = rootPath.replace(rootFileName, '');

	generateSuperCommandFiles(rootDir, topLevelCommands, null);
	generateRootFiles(rootDir, resourceDefinitions);
	processRoot(rootDir, rootFileName, resourceDefinitions, topLevelCommands);
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}

// Creates command root files if they don't already exist
function generateSuperCommandFiles(rootDir, topLevelCommands, resourcePath) {
	const templateString = `package {{=it.supercommand}}

import (
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/utils"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/services"

	"github.com/spf13/cobra"
)

var (
	{{=it.supercommand}}Cmd = &cobra.Command{
		Use:   utils.FormatUsageDescription("{{=it.supercommand}}"),
		Short: "{{=it.description}}",
		Long:  \`{{=it.description}}\`,
	}
	CommandService services.CommandService
)

func init() {
	CommandService = services.NewCommandService({{=it.supercommand}}Cmd)
}

func Cmd{{=it.supercommand}}() *cobra.Command {
	return {{=it.supercommand}}Cmd
}
`;
	console.log("topLevelCommands", topLevelCommands)
	for (const supercommand of topLevelCommands) {
		const commandPath = path.join(rootDir, supercommand);
		const commandFile = path.join(commandPath, `${supercommand}.go`);
		if (!fs.existsSync(commandFile)) {
			if (!fs.existsSync(commandPath)) fs.mkdirSync(commandPath);

			let description = ""
			if (resourcePath) {
				let split = resourcePath.split("/")
				let tmp = split.pop()
				if (!supercommand.endsWith(tmp)) {
					console.log("hey", supercommand)
					while (!supercommand.includes(split[split.length-1])) {
						split.pop()
					}
					description = split.join("/")
				}
			} else {
				description = `/api/v2/${supercommand}`
					.replace(/\_/g, "/")
					.replace(/[\/]{2,}/g, "/")
					.replace(/\b(\w*documentationfile\w*)\b/g, "documentation")
					.replace(/\b(\w*profile\w*)\b/g, "profiles")
			}
			description = description.replace(/\/$/g, "")

			// console.log(description, supercommand, resourcePath)
			console.log(`Creating ${commandFile} with description ${description}`)
			writeTemplate(templateString, { supercommand: supercommand, description: description }, commandFile);
		}
	}
}

function processName(name) {
	return name.replace(/_test$/g, "_testfile")
	           .replace(/_test\//g, "_testfile/")
			   .replace(/[\_]{2,}/g, "_");
}

// Generates root files to attach subcommands to supercommands
function generateRootFiles(rootDir, resourceDefinitions) {
	let commandMappings = new Map();
	for (const path of Object.keys(resourceDefinitions)) {
		var commandName = resourceDefinitions[path].name;
		if (resourceDefinitions[path].supercommand) {
			const supercommandlist = resourceDefinitions[path].supercommand.split('.');

			let nonRootSuperCommands = new Set();
			let name = processName(`${supercommandlist.join("_")}_${commandName}`)
			nonRootSuperCommands.add(name);

			do {
				let temp = supercommandlist.pop()
				if (!temp) continue

				if (supercommandlist.length == 0) {
					nonRootSuperCommands.add(processName(temp));
				} else {
					name = processName(`${supercommandlist.join("_")}_${temp}`)
					nonRootSuperCommands.add(name);
				}
			} while(supercommandlist.length > 1);

			let arr = Array.from(nonRootSuperCommands)
				.reverse()

			for (i = 0; i < arr.length; i++) {
				if (!arr[i + 1]) continue
				let entry = commandMappings.get(arr[i]) || new Set();
				entry.add(arr[i + 1]);
				commandMappings.set(processName(arr[i]), entry);

				let split = arr[i].split("_")
				if (split.length == 2) {
					entry = commandMappings.get(split[0]) || new Set();
					entry.add(arr[i]);
					commandMappings.set(processName(split[0]), entry)
				}
			}

			generateSuperCommandFiles(rootDir, nonRootSuperCommands, path);

			supercommandlist.push(commandName);
		}
	}

	console.log("commandMappings", commandMappings)

	const templateString = `package {{=it.supercommand}}

import (
	{{=it.import}}
)

func init() {
	{{=it.addcommand}}
}
`;

	for (const [supercommand, value] of commandMappings) {
		let imports = [];
		let addcommands = [];
		for (const subcommand of value) {
			imports.push(`"github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/${subcommand}"`);
			addcommands.push(`${supercommand}Cmd.AddCommand(${subcommand}.Cmd${subcommand}())`);
		}

		const commandPath = path.join(rootDir, supercommand);
		const commandFile = path.join(commandPath, `${supercommand}root.go`);

		if (!fs.existsSync(commandPath)) fs.mkdirSync(commandPath)

		writeTemplate(
			templateString,
			{ supercommand: supercommand, import: imports.join('\n\t'), addcommand: addcommands.join('\n\t') },
			commandFile
		);
	}
}

// Adds imports for every command and attaches them to the root
function processRoot(rootDir, rootFileName, resourceDefinitions, topLevelCommands) {
	let exclusionList = new Set();
	exclusionList.add(rootFileName);
	for (const resourceDefinition of Object.values(resourceDefinitions)) {
		if (resourceDefinition.supercommand !== undefined) {
			const supercommandlist = resourceDefinition.supercommand.split('.');

			if (!topLevelCommands.includes(resourceDefinition.name)) {
				if (resourceDefinition.name !== "profiles")
					exclusionList.add(resourceDefinition.name);
			}
			for (const command of supercommandlist) {
				if (!topLevelCommands.includes(command)) {
					exclusionList.add(command);
				}
			}
		}
	}

	let addCommands = [];
	let addImports = [];

	const dir = fs.opendirSync(rootDir);
	let dirent;
	while ((dirent = dir.readSync()) !== null) {
		if (exclusionList.has(dirent.name) || dirent.name.includes("_")) continue;
		// imports for packages under cmd
		addImports.push(`"github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/${dirent.name}"`);
		let packageName = `${dirent.name}`;
		// adding each command to the rootCmd
		addCommands.push(`rootCmd.AddCommand(${packageName}.Cmd${packageName}())`);
	}
	dir.closeSync();

	const rootPath = path.join(rootDir, rootFileName);
	let templateString = fs.readFileSync(rootPath, 'utf8');
	writeTemplate(templateString, { addImports: addImports.join('\n\t'), addCommands: addCommands.join('\n\t') }, rootPath);
}

function writeTemplate(templateString, templateObj, filePath) {
	let template = dot.template(templateString, null, templateObj);
	let result = template(templateObj);

	fs.writeFileSync(filePath, result);
	// //console.log(`Extension templated to ${filePath}`);
}
