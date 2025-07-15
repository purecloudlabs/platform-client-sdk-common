import fs from 'fs-extra';
import path from 'path';
import dot, { TemplateSettings } from 'dot';
import { ResourceDefinitions, Template } from './resourceDefinitions'
import log from '../../../../modules/log/logger';

type SwaggerMethodDetails = {
  tags?: string[];
  operationId?: string;
  summary?: string;
  description?: string;
  [key: string]: any;
};

export class PostProcess {
	init() {
		try {
			log.debug('PostProcess initialization started');

			dot.templateSettings.strip = false;
			log.debug('Template settings configured');

			const rootPath: string = path.resolve(process.argv[2]);
			const topLevelCommandsPath: string = path.resolve(process.argv[3]);
			const resourceDefinitionsPath: string = path.resolve(process.argv[4]);
			const newSwaggerPath: string = path.resolve(process.argv[5]);
			const operationNameOverridesPath: string = path.resolve(process.argv[6]);
			const docsDir: string = path.resolve(process.argv[7]);
			const apiDataPath: string = path.resolve(process.argv[8]);

			log.debug(`Command line arguments parsed - rootPath: ${rootPath}, topLevelCommandsPath: ${topLevelCommandsPath}, resourceDefinitionsPath: ${resourceDefinitionsPath}`);
			log.info(`rootPath=${rootPath}`);
			log.info(`topLevelCommandsPath=${topLevelCommandsPath}`);

			log.debug('Loading resource definitions and top level commands');
			const resourceDefinitions: ResourceDefinitions = JSON.parse(fs.readFileSync(resourceDefinitionsPath, 'utf8'));
			const topLevelCommands: string[] = JSON.parse(fs.readFileSync(topLevelCommandsPath, 'utf8'));
			log.debug(`Files loaded successfully - resourceDefinitions: ${Object.keys(resourceDefinitions).length}, topLevelCommands: ${topLevelCommands.length}`);

			const rootFileName: string = rootPath.split('/').pop();
			const rootDir: string = rootPath.replace(rootFileName, '');
			log.debug(`Path components extracted - rootFileName: ${rootFileName}, rootDir: ${rootDir}`);

			log.debug('Starting super command file generation');
			generateSuperCommandFiles(rootDir, topLevelCommands, resourceDefinitions, null);
			log.debug('Super command files generated');
			
			log.debug('Starting root file generation');
			generateRootFiles(rootDir, resourceDefinitions);
			log.debug('Root files generated');
			
			log.debug('Starting root processing');
			processRoot(rootDir, rootFileName, resourceDefinitions, topLevelCommands);
			log.debug('Root processing completed');
			
			log.debug('Starting cli doc processing');
			generate_cli_docs_from_swagger(topLevelCommandsPath, newSwaggerPath, 
				operationNameOverridesPath, docsDir, apiDataPath );
			log.debug('CLI doc processing completed');
			
			log.info('PostProcess completed successfully');
		} catch (err) {
			log.error(`PostProcess failed: ${err instanceof Error ? err.message : err}`);
			if (err instanceof Error && err.stack) {
				log.debug(`Stack trace: ${err.stack}`);
			}
			process.exitCode = 1;
		}
	};
}
// Creates command root files if they don't already exist
function generateSuperCommandFiles(rootDir: string, topLevelCommands: string[], resourceDefinitions: ResourceDefinitions, resourcePath: string) {
	log.debug(`Starting super command file generation - rootDir: ${rootDir}, topLevelCommands: ${topLevelCommands.length}, resourcePath: ${resourcePath}`);
	const templateString = `package {{addit.supercommand}}

import (
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/utils"
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/services"

	"github.com/spf13/cobra"
)

var (
	Description = utils.FormatUsageDescription("{{addit.supercommand}}", "SWAGGER_OVERRIDE_{{addit.description}}")
	{{addit.supercommand}}Cmd = &cobra.Command{
		Use:   utils.FormatUsageDescription("{{addit.supercommand}}"),
		Short: Description,
		Long:  Description,
	}
	CommandService services.CommandService
)

func init() {
	CommandService = services.NewCommandService({{addit.supercommand}}Cmd)
}

func Cmd{{addit.supercommand}}() *cobra.Command {
	return {{addit.supercommand}}Cmd
}
`;
	for (const supercommand of topLevelCommands) {
		log.debug(`Processing supercommand: ${supercommand}`);
		const commandPath = path.join(rootDir, supercommand);
		const commandFile = path.join(commandPath, `${supercommand}.go`);
		log.debug(`Checking command file existence: ${commandFile}`);
		if (!fs.existsSync(commandFile)) {
			log.debug('Command file does not exist, creating new file');
			if (!fs.existsSync(commandPath)) fs.mkdirSync(commandPath);

			let description = ""
			if (resourcePath) {
				let resourcePathSplit = resourcePath.split("/")
				if (!supercommand.endsWith(resourcePathSplit.pop())) {
					while (!supercommand.includes(resourcePathSplit[resourcePathSplit.length - 1])) {
						resourcePathSplit.pop()
					}
					description = resourcePathSplit.join("/")
				}
			} else {
				description = `/api/v2/${supercommand}`
					.replace(/\_/g, "/")
					.replace(/[\/]{2,}/g, "/")
					.replace(/\b(\w*documentationfile\w*)\b/g, "documentation")
					.replace(/\b(\w*profile\w*)\b/g, "profiles")
			}
			description = description.replace(/\/$/g, "")

			log.debug(`Creating command file: ${commandFile}, description: ${description}`);
			log.info(`Creating ${commandFile} with description ${description}`);

			writeTemplate(templateString, { supercommand: supercommand, description: description }, commandFile);
			log.debug('Command file created successfully');
		} else {
			log.debug('Command file already exists, skipping creation');
		}
	}
}

