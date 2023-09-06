import fs from 'fs-extra';
import path from 'path';

export class PostBuildPostRun {

  public init() {
	try {
		const repoPath = process.argv[2];
		const buildDir = path.join(repoPath, 'build');
	
		console.log('repoPath', repoPath);
		console.log('buildDir', buildDir);
	
		const dir = fs.opendirSync(repoPath);
		let dirent;
		while ((dirent = dir.readSync()) !== null) {
			if (dirent.isDirectory() && dirent.name !== 'build' && !dirent.name.startsWith("."))
				fs.removeSync(path.join(repoPath, dirent.name))
		}
		dir.closeSync();
	
		fs.copySync(buildDir, repoPath);
		fs.removeSync(buildDir);
	} catch (err) {
		process.exitCode = 1;
		console.log(err);
	}
	
  };
}

// Call the method directly
const postBuildPostRun = new PostBuildPostRun();
postBuildPostRun.init();

