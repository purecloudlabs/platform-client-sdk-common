import fs from 'fs-extra';
import path from 'path';
import { log } from '../../../../modules/log/logger';

export class PostBuildPostRun {
	public init(): void {
		try {
			log.debug('PostBuildPostRun initialization started');

			const repoPath = process.argv[2];
			const buildDir = path.join(repoPath, 'build');

			log.debug(`repoPath: ${repoPath}`);
			log.debug(`buildDir: ${buildDir}`);

			const dir = fs.opendirSync(repoPath);
			let dirent: fs.Dirent | null;
			while ((dirent = dir.readSync()) !== null) {
				if (dirent.isDirectory() && dirent.name !== 'build' && !dirent.name.startsWith("."))
					fs.removeSync(path.join(repoPath, dirent.name))
			}
			dir.closeSync();

			fs.copySync(buildDir, repoPath);
			fs.removeSync(buildDir);
			log.debug('PostBuildPostRun completed');
		} catch (err: unknown) {
			process.exitCode = 1;
			log.error(`PostBuildPostRun exception: ${err}`);
		}
	}
}

// Call the method directly
log.debug('Starting PostBuildPostRun script execution');
const postBuildPostRun = new PostBuildPostRun();
postBuildPostRun.init();
log.debug('PostBuildPostRun script execution completed');
