const fs = require('fs-extra');
const path = require('path');

try {
	const repoPath = process.argv[2];
	const buildDir = path.join(repoPath, 'build');

	console.log('repoPath', repoPath);
	console.log('buildDir', buildDir);

	fs.copySync(buildDir, repoPath);
	fs.removeSync(buildDir);
} catch (err) {
	process.exitCode = 1;
	console.log(err);
}
