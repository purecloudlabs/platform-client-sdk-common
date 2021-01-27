const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
	dot.templateSettings.strip = false;

	const rootSource = path.resolve(process.argv[2]);
	const rootDest = rootSource;

	console.log(`rootSource=${rootSource}`);
	console.log(`rootDest=${rootDest}`);

	const exclusionList = [
		"channels",
		"subscriptions",
		"topics",
		"user",
		"queue",
		"skill",
		"members",
		"root.go"
	]
	let addCommands = ""
	let addImports = ""
	const dir = fs.opendirSync(rootDest)
	let dirent
	while ((dirent = dir.readSync()) !== null) {
		if (exclusionList.includes(dirent.name)) continue
		// imports for packages under cmd
		addImports += `"gc/cmd/${dirent.name}"\n\t`
		let packageName = `${dirent.name}`;
		// adding each command to the rootCmd
		addCommands += `rootCmd.AddCommand(${packageName}.Cmd${packageName}())\n\t`
	}
	dir.closeSync()

	let templateString = fs.readFileSync(path.join(rootSource, "root.go"), 'utf8');
	let template = dot.template(templateString, null, { addImports: addImports, addCommands: addCommands });
	let result = template({ addImports: addImports, addCommands: addCommands });

	const fileDest = path.join(rootDest, "root.go");
	fs.writeFileSync(fileDest, result);
	console.log(`Extension templated to ${fileDest}`);
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}