// Generates root files to attach subcommands to supercommands
function generateRootFiles(rootDir: string, resourceDefinitions: ResourceDefinitions) {
	let commandMappings = new Map();
	for (const path of Object.keys(resourceDefinitions)) {
		var commandName = resourceDefinitions[path].name;
		if (resourceDefinitions[path].supercommand) {
			const supercommandlist = resourceDefinitions[path].supercommand.split('.');

			let nonRootSuperCommands = new Set<string>();
			nonRootSuperCommands.add(
				processName(`${supercommandlist.join("_")}_${commandName}`)
			);

			do {
				let lowestSupercommand = supercommandlist.pop()
				if (!lowestSupercommand) continue

				if (supercommandlist.length == 0) {
					nonRootSuperCommands.add(
						processName(lowestSupercommand)
					);
				} else {
					nonRootSuperCommands.add(
						processName(`${supercommandlist.join("_")}_${lowestSupercommand}`)
					);
				}
			} while (supercommandlist.length > 1);

			let nonRootSuperCommandsArray: string[] = Array.from(nonRootSuperCommands)
				.reverse()

			for (let i = 0; i < nonRootSuperCommandsArray.length; i++) {
				if (!nonRootSuperCommandsArray[i + 1]) continue

				let entry = commandMappings.get(nonRootSuperCommandsArray[i]) || new Set();
				entry.add(nonRootSuperCommandsArray[i + 1]);
				commandMappings.set(processName(nonRootSuperCommandsArray[i]), entry);

				let split = nonRootSuperCommandsArray[i].split("_")
				if (split.length == 2) {
					entry = commandMappings.get(split[0]) || new Set();
					entry.add(nonRootSuperCommandsArray[i]);
					commandMappings.set(processName(split[0]), entry)
				}
			}

			generateSuperCommandFiles(rootDir, [...nonRootSuperCommands], resourceDefinitions, path);

			supercommandlist.push(commandName);
		}
	}

	const templateString = `package {{addit.supercommand}}

import (
	"github.com/mypurecloud/platform-client-sdk-cli/build/gc/utils"
	{{addit.import}}
)

func init() {
	{{addit.addcommand}}
	{{addit.short}}
	{{addit.long}}
}
`;

	for (const [supercommand, value] of commandMappings) {
		let imports = [];
		let addcommands = [];
		let customDescription = `utils.GenerateCustomDescription(${supercommand}Cmd.Short, `
		for (const subcommand of value) {
			imports.push(`"github.com/mypurecloud/platform-client-sdk-cli/build/gc/cmd/${subcommand}"`);
			addcommands.push(`${supercommand}Cmd.AddCommand(${subcommand}.Cmd${subcommand}())`);
			customDescription += `${subcommand}.Description, `
		}
		const short = `${supercommand}Cmd.Short = ${customDescription})`
		const long = `${supercommand}Cmd.Long = ${supercommand}Cmd.Short`

		const commandPath = path.join(rootDir, supercommand);
		const commandFile = path.join(commandPath, `${supercommand}root.go`);

		if (!fs.existsSync(commandPath)) fs.mkdirSync(commandPath)

		writeTemplate(
			templateString,
			{
				supercommand: supercommand,
				import: imports.join('\n\t'),
				addcommand: addcommands.join('\n\t'),
				short: short,
				long: long
			},
			commandFile
		);
	}
}

