import fs from 'fs-extra';
import path from 'path';
import log from '../../../../modules/log/logger';

export class PostBuildPostRun {
	init() {
		try {
			log.debug('PostBuildPostRun initialization started');
			const repoPath = process.argv[2];
			const buildDir = path.join(repoPath, 'build');

			log.debug(`Script arguments parsed', ${repoPath}, ${buildDir}`);
			log.debug(`repoPath', ${repoPath}`);
			log.debug(`buildDir', ${buildDir}`);
			
			// Validate paths
			if (!repoPath) {
				log.debug('Missing repository path argument');
				throw new Error('Repository path is required as first argument');
			}
			if (!fs.existsSync(repoPath)) {
				log.debug(`Repository path does not exist, ${repoPath}`);
				throw new Error(`Repository path does not exist: ${repoPath}`);
			}
			if (!fs.existsSync(buildDir)) {
				log.debug(`Build directory does not exist, ${buildDir}`);
				throw new Error(`Build directory does not exist: ${buildDir}`);
			}
			log.debug('Path validation completed successfully');

			log.debug(`Starting build directory copy operation, source: ${buildDir}, destination: ${repoPath}`);
			fs.copySync(buildDir, repoPath);
			log.debug('Build directory copied successfully');
			
			log.debug(`Removing build directory, ${buildDir}`);
			fs.removeSync(buildDir);
			log.debug('Build directory removed successfully');
			
			log.debug('PostBuildPostRun completed successfully');
		} catch (err) {
			log.error(`PostBuildPostRun failed: ${err instanceof Error ? err.message : err}`);
			process.exitCode = 1;
			console.log(err);
		}
	}
	;
}
// Call the method directly
log.debug('Starting PostBuildPostRun script execution');
const postBuildPostRun = new PostBuildPostRun();
postBuildPostRun.init();
log.debug('PostBuildPostRun script execution completed');