function processName(name: string) {
	return name.replace(/_test$/g, "_testfile")
		.replace(/_test\//g, "_testfile/")
		.replace(/[\_]{2,}/g, "_");
}

// Adds imports for every command and attaches them to the root
function processRoot(rootDir: string, rootFileName: string, resourceDefinitions: ResourceDefinitions, topLevelCommands: string[]) {
	let exclusionList = new Set();
	exclusionList.add(rootFileName);
	exclusionList.add("dummy_command.go");
	for (const resourceDefinition of Object.values(resourceDefinitions)) {
		if (resourceDefinition.supercommand !== undefined) {
			const supercommandlist = resourceDefinition.supercommand.split('.');

			if (!topLevelCommands.includes(resourceDefinition.name)) {
				if (resourceDefinition.name !== "profiles")
					exclusionList.add(resourceDefinition.name);
			}
			for (const command of supercommandlist) {
				if (!topLevelCommands.includes(command) && command !== "profiles")
					exclusionList.add(command);
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

function writeTemplate(templateString: string, templateObj: Template, filePath) {
	log.debug(`Writing template to file, ${filePath}, ${templateObj}`);

	const templateSettings: TemplateSettings = {
		evaluate: /\{\{([\s\S]+?)\}\}/g,
		interpolate: /\{\{add([\s\S]+?)\}\}/g,
		encode: /\{\{!([\s\S]+?)\}\}/g,
		use: /\{\{#([\s\S]+?)\}\}/g,
		define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
		conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
		iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
		varname: 'it',
		strip: false,
		append: true,
		selfcontained: false,
		useParams: /(?:)/,       // Set a regular expression that matches nothing
		defineParams: /(?:)/,
	}


	log.debug('Compiling template');
	let template = dot.template(templateString, dot.templateSettings = templateSettings, templateObj);
	//let template = dot.template(templateString, null, templateObj);
	log.debug('Executing template');
	let result = template(templateObj);

	log.debug('Writing template result to file');
	fs.writeFileSync(filePath, result);
	log.debug('Template file written successfully');
	console.log(`Extension templated to ${filePath}`);
}

async function generate_cli_docs_from_swagger(topLevelCommandsPath: string, 
  newSwaggerPath: string, 
  operationNameOverridesPath: string, 
  docsDir: string, 
  apiDataPath: string
): Promise<void> {

  log.debug("Starting CLI doc generation from swagger");
  log.debug(`Top level commands path: ${topLevelCommandsPath}`);
  log.debug(`New Swagger file path: ${newSwaggerPath}`);
  log.debug(`Operation name overrides path: ${operationNameOverridesPath}`);
  log.debug(`Output directory: ${docsDir}`);
  log.debug(`APIData directory: ${apiDataPath}`);
 
  log.debug("Reading swagger data file");
  const swaggerData = JSON.parse(fs.readFileSync(newSwaggerPath, "utf8"));
  log.debug(`Swagger data loaded with ${Object.keys(swaggerData.paths || {}).length} paths`);
  
  log.debug("Reading top level commands file");
  const topLevelCommands: string[] = JSON.parse(fs.readFileSync(topLevelCommandsPath, "utf8"));
  log.debug(`Loaded ${topLevelCommands.length} top level commands: ${topLevelCommands.join(', ')}`);
  
  log.debug("Reading operation overrides file");
  const operationOverrides = JSON.parse(fs.readFileSync(operationNameOverridesPath, "utf8"));
  log.debug(`Loaded operation overrides for ${Object.keys(operationOverrides).length} paths`);

  log.debug("Building override lookup table");
  const overrideLookup: Record<string, string> = {};
  let overrideCount = 0;
  for (const [p, methods] of Object.entries(operationOverrides)) {
    for (const [m, meta] of Object.entries(methods as any)) {
      overrideLookup[`${m.toLowerCase()} ${p.toLowerCase()}`] = (meta as any).name;
      overrideCount++;
    }
  }
  log.debug(`Built override lookup with ${overrideCount} entries`);

  log.debug("Processing swagger paths to build tag groups");
  const tagGroups: Record<string, string[]> = {};
  let pathCount = 0;
  for (const [path, methods] of Object.entries(swaggerData.paths)) {
    for (const [method, details] of Object.entries(methods as any)) {
	  const d = details as SwaggerMethodDetails;
      const tags = d.tags || [];
      if (!tags.length) continue;
      const tag = tags[0].toLowerCase();
      const base = tag.split("_")[0];
      if (!tagGroups[base]) tagGroups[base] = [];
      if (!tagGroups[base].includes(tag)) tagGroups[base].push(tag);
      pathCount++;
    }
  }
  log.debug(`Processed ${pathCount} API paths, created ${Object.keys(tagGroups).length} tag groups`);

  const topTags = new Set(topLevelCommands.map((x) => x.toLowerCase()));
  const unifiedTags = Object.fromEntries(Object.entries(tagGroups).filter(([k]) => topTags.has(k)));
  log.debug(`Filtered to ${Object.keys(unifiedTags).length} unified tag groups matching top level commands`);

  log.debug("Building tag to supercommand mapping");
  const tagToSuper: Record<string, string> = {};
  for (const [supercmd, tags] of Object.entries(unifiedTags)) {
    for (const tag of tags) tagToSuper[tag] = supercmd;
  }
  log.debug(`Created tag mapping for ${Object.keys(tagToSuper).length} tags`);

  log.debug("Processing swagger paths to build CLI docs");
  const cliDocs: Record<string, any> = {};
  const descCandidates: Record<string, [string, string][]> = {};
  let processedOperations = 0;

  for (const [path, methods] of Object.entries(swaggerData.paths)) {
    for (const [method, details] of Object.entries(methods as any)) {
	   const d = details as SwaggerMethodDetails;
      const tags = d.tags || [];
      if (!tags.length) continue;
      const tag = tags[0].toLowerCase();
      const supercmd = tagToSuper[tag];
      if (!supercmd) continue;

      const opId = (d.operationId || "").toLowerCase();
      const summary = d.summary || "";
      const override = overrideLookup[`${method.toLowerCase()} ${path.toLowerCase()}`];
      const name = override || opId;

      if (!cliDocs[supercmd]) {
        cliDocs[supercmd] = { supercommand: supercmd, description: "", resources: [] };
        log.debug(`Created new CLI doc entry for supercommand: ${supercmd}`);
      }
      cliDocs[supercmd].resources.push({ name, path, description: summary });
      processedOperations++;

      if (d.description?.includes("SWAGGER_OVERRIDE_")) {
        if (!descCandidates[supercmd]) descCandidates[supercmd] = [];
        descCandidates[supercmd].push([path, d.description]);
      }
    }
  }
  log.debug(`Processed ${processedOperations} operations into ${Object.keys(cliDocs).length} CLI doc entries`);

  log.debug("Setting strict descriptions for supercommands");
  let descriptionsSet = 0;

  for (const supercmd of Object.keys(cliDocs)) {
   const expectedPath = `/api/v2/${supercmd}`;
   cliDocs[supercmd].description = expectedPath;

   const candidates = descCandidates[supercmd] || [];
   const found = candidates.find(([path]) => path === expectedPath);

   if (found) {
   	log.debug(`Confirmed exact match in Swagger for ${supercmd}: ${expectedPath}`);
   } else {
	log.warn(`No exact path match in Swagger for ${supercmd}, using strict fallback: ${expectedPath}`);
   }

   descriptionsSet++;
  }

  log.debug(`Set strict descriptions for ${descriptionsSet} supercommands`);


  log.debug("Writing CLI doc files");
  fs.ensureDirSync(docsDir);
  let filesWritten = 0;
  for (const [tag, doc] of Object.entries(cliDocs)) {
    const filePath = path.join(docsDir, `${tag}.json`);
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2));
    filesWritten++;
    log.debug(`Written CLI doc file: ${filePath}`);
  }
  
  fs.writeFileSync(apiDataPath, JSON.stringify(Object.values(cliDocs), null, 2));
  log.debug(`Written API data file: ${apiDataPath}`);

  log.info(`CLI docs generation completed. Written ${filesWritten} individual docs and 1 API data file`);
  log.info("CLI docs generated into /docs folder.");
}

// Call the method directly
log.debug('Starting PostProcess script execution');
const postProcess = new PostProcess();
postProcess.init();
log.debug('PostProcess script execution completed');